import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import {
  DeterministicSmsProvider,
  EbulkSmsProvider,
  SandboxSmsProvider,
} from './sms.provider';
import { createSmsProvider } from './sms.provider.factory';
import {
  buildBalanceAdjustedSmsPayload,
  buildEarnConfirmedSmsPayload,
  buildRedemptionConfirmedSmsPayload,
  buildTransactionReversedSmsPayload,
} from './sms.templates';

describe('sms provider selection', () => {
  it('maps deterministic mode to a fake delivery id for tests', async () => {
    const provider = new DeterministicSmsProvider();

    await expect(provider.send(smsInput())).resolves.toEqual({
      status: 'DELIVERED',
      providerMessageId: 'sms-outbox-1',
    });
  });

  it('keeps sandbox delivery truthful', async () => {
    const provider = new SandboxSmsProvider();

    await expect(provider.send(smsInput())).resolves.toEqual({
      status: 'SENT',
      providerMessageId: 'sandbox-outbox-1',
    });
  });

  it('sends the eBulkSMS JSON contract to the real provider', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: {
          response: {
            status: 'SUCCESS',
            batch_id: 'sms-1',
          },
        },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'sms-1',
      });

      expect(requests).toEqual([
        {
          method: 'POST',
          url: '/',
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'idempotency-key': 'outbox-1',
          }) as Record<string, string>,
          body: {
            SMS: {
              auth: {
                username: 'shopcity-user',
                apikey: 'api-key',
              },
              message: {
                sender: 'ShopCity',
                messagetext:
                  'ShopCity: Your receipt receipt-1 earned NGN 1250.50.',
              },
              recipients: {
                gsm: [
                  {
                    msidn: '+2348000000000',
                    msgid: 'outbox-1',
                  },
                ],
              },
            },
          },
        },
      ]);
    } finally {
      await server.close();
    }
  });

  it('renders redemption-confirmed SMS messages', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: { response: { status: 'SUCCESS', batch_id: 'sms-2' } },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await expect(
        provider.send({
          ...smsInput(),
          template: 'redemption-confirmed',
          payload: buildRedemptionConfirmedSmsPayload({
            receiptId: 'receipt-1',
            transactionId: 'ledger-1',
            redemptionId: 'redemption-1',
            customerId: 'customer-1',
            phoneE164: '+2348000000000',
            redeemedKobo: 5000n,
            remainingBalanceKobo: 125050n,
          }),
        }),
      ).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'sms-2',
      });

      expect(requests[0]?.body).toMatchObject({
        SMS: {
          message: {
            messagetext:
              'ShopCity: Redeemed NGN 50.00 from receipt receipt-1. Remaining balance NGN 1250.50.',
          },
        },
      });
    } finally {
      await server.close();
    }
  });

  it('renders transaction-reversed SMS messages without a receipt id', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: { response: { status: 'SUCCESS', batch_id: 'sms-3' } },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await expect(
        provider.send({
          ...smsInput(),
          receiptId: null,
          template: 'transaction-reversed',
          payload: buildTransactionReversedSmsPayload({
            transactionId: 'ledger-9',
            phoneE164: '+2348000000000',
          }),
        }),
      ).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'sms-3',
      });

      expect(requests[0]?.body).toMatchObject({
        SMS: {
          message: {
            messagetext: 'ShopCity: Your transaction ledger-9 was reversed.',
          },
        },
      });
    } finally {
      await server.close();
    }
  });

  it('renders balance-adjusted SMS messages', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: { response: { status: 'SUCCESS', batch_id: 'sms-4' } },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await expect(
        provider.send({
          ...smsInput(),
          receiptId: null,
          template: 'balance-adjusted',
          payload: buildBalanceAdjustedSmsPayload({
            transactionId: 'ledger-10',
            adjustmentId: 'adjustment-10',
            phoneE164: '+2348000000000',
            amountKobo: 1200n,
            remainingBalanceKobo: 124000n,
          }),
        }),
      ).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'sms-4',
      });

      expect(requests[0]?.body).toMatchObject({
        SMS: {
          message: {
            messagetext:
              'ShopCity: Your balance was adjusted by NGN 12.00 for transaction ledger-10. Remaining balance NGN 1240.00.',
          },
        },
      });
    } finally {
      await server.close();
    }
  });

  it('rejects incomplete redemption-confirmed payloads', async () => {
    await expect(
      newEbulkSmsProvider().send({
        ...smsInput(),
        template: 'redemption-confirmed',
        payload: { redeemedKobo: '5000' },
      }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
    });
  });

  it('rejects incomplete earn-confirmed payloads', async () => {
    await expect(
      newEbulkSmsProvider().send({
        ...smsInput(),
        template: 'earn-confirmed',
        payload: {},
      }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
    });
  });

  it('rejects invalid numeric earn-confirmed payloads', async () => {
    await expect(
      newEbulkSmsProvider().send({
        ...smsInput(),
        payload: {
          version: 1,
          receiptId: 'receipt-1',
          transactionId: 'ledger-1',
          customerId: 'customer-1',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          creditKobo: '12.5',
        },
      }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
    });
  });

  it('rejects incomplete transaction-reversed payloads', async () => {
    await expect(
      newEbulkSmsProvider().send({
        ...smsInput(),
        receiptId: null,
        template: 'transaction-reversed',
        payload: {
          version: 1,
          phoneE164: '+2348000000000',
          template: 'transaction-reversed',
        },
      }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
    });
  });

  it('maps terminal eBulkSMS failures', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        response: {
          status: 'AUTH_FAILURE',
          message: 'bad credentials',
        },
      }),
    } as unknown as Response);

    await expect(newEbulkSmsProvider().send(smsInput())).resolves.toMatchObject(
      {
        status: 'FAILED',
        failureCategory: 'terminal',
        errorMessage: 'bad credentials',
      },
    );

    fetchSpy.mockRestore();
  });

  it('maps retryable eBulkSMS failures', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        response: {
          status: 'RATE_LIMITED',
          message: 'try later',
        },
      }),
    } as unknown as Response);

    await expect(newEbulkSmsProvider().send(smsInput())).resolves.toMatchObject(
      {
        status: 'FAILED',
        failureCategory: 'retryable',
        errorMessage: 'try later',
      },
    );

    fetchSpy.mockRestore();
  });

  it('allows sandbox mode through the factory', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'sandbox',
    });

    expect(provider).toBeInstanceOf(SandboxSmsProvider);
  });

  it('allows deterministic mode through the factory outside production', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'deterministic',
    });

    expect(provider).toBeInstanceOf(DeterministicSmsProvider);
  });

  it('rejects fake providers in production', () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'deterministic',
      }),
    ).toThrow('Fake SMS providers are not allowed in production');

    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'sandbox',
      }),
    ).toThrow('Fake SMS providers are not allowed in production');
  });

  it('allows fake providers in production only with the explicit override', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      NODE_ENV: 'production',
      SMS_PROVIDER_MODE: 'sandbox',
      ALLOW_FAKE_SMS_IN_PRODUCTION: 'true',
    });

    expect(provider).toBeInstanceOf(SandboxSmsProvider);
  });

  it('allows real mode in production when provider secrets are present', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      NODE_ENV: 'production',
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_URL: 'https://sms.example.test',
      SMS_PROVIDER_USERNAME: 'shopcity-user',
      SMS_PROVIDER_API_KEY: 'api-key',
      SMS_PROVIDER_SENDER_ID: 'ShopCity',
    });

    expect(provider).toBeInstanceOf(EbulkSmsProvider);
  });

  it('requires a provider URL for real mode', () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_USERNAME: 'shopcity-user',
        SMS_PROVIDER_API_KEY: 'api-key',
        SMS_PROVIDER_SENDER_ID: 'ShopCity',
      }),
    ).toThrow(
      'Invalid SMS provider environment: "SMS_PROVIDER_URL" is required',
    );
  });

  it('requires eBulkSMS credentials for real mode', () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_URL: 'https://sms.example.test',
      }),
    ).toThrow(
      'Invalid SMS provider environment: "SMS_PROVIDER_USERNAME" is required',
    );
  });

  it('marks slow provider calls as retryable failures', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const sendPromise = newEbulkSmsProvider().send(smsInput());

    await jest.advanceTimersByTimeAsync(1_001);

    await expect(sendPromise).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'retryable',
    });

    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  it('marks stalled provider response bodies as retryable failures', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn(
        () => new Promise<never>(() => undefined),
      ) as unknown as () => Promise<unknown>,
    } as unknown as Response);

    const sendPromise = newEbulkSmsProvider().send(smsInput());

    await jest.advanceTimersByTimeAsync(1_001);

    await expect(sendPromise).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'retryable',
    });

    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  it('rejects invalid eBulkSMS response bodies as terminal failures', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        response: {
          status: 'BOGUS',
          batch_id: 'sms-1',
        },
      }),
    } as unknown as Response);

    await expect(newEbulkSmsProvider().send(smsInput())).resolves.toMatchObject(
      {
        status: 'FAILED',
        failureCategory: 'terminal',
      },
    );

    fetchSpy.mockRestore();
  });

  it('keeps duplicate outbox sends idempotent at the provider boundary', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: { response: { status: 'SUCCESS', batch_id: 'sms-4' } },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await provider.send(smsInput());
      await provider.send(smsInput());

      expect(requests).toHaveLength(2);
      expect(requests[0]?.headers['idempotency-key']).toBe('outbox-1');
      expect(requests[1]?.headers['idempotency-key']).toBe('outbox-1');
      expect(requests[0]?.body).toEqual(requests[1]?.body);
    } finally {
      await server.close();
    }
  });
});

