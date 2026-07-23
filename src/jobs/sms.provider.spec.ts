import { DeterministicSmsProvider, SandboxSmsProvider } from './sms.provider';
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
      }),
    ).toThrow('SMS_PROVIDER_URL is required for real SMS mode');
  });
});
