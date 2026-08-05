import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('rejects redemption policy values that are nonsensical', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'session-secret',
      CSRF_SECRET: 'csrf-secret',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      MIN_REDEMPTION_KOBO: 0,
      REDEMPTION_APPROVAL_THRESHOLD_KOBO: 10,
    });

    expect(result.error).toBeDefined();
  });

  it('rejects redemption approval thresholds below the minimum', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'session-secret',
      CSRF_SECRET: 'csrf-secret',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      MIN_REDEMPTION_KOBO: 10,
      REDEMPTION_APPROVAL_THRESHOLD_KOBO: 5,
      PURCHASE_FLAG_THRESHOLD_KOBO: 100,
      PURCHASE_APPROVAL_THRESHOLD_KOBO: 50,
    });

    expect(result.error).toBeDefined();
  });

  it('rejects redemption policy values above the safe integer ceiling', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'session-secret',
      CSRF_SECRET: 'csrf-secret',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      MIN_REDEMPTION_KOBO: Number.MAX_SAFE_INTEGER + 1,
      REDEMPTION_APPROVAL_THRESHOLD_KOBO: Number.MAX_SAFE_INTEGER,
    });

    expect(result.error).toBeDefined();
  });

  it('rejects weak device attestation keys', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'session-secret',
      CSRF_SECRET: 'csrf-secret',
      DEVICE_ATTESTATION_KEK: 'too-short',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    });

    expect(result.error).toBeDefined();
  });

  it('rejects attestation keys reused from session secrets', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'shared-secret-shared-secret-shared-secret',
      CSRF_SECRET: 'csrf-secret',
      DEVICE_ATTESTATION_KEK: 'shared-secret-shared-secret-shared-secret',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    });

    expect(result.error).toBeDefined();
  });

  it('rejects invalid device attestation key versions', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://example',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SESSION_SECRET: 'session-secret',
      CSRF_SECRET: 'csrf-secret',
      DEVICE_ATTESTATION_KEK: 'test-device-attestation-kek-test-device-attestation-kek',
      DEVICE_ATTESTATION_KEK_VERSION: 0,
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    });

    expect(result.error).toBeDefined();
  });
});