function smsInput() {
  return {
    tenantId: 'tenant-1',
    receiptId: 'receipt-1',
    outboxEventId: 'outbox-1',
    phoneE164: '+2348000000000',
    template: 'earn-confirmed' as const,
    payload: buildEarnConfirmedSmsPayload({
      receiptId: 'receipt-1',
      transactionId: 'ledger-1',
      customerId: 'customer-1',
      phoneE164: '+2348000000000',
      creditKobo: 125050n,
    }),
  };
}

function newEbulkSmsProvider(url = 'https://sms.example.test') {
  return new EbulkSmsProvider({
    url,
    username: 'shopcity-user',
    apiKey: 'api-key',
    senderId: 'ShopCity',
    timeoutMs: 1000,
  });
}

function baseEnv() {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://example',
    REDIS_URL: 'redis://localhost:6379',
    SESSION_SECRET: 'secret',
    CSRF_SECRET: 'secret',
    DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-0000-0000-000000000001',
    DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-0000-0000-000000000002',
    CORS_ORIGIN_ALLOWLIST: 'http://localhost:3000',
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  };
}

type CapturedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: Record<string, string>;
  body: unknown;
};

type SmsServer = {
  url: string;
  close: () => Promise<void>;
};

async function startSmsServer(
  handler: (request: CapturedRequest) => {
    statusCode: number;
    body?: unknown;
  },
): Promise<SmsServer> {
  const server = createServer((request, response) => {
    void handleServerRequest(request, response, handler);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start SMS test server');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server),
  };
}

async function handleServerRequest(
  request: IncomingMessage,
  response: ServerResponse,
  handler: (request: CapturedRequest) => {
    statusCode: number;
    body?: unknown;
  },
): Promise<void> {
  const capturedRequest = await captureRequest(request);
  const result = handler(capturedRequest);

  response.statusCode = result.statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(result.body ?? {}));
}

async function captureRequest(
  request: IncomingMessage,
): Promise<CapturedRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const requestChunk = chunk as Buffer | string;
    chunks.push(
      Buffer.isBuffer(requestChunk) ? requestChunk : Buffer.from(requestChunk),
    );
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  return {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : (value ?? ''),
      ]),
    ),
    body: rawBody ? (JSON.parse(rawBody) as unknown) : undefined,
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
