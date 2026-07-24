import {
  DeterministicSmsProvider,
  RealSmsProvider,
  SandboxSmsProvider,
} from './sms.provider';
import { createSmsProvider } from './sms.provider.factory';

describe('sms provider selection', () => {
  it('maps deterministic mode to a fake delivery id for tests', async () => {
    const provider = new DeterministicSmsProvider();

    await expect(
      provider.send({
        tenantId: 'tenant-1',
        receiptId: 'receipt-1',
        outboxEventId: 'outbox-1',
        phoneE164: '+2348000000000',
        template: 'earn-confirmed',
        payload: {},
      }),
    ).resolves.toEqual({
      status: 'DELIVERED',
      providerMessageId: 'sms-outbox-1',
    });
  });

  it('keeps sandbox delivery truthful', async () => {
    const provider = new SandboxSmsProvider();

    await expect(
      provider.send({
        tenantId: 'tenant-1',
        receiptId: 'receipt-1',
        outboxEventId: 'outbox-1',
        phoneE164: '+2348000000000',
        template: 'earn-confirmed',
        payload: {},
      }),
    ).resolves.toEqual({
      status: 'SENT',
      providerMessageId: 'sandbox-outbox-1',
    });
  });

  it('sends an idempotency key to the real provider', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'SENT',
        providerMessageId: 'sms-1',
      }),
    } as unknown as Response);

    const provider = new RealSmsProvider({
      url: 'https://sms.example.test',
      timeoutMs: 1000,
    });

    await expect(
      provider.send({
        tenantId: 'tenant-1',
        receiptId: 'receipt-1',
        outboxEventId: 'outbox-1',
        phoneE164: '+2348000000000',
        template: 'earn-confirmed',
        payload: {},
      }),
    ).resolves.toEqual({
      status: 'SENT',
      providerMessageId: 'sms-1',
      errorMessage: undefined,
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1];
    const requestHeaders = (requestInit as FetchRequestInit)?.headers;

    expect(requestHeaders).toMatchObject({
      'content-type': 'application/json',
      'idempotency-key': 'outbox-1',
    });

    fetchSpy.mockRestore();
  });

  it('allows sandbox mode through the factory', () => {
    const provider = createSmsProvider({
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
      SMS_PROVIDER_MODE: 'sandbox',
    });

    expect(provider).toBeInstanceOf(SandboxSmsProvider);
  });

  it('allows deterministic mode through the factory outside production', () => {
    const provider = createSmsProvider({
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
      SMS_PROVIDER_MODE: 'deterministic',
    });

    expect(provider).toBeInstanceOf(DeterministicSmsProvider);
  });

  it('rejects deterministic mode in production', () => {
    expect(() =>
      createSmsProvider({
        NODE_ENV: 'production',
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
        SMS_PROVIDER_MODE: 'deterministic',
      }),
    ).toThrow('Deterministic SMS provider is not allowed in production');
  });

  it('requires a provider URL for real mode', () => {
    expect(() =>
      createSmsProvider({
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
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_TOKEN: 'token',
      }),
    ).toThrow(
      'Invalid SMS provider environment: "SMS_PROVIDER_URL" is required',
    );
  });

  it('requires a token for real mode', () => {
    expect(() =>
      createSmsProvider({
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
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_URL: 'https://sms.example.test',
      }),
    ).toThrow(
      'Invalid SMS provider environment: "SMS_PROVIDER_TOKEN" is required',
    );
  });

  it('marks slow provider calls as retryable failures', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const provider = new RealSmsProvider({
      url: 'https://sms.example.test',
      timeoutMs: 1_000,
      token: 'token',
    });

    const sendPromise = provider.send({
      tenantId: 'tenant-1',
      receiptId: 'receipt-1',
      outboxEventId: 'outbox-1',
      phoneE164: '+2348000000000',
      template: 'earn-confirmed',
      payload: {},
    });

    await jest.advanceTimersByTimeAsync(1_001);

    await expect(sendPromise).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'retryable',
    });

    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  it('rejects invalid runtime statuses as terminal failures', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'BOGUS',
        providerMessageId: 'sms-1',
      }),
    } as unknown as Response);

    const provider = new RealSmsProvider({
      url: 'https://sms.example.test',
      timeoutMs: 1000,
      token: 'token',
    });

    await expect(
      provider.send({
        tenantId: 'tenant-1',
        receiptId: 'receipt-1',
        outboxEventId: 'outbox-1',
        phoneE164: '+2348000000000',
        template: 'earn-confirmed',
        payload: {},
      }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureCategory: 'terminal',
    });

    fetchSpy.mockRestore();
  });
});

type FetchRequestInit = {
  headers?: Record<string, string>;
};
