import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import {
  AfricaTalkingSmsProvider,
  ArkeselSmsProvider,
  DeterministicSmsProvider,
  EbulkSmsProvider,
  SandboxSmsProvider,
  TwilioSmsProvider,
} from './sms.provider';
import { createSmsProvider } from './sms.provider.factory';
import {
  buildBalanceAdjustedSmsPayload,
  buildCreditExpiryReminderSmsPayload,
  buildEarnConfirmedSmsPayload,
  buildRedemptionConfirmedSmsPayload,
  buildTransactionReversedSmsPayload,
  renderSmsMessage,
} from './sms.templates';

const testTwilioAccountSid = `AC${'a'.repeat(32)}`;
const testTwilioApiKey = `SK${'b'.repeat(32)}`;

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

  it('sends the Arkesel V2 sandbox JSON contract and captures the recipient ID', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);
      return {
        statusCode: 200,
        body: {
          status: 'success',
          data: [{ recipient: '2348000000000', id: 'arkesel-message-1' }],
        },
      };
    });
    const provider = new ArkeselSmsProvider({
      baseUrl: `${server.url}/api/v2`,
      apiKey: 'arkesel-key',
      senderId: 'ShopCity',
      timeoutMs: 1000,
      sandbox: true,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'arkesel-message-1',
      });
      expect(requests).toEqual([
        {
          method: 'POST',
          url: '/api/v2/sms/send',
          headers: expect.objectContaining({
            'api-key': 'arkesel-key',
            'idempotency-key': 'outbox-1',
          }) as Record<string, string>,
          body: {
            sender: 'ShopCity',
            recipients: [['2348000000000']],
            message: 'ShopCity: Your receipt receipt-1 earned NGN 1250.50.',
            use_case: 'transactional',
            sandbox: true,
          },
        },
      ]);
    } finally {
      await server.close();
    }
  });

  it("sends Africa's Talking plain SMS form contract and retains the matching ID", async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          SMSMessageData: {
            Recipients: [
              {
                statusCode: 101,
                number: '+2348000000000',
                status: 'Success',
                messageId: 'at-message-1',
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const provider = new AfricaTalkingSmsProvider({
      endpoint: 'https://api.example.test/version1/messaging',
      username: 'shopcity',
      apiKey: 'at-test-key',
      senderId: 'ShopCity',
      timeoutMs: 1000,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'at-message-1',
      });

      const [url, init] = fetchSpy.mock.calls[0] ?? [];
      expect(url).toBe('https://api.example.test/version1/messaging');
      expect(init).toMatchObject({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          apiKey: 'at-test-key',
        },
      });
      expect(init?.body).toBe(
        new URLSearchParams({
          username: 'shopcity',
          to: '+2348000000000',
          message: 'ShopCity: Your receipt receipt-1 earned NGN 1250.50.',
          from: 'ShopCity',
        }).toString(),
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it.each([100, 101, 102])(
    "keeps Africa's Talking accepted status %s as SENT",
    async (statusCode) => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            SMSMessageData: {
              Recipients: [
                {
                  statusCode,
                  number: '2348000000000',
                  messageId: 'at-message-accepted',
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );
      const provider = new AfricaTalkingSmsProvider({
        endpoint: 'https://api.example.test/version1/messaging',
        username: 'shopcity',
        apiKey: 'at-test-key',
        timeoutMs: 1000,
      });

      try {
        await expect(provider.send(smsInput())).resolves.toEqual({
          status: 'SENT',
          providerMessageId: 'at-message-accepted',
        });
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it("keeps an Africa's Talking accepted send as SENT when no message ID is returned", async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          SMSMessageData: {
            Recipients: [{ statusCode: 101, number: '+2348000000000' }],
          },
        }),
        { status: 200 },
      ),
    );
    const provider = new AfricaTalkingSmsProvider({
      endpoint: 'https://api.example.test/version1/messaging',
      username: 'shopcity',
      apiKey: 'at-test-key',
      timeoutMs: 1000,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'SENT',
      });
      expect(Reflect.get(provider, 'getDeliveryReport')).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it.each([
    [402, 'terminal'],
    [407, 'terminal'],
    [409, 'terminal'],
    [500, 'terminal'],
  ] as const)(
    "classifies Africa's Talking recipient status %s as %s",
    async (statusCode, failureCategory) => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            SMSMessageData: {
              Recipients: [
                {
                  statusCode,
                  number: '+2348000000000',
                  status: 'Failure',
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );
      const provider = new AfricaTalkingSmsProvider({
        endpoint: 'https://api.example.test/version1/messaging',
        username: 'shopcity',
        apiKey: 'at-test-key',
        timeoutMs: 1000,
      });

      try {
        await expect(provider.send(smsInput())).resolves.toMatchObject({
          status: 'FAILED',
          failureCategory,
          errorMessage: `Africa's Talking rejected SMS with status ${statusCode}`,
        });
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it("does not retry an ambiguous Africa's Talking transport failure", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('connection reset'));
    const provider = new AfricaTalkingSmsProvider({
      endpoint: 'https://api.example.test/version1/messaging',
      username: 'shopcity',
      apiKey: 'at-test-key',
      timeoutMs: 1000,
    });

    try {
      const result = await provider.send(smsInput());
      expect(result).toMatchObject({
        status: 'FAILED',
        failureCategory: 'terminal',
      });
      expect(result.errorMessage).toContain(
        'verify provider history before retry',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps an explicit Africa's Talking HTTP 429 retryable", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 429 }));
    const provider = new AfricaTalkingSmsProvider({
      endpoint: 'https://api.example.test/version1/messaging',
      username: 'shopcity',
      apiKey: 'at-test-key',
      timeoutMs: 1000,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toMatchObject({
        status: 'FAILED',
        failureCategory: 'retryable',
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("does not accept a successful status for an unrelated Africa's Talking recipient", async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          SMSMessageData: {
            Recipients: [
              {
                statusCode: 101,
                number: '+2348000000001',
                messageId: 'unrelated-message',
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const provider = new AfricaTalkingSmsProvider({
      endpoint: 'https://api.example.test/version1/messaging',
      username: 'shopcity',
      apiKey: 'at-test-key',
      timeoutMs: 1000,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toMatchObject({
        status: 'FAILED',
        failureCategory: 'terminal',
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('submits Twilio SMS through the configured sender and retains its SID', async () => {
    const create = jest.fn().mockResolvedValue({
      sid: 'SM1234567890abcdef1234567890abcdef',
      status: 'queued',
    });
    const provider = new TwilioSmsProvider(
      {
        accountSid: testTwilioAccountSid,
        apiKey: testTwilioApiKey,
        apiSecret: 'twilio-api-secret',
        fromNumber: '+15017122661',
        timeoutMs: 1000,
      },
      { messages: { create } },
    );

    await expect(provider.send(smsInput())).resolves.toEqual({
      status: 'SENT',
      providerMessageId: 'SM1234567890abcdef1234567890abcdef',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      to: '+2348000000000',
      body: 'ShopCity: Your receipt receipt-1 earned NGN 1250.50.',
      from: '+15017122661',
    });
    expect(provider.requiresLocalSubmissionReservation).toBe(true);
    expect(provider.submissionReservationWindowMs).toBe(6000);
  });

  it('submits Twilio SMS through a Messaging Service without a From number', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ sid: 'SM1234567890abcdef1234567890abcdef' });
    const provider = new TwilioSmsProvider(
      {
        accountSid: testTwilioAccountSid,
        apiKey: testTwilioApiKey,
        apiSecret: 'twilio-api-secret',
        messagingServiceSid: 'MG1234567890abcdef1234567890abcdef',
        timeoutMs: 1000,
      },
      { messages: { create } },
    );

    await expect(provider.send(smsInput())).resolves.toMatchObject({
      status: 'SENT',
      providerMessageId: 'SM1234567890abcdef1234567890abcdef',
    });
    expect(create).toHaveBeenCalledWith({
      to: '+2348000000000',
      body: 'ShopCity: Your receipt receipt-1 earned NGN 1250.50.',
      messagingServiceSid: 'MG1234567890abcdef1234567890abcdef',
    });
  });

  it.each([
    [{ status: 429, code: 20429 }, 'retryable', 'rate limited'],
    [{ status: 400, code: 21614 }, 'terminal', 'rejected'],
    [{ status: 500, code: 20500 }, 'terminal', 'outcome is unknown'],
    [new Error('sensitive response details'), 'terminal', 'outcome is unknown'],
  ] as const)(
    'handles Twilio failure category without logging raw errors (%s)',
    async (providerError, failureCategory, messageFragment) => {
      const create = jest.fn().mockRejectedValue(providerError);
      const provider = new TwilioSmsProvider(
        {
          accountSid: testTwilioAccountSid,
          apiKey: testTwilioApiKey,
          apiSecret: 'twilio-api-secret',
          fromNumber: '+15017122661',
          timeoutMs: 1000,
        },
        { messages: { create } },
      );

      const result = await provider.send(smsInput());
      expect(result).toMatchObject({
        status: 'FAILED',
        failureCategory,
      });
      expect(result.errorMessage).toContain(messageFragment);
      expect(result.errorMessage).not.toContain('sensitive response details');
      expect(create).toHaveBeenCalledTimes(1);
    },
  );

  it('treats a Twilio success without a message SID as terminal', async () => {
    const create = jest.fn().mockResolvedValue({ status: 'queued' });
    const provider = new TwilioSmsProvider(
      {
        accountSid: testTwilioAccountSid,
        apiKey: testTwilioApiKey,
        apiSecret: 'twilio-api-secret',
        fromNumber: '+15017122661',
        timeoutMs: 1000,
      },
      { messages: { create } },
    );

    await expect(provider.send(smsInput())).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
      errorMessage:
        'Twilio returned no message SID; verify provider history before retry',
    });
  });

  it('fails closed when Arkesel accepts a send without a trackable ID', async () => {
    const server = await startSmsServer(() => ({
      statusCode: 200,
      body: {
        status: 'success',
        data: [{ recipient: '2348000000000' }],
      },
    }));
    const provider = new ArkeselSmsProvider({
      baseUrl: server.url,
      apiKey: 'arkesel-key',
      senderId: 'ShopCity',
      timeoutMs: 1000,
      sandbox: true,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'FAILED',
        errorMessage:
          'Arkesel accepted the send without a trackable message ID; verify provider history before retry',
        failureCategory: 'terminal',
      });
    } finally {
      await server.close();
    }
  });

  it('does not associate an Arkesel message ID for a different recipient', async () => {
    const server = await startSmsServer(() => ({
      statusCode: 200,
      body: {
        status: 'success',
        data: [{ recipient: '2348000000001', id: 'unrelated-message' }],
      },
    }));
    const provider = new ArkeselSmsProvider({
      baseUrl: server.url,
      apiKey: 'arkesel-key',
      senderId: 'ShopCity',
      timeoutMs: 1000,
      sandbox: true,
    });

    try {
      await expect(provider.send(smsInput())).resolves.toEqual({
        status: 'FAILED',
        errorMessage:
          'Arkesel accepted the send without a trackable message ID; verify provider history before retry',
        failureCategory: 'terminal',
      });
    } finally {
      await server.close();
    }
  });

  it.each([
    ['DELIVERED', 'DELIVERED'],
    ['SUBMITTED', 'SENT'],
    ['QUEUED', 'SENT'],
    ['NOT_DELIVERED', 'FAILED'],
    ['PROHIBITED', 'FAILED'],
    ['EXPIRED', 'FAILED'],
  ] as const)(
    'maps Arkesel DLR %s to %s',
    async (providerStatus: string, status: 'DELIVERED' | 'SENT' | 'FAILED') => {
      const requests: CapturedRequest[] = [];
      const server = await startSmsServer((request) => {
        requests.push(request);
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: {
              'arkesel-message-2': { status: providerStatus },
            },
          },
        };
      });
      const provider = new ArkeselSmsProvider({
        baseUrl: server.url,
        apiKey: 'arkesel-key',
        senderId: 'ShopCity',
        timeoutMs: 1000,
        sandbox: true,
      });

      try {
        await expect(
          provider.getDeliveryReport('arkesel-message-2'),
        ).resolves.toEqual({
          status,
          providerMessageId: 'arkesel-message-2',
        });
        expect(requests[0]).toMatchObject({
          method: 'POST',
          url: '/sms/message-reports',
          headers: expect.objectContaining({
            'api-key': 'arkesel-key',
          }) as Record<string, string>,
          body: { msg_ids: ['arkesel-message-2'] },
        });
      } finally {
        await server.close();
      }
    },
  );

  it('leaves missing, unknown, and mismatched Arkesel reports unresolved', async () => {
    const server = await startSmsServer(() => ({
      statusCode: 200,
      body: {
        status: 'success',
        data: {
          'another-message': { status: 'DELIVERED' },
          'arkesel-message-3': { id: 'different-id', status: 'DELIVERED' },
          'unknown-status-message': { status: 'PROCESSING' },
        },
      },
    }));
    const provider = new ArkeselSmsProvider({
      baseUrl: server.url,
      apiKey: 'arkesel-key',
      senderId: 'ShopCity',
      timeoutMs: 1000,
      sandbox: true,
    });

    try {
      await expect(
        provider.getDeliveryReport('arkesel-message-3'),
      ).resolves.toBeNull();
      await expect(
        provider.getDeliveryReport('absent-message'),
      ).resolves.toBeNull();
      await expect(
        provider.getDeliveryReport('unknown-status-message'),
      ).resolves.toBeNull();
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

  it('renders one combined redemption settlement SMS', () => {
    const payload = buildRedemptionConfirmedSmsPayload({
      receiptId: 'receipt-1',
      transactionId: 'redeem-ledger-1',
      redemptionId: 'redemption-1',
      customerId: 'customer-1',
      phoneE164: '+2348000000000',
      redeemedKobo: 3_000n,
      netPaidKobo: 7_000n,
      earnedKobo: 140n,
      earnTransactionId: 'earn-ledger-1',
      remainingBalanceKobo: 2_140n,
    });

    expect(
      renderSmsMessage({
        receiptId: 'receipt-1',
        template: 'redemption-confirmed',
        payload,
      }),
    ).toBe(
      'ShopCity: Receipt receipt-1 redeemed NGN 30.00; paid NGN 70.00 and earned NGN 1.40. Available credit NGN 21.40.',
    );
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
            kind: 'CREDIT',
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
              'ShopCity: Your balance was increased by NGN 12.00 for transaction ledger-10. Remaining balance NGN 1240.00.',
          },
        },
      });
    } finally {
      await server.close();
    }
  });

  it('renders credit expiry reminder SMS messages', async () => {
    const requests: CapturedRequest[] = [];
    const server = await startSmsServer((request) => {
      requests.push(request);

      return {
        statusCode: 200,
        body: { response: { status: 'SUCCESS', batch_id: 'sms-5' } },
      };
    });

    const provider = newEbulkSmsProvider(server.url);

    try {
      await expect(
        provider.send({
          ...smsInput(),
          receiptId: null,
          template: 'credit-expiry-reminder-v1',
          payload: buildCreditExpiryReminderSmsPayload({
            customerId: 'customer-1',
            phoneE164: '+2348000000000',
            totalExpiringKobo: 4500n,
            earliestExpiresAt: new Date('2026-09-10T10:00:00.000Z'),
            latestExpiresAt: new Date('2026-09-10T10:00:00.000Z'),
          }),
        }),
      ).resolves.toEqual({
        status: 'SENT',
        providerMessageId: 'sms-5',
      });

      expect(requests[0]?.body).toMatchObject({
        SMS: {
          message: {
            messagetext:
              'ShopCity: NGN 45.00 expires soon. Expiry window 2026-09-10T10:00:00.000Z to 2026-09-10T10:00:00.000Z.',
          },
        },
      });
    } finally {
      await server.close();
    }
  });

  it('preserves zero remaining balances in balance-adjusted payloads', () => {
    expect(
      buildBalanceAdjustedSmsPayload({
        transactionId: 'ledger-11',
        adjustmentId: 'adjustment-11',
        kind: 'DEBIT',
        phoneE164: '+2348000000000',
        amountKobo: 1200n,
        remainingBalanceKobo: 0n,
      }),
    ).toMatchObject({
      remainingBalanceKobo: '0',
      kind: 'DEBIT',
    });
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

  it('rejects incomplete credit expiry reminder payloads', async () => {
    await expect(
      newEbulkSmsProvider().send({
        ...smsInput(),
        receiptId: null,
        template: 'credit-expiry-reminder-v1',
        payload: {
          version: 1,
          customerId: 'customer-1',
          phoneE164: '+2348000000000',
          template: 'credit-expiry-reminder-v1',
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

  it('rejects fake providers in production even when the override is set', () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'sandbox',
        ALLOW_FAKE_SMS_IN_PRODUCTION: 'true',
      }),
    ).toThrow('Fake SMS providers are not allowed in production');
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

  it('selects the Arkesel adapter with provider-specific sandbox configuration', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'arkesel',
      ARKESEL_API_KEY: 'arkesel-key',
      ARKESEL_SENDER_ID: 'ShopCity',
      ARKESEL_SANDBOX: 'true',
    });

    expect(provider).toBeInstanceOf(ArkeselSmsProvider);
  });

  it("selects Africa's Talking with its live credentials and never claims polling support", () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'africastalking',
      AFRICASTALKING_LIVE_USERNAME: 'shopcity',
      AFRICASTALKING_LIVE_API_KEY: 'at-live-key',
      AFRICASTALKING_SENDER_ID: 'ShopCity',
    });

    expect(provider).toBeInstanceOf(AfricaTalkingSmsProvider);
    expect(typeof provider.getDeliveryReport).toBe('undefined');
  });

  it("selects Africa's Talking sandbox with its separate key and sandbox username", async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          SMSMessageData: {
            Recipients: [
              {
                statusCode: 101,
                number: '+2348000000000',
                messageId: 'at-sandbox-message',
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'africastalking',
      AFRICASTALKING_SANDBOX: 'true',
      AFRICASTALKING_SANDBOX_API_KEY: 'at-sandbox-key',
    });

    try {
      expect(provider).toBeInstanceOf(AfricaTalkingSmsProvider);
      await expect(provider.send(smsInput())).resolves.toMatchObject({
        status: 'SENT',
      });
      const [url, init] = fetchSpy.mock.calls[0] ?? [];
      expect(url).toBe(
        'https://api.sandbox.africastalking.com/version1/messaging',
      );
      expect(init?.headers).toMatchObject({ apiKey: 'at-sandbox-key' });
      expect(typeof init?.body).toBe('string');
      expect(new URLSearchParams(init?.body as string).get('username')).toBe(
        'sandbox',
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('selects Twilio only with the explicit vendor and sender configuration', () => {
    const provider = createSmsProvider({
      ...baseEnv(),
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'twilio',
      TWILIO_ACCOUNT_SID: testTwilioAccountSid,
      TWILIO_API_KEY: testTwilioApiKey,
      TWILIO_API_SECRET: 'twilio-api-secret',
      TWILIO_FROM_NUMBER: '+15017122661',
    });

    expect(provider).toBeInstanceOf(TwilioSmsProvider);
    expect(provider.requiresLocalSubmissionReservation).toBe(true);
    expect(typeof provider.getDeliveryReport).toBe('undefined');
  });

  it("rejects Africa's Talking sandbox configuration in production", () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'africastalking',
        AFRICASTALKING_SANDBOX: 'true',
        AFRICASTALKING_SANDBOX_API_KEY: 'at-sandbox-key',
      }),
    ).toThrow();
  });

  it('rejects Arkesel sandbox configuration in production', () => {
    expect(() =>
      createSmsProvider({
        ...baseEnv(),
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'arkesel',
        ARKESEL_API_KEY: 'arkesel-key',
        ARKESEL_SENDER_ID: 'ShopCity',
        ARKESEL_SANDBOX: 'true',
      }),
    ).toThrow();
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

  it('normalizes an eBulkSMS XML delivery report without exposing the payload', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          '<reports><report><uniqueid>provider-1</uniqueid><status>Delivered</status><deliverytime>2026-09-11T10:00:00Z</deliverytime></report></reports>',
        ),
    } as Response);

    try {
      await expect(
        newEbulkSmsProvider().getDeliveryReport('provider-1'),
      ).resolves.toEqual({
        status: 'DELIVERED',
        providerMessageId: 'provider-1',
        occurredAt: new Date('2026-09-11T10:00:00Z'),
      });
      const requestUrl = fetchSpy.mock.calls[0]?.[0];
      const requestUrlText =
        typeof requestUrl === 'string'
          ? requestUrl
          : requestUrl instanceof URL
            ? requestUrl.toString()
            : requestUrl?.url;
      expect(requestUrlText).toContain('/getdlr.xml');
      expect(requestUrlText).toContain('uniqueid=provider-1');
    } finally {
      fetchSpy.mockRestore();
    }
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
    DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-4000-8000-000000000001',
    DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-4000-8000-000000000002',
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
