import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('defaults WebAuthn qualification and development enrollment to disabled', () => {
    const result = envValidationSchema.validate({});
    expect(result.error).toBeUndefined();
    expect(
      (result.value as Record<string, unknown>)
        .WEBAUTHN_DEVICE_QUALIFICATION_APPROVED,
    ).toBe(false);
    expect(
      (result.value as Record<string, unknown>).WEBAUTHN_DEV_ENROLLMENT_ENABLED,
    ).toBe(false);
  });

  it('allows the explicit dev enrollment flag only in development with RP config', () => {
    const missingConfig = envValidationSchema.validate({
      NODE_ENV: 'development',
      WEBAUTHN_DEV_ENROLLMENT_ENABLED: true,
    });
    expect(missingConfig.error).toBeDefined();

    const development = envValidationSchema.validate({
      NODE_ENV: 'development',
      WEBAUTHN_DEV_ENROLLMENT_ENABLED: true,
      WEBAUTHN_RP_ID: 'localhost',
      WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost:3000',
    });
    expect(development.error).toBeUndefined();

    for (const nodeEnv of ['test', 'staging', 'production']) {
      const disallowed = envValidationSchema.validate({
        NODE_ENV: nodeEnv,
        WEBAUTHN_DEV_ENROLLMENT_ENABLED: true,
        WEBAUTHN_RP_ID: 'localhost',
        WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost:3000',
      });
      expect(disallowed.error).toBeDefined();
    }
  });

  it('rejects malformed or non-HTTPS WebAuthn origins', () => {
    const result = envValidationSchema.validate({
      WEBAUTHN_ALLOWED_ORIGINS:
        'https://pos.example.com/path,http://pos.example.com',
      WEBAUTHN_RP_ID: 'pos.example.com',
    });
    expect(result.error).toBeDefined();
  });

  it('accepts exact HTTPS production origins and local HTTP development origins', () => {
    const result = envValidationSchema.validate({
      WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
      WEBAUTHN_RP_ID: 'pos.example.com',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.example.com',
    });
    expect(result.error).toBeUndefined();

    const localResult = envValidationSchema.validate({
      WEBAUTHN_RP_ID: 'localhost',
      WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost:3000',
    });
    expect(localResult.error).toBeUndefined();

    const productionResult = envValidationSchema.validate({
      NODE_ENV: 'production',
      WEBAUTHN_RP_ID: 'localhost',
      WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost:3000',
    });
    expect(productionResult.error).toBeDefined();
  });

  it('rejects origins outside the configured RP ID domain', () => {
    const result = envValidationSchema.validate({
      WEBAUTHN_RP_ID: 'example.com',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.other-example.com',
    });
    expect(result.error).toBeDefined();
  });

  it('accepts configured RP hosts and their true subdomains', () => {
    const result = envValidationSchema.validate({
      WEBAUTHN_RP_ID: 'example.com',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://example.com,https://pos.example.com',
    });
    expect(result.error).toBeUndefined();
  });

  it('requires RP ID and origins when device qualification is approved', () => {
    const result = envValidationSchema.validate({
      WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
    });
    expect(result.error).toBeDefined();
  });
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
      DEVICE_ATTESTATION_KEK:
        'test-device-attestation-kek-test-device-attestation-kek',
      DEVICE_ATTESTATION_KEK_VERSION: 0,
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    });

    expect(result.error).toBeDefined();
  });
});
