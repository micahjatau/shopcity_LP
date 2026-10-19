import { envValidationSchema } from './env.validation';

const testTwilioAccountSid = `AC${'a'.repeat(32)}`;
const testTwilioApiKey = `SK${'b'.repeat(32)}`;

describe('envValidationSchema', () => {
  it('accepts only a 32-byte base64url POS token HMAC key', () => {
    const validKey = Buffer.alloc(32, 42).toString('base64url');
    expect(
      envValidationSchema.validate({ POS_DEVICE_TOKEN_HMAC_KEY: validKey })
        .error,
    ).toBeUndefined();
    expect(
      envValidationSchema.validate({ POS_DEVICE_TOKEN_HMAC_KEY: 'invalid' })
        .error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        POS_DEVICE_TOKEN_HMAC_KEY: Buffer.alloc(31).toString('base64url'),
      }).error,
    ).toBeDefined();
  });
  it('requires explicit BFF, deployment, and device-token policy for deployed runtimes', () => {
    const validPreview = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_TARGET_ENV: 'preview',
      SHOPCITY_DEPLOYMENT_ENV: 'preview',
      SHOPCITY_BFF_SHARED_SECRET: Buffer.alloc(32, 9).toString('base64url'),
      PILOT_CASHIER_DEVICE_TOKEN_ONLY: true,
      WEBAUTHN_RP_ID: 'shopcity.example',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://shopcity.example',
    };
    expect(envValidationSchema.validate(validPreview).error).toBeUndefined();

    const invalidCases = [
      { ...validPreview, SHOPCITY_BFF_SHARED_SECRET: undefined },
      { ...validPreview, PILOT_CASHIER_DEVICE_TOKEN_ONLY: false },
      { ...validPreview, VERCEL_TARGET_ENV: 'staging' },
      { ...validPreview, SHOPCITY_DEPLOYMENT_ENV: 'production' },
      { ...validPreview, SHOPCITY_BFF_SHARED_SECRET: 'invalid' },
    ];
    for (const [index, environment] of invalidCases.entries()) {
      const result = envValidationSchema.validate(environment);
      if (!result.error) {
        throw new Error(`Invalid deployed environment case ${index} passed`);
      }
    }
  });

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
    expect(
      (result.value as Record<string, unknown>)
        .WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED,
    ).toBe(false);
    expect(
      (result.value as Record<string, unknown>)
        .DEV_CASHIER_TEST_SESSION_ENABLED,
    ).toBe(false);
  });

  it('defaults DLR polling to a five-minute interval and bounded batch', () => {
    const result = envValidationSchema.validate({});
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      SMS_DLR_POLL_INTERVAL_MS: 300000,
      SMS_DLR_POLL_BATCH_SIZE: 10,
    });

    expect(
      envValidationSchema.validate({ SMS_DLR_POLL_INTERVAL_MS: 86400001 })
        .error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({ SMS_DLR_POLL_BATCH_SIZE: 101 }).error,
    ).toBeDefined();
  });

  it('validates Arkesel credentials, defaults, and non-production sandbox gating', () => {
    const defaults = envValidationSchema.validate({});
    expect(defaults.error).toBeUndefined();
    expect(defaults.value).toMatchObject({
      SMS_PROVIDER_VENDOR: 'ebulksms',
      ARKESEL_SANDBOX: false,
    });

    const sandbox = envValidationSchema.validate({
      NODE_ENV: 'development',
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'arkesel',
      ARKESEL_API_KEY: 'arkesel-key',
      ARKESEL_SENDER_ID: 'ShopCity',
      ARKESEL_SANDBOX: 'true',
    });
    expect(sandbox.error).toBeUndefined();

    expect(
      envValidationSchema.validate({
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'arkesel',
        ARKESEL_SENDER_ID: 'ShopCity',
      }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'arkesel',
        ARKESEL_API_KEY: 'arkesel-key',
        ARKESEL_SENDER_ID: 'ShopCity',
        ARKESEL_SANDBOX: true,
      }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        NODE_ENV: 'development',
        SMS_PROVIDER_VENDOR: 'ebulksms',
        ARKESEL_SANDBOX: true,
      }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'arkesel',
        ARKESEL_API_KEY: 'arkesel-key',
        ARKESEL_SENDER_ID: 'ShopCity',
        ARKESEL_API_URL: 'http://sms.arkesel.com/api/v2',
      }).error,
    ).toBeDefined();
  });

  it("validates Africa's Talking live/sandbox credentials and sender safety", () => {
    expect(envValidationSchema.validate({}).value).toMatchObject({
      AFRICASTALKING_SANDBOX: false,
    });

    const live = envValidationSchema.validate({
      NODE_ENV: 'development',
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'africastalking',
      AFRICASTALKING_LIVE_USERNAME: 'shopcity',
      AFRICASTALKING_LIVE_API_KEY: 'live-key',
      AFRICASTALKING_SENDER_ID: 'ShopCity',
    });
    expect(live.error).toBeUndefined();

    const sandbox = envValidationSchema.validate({
      NODE_ENV: 'development',
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'africastalking',
      AFRICASTALKING_SANDBOX: 'true',
      AFRICASTALKING_SANDBOX_API_KEY: 'sandbox-key',
    });
    expect(sandbox.error).toBeUndefined();

    const invalidCases = [
      {
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'africastalking',
        AFRICASTALKING_LIVE_USERNAME: 'shopcity',
        AFRICASTALKING_SENDER_ID: 'ShopCity',
      },
      {
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'africastalking',
        AFRICASTALKING_LIVE_API_KEY: 'live-key',
        AFRICASTALKING_SENDER_ID: 'ShopCity',
      },
      {
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'africastalking',
        AFRICASTALKING_LIVE_USERNAME: 'shopcity',
        AFRICASTALKING_LIVE_API_KEY: 'live-key',
        AFRICASTALKING_SENDER_ID: 'sender-id-too-long',
      },
      {
        NODE_ENV: 'production',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'africastalking',
        AFRICASTALKING_SANDBOX: true,
        AFRICASTALKING_SANDBOX_API_KEY: 'sandbox-key',
      },
      {
        NODE_ENV: 'development',
        SMS_PROVIDER_MODE: 'real',
        SMS_PROVIDER_VENDOR: 'ebulksms',
        AFRICASTALKING_SANDBOX: true,
      },
    ];

    for (const environment of invalidCases) {
      expect(envValidationSchema.validate(environment).error).toBeDefined();
    }
  });

  it('validates Twilio API-key credentials and requires exactly one sender', () => {
    expect(envValidationSchema.validate({}).value).toMatchObject({
      SMS_PROVIDER_VENDOR: 'ebulksms',
    });

    const base = {
      NODE_ENV: 'development',
      SMS_PROVIDER_MODE: 'real',
      SMS_PROVIDER_VENDOR: 'twilio',
      TWILIO_ACCOUNT_SID: testTwilioAccountSid,
      TWILIO_API_KEY: testTwilioApiKey,
      TWILIO_API_SECRET: 'twilio-api-secret',
    };
    expect(
      envValidationSchema.validate({
        ...base,
        TWILIO_FROM_NUMBER: '+15017122661',
      }).error,
    ).toBeUndefined();
    expect(
      envValidationSchema.validate({
        ...base,
        TWILIO_MESSAGING_SERVICE_SID: 'MG1234567890abcdef1234567890abcdef',
      }).error,
    ).toBeUndefined();

    const invalidCases = [
      base,
      {
        ...base,
        TWILIO_FROM_NUMBER: '+15017122661',
        TWILIO_MESSAGING_SERVICE_SID: 'MG1234567890abcdef1234567890abcdef',
      },
      {
        ...base,
        TWILIO_ACCOUNT_SID: 'invalid',
        TWILIO_FROM_NUMBER: '+15017122661',
      },
      {
        ...base,
        TWILIO_API_KEY: 'invalid',
        TWILIO_FROM_NUMBER: '+15017122661',
      },
      { ...base, TWILIO_API_SECRET: '', TWILIO_FROM_NUMBER: '+15017122661' },
    ];
    for (const environment of invalidCases) {
      expect(envValidationSchema.validate(environment).error).toBeDefined();
    }
  });

  it('allows local cashier test sessions only with local DB and deterministic SMS', () => {
    const local = envValidationSchema.validate({
      NODE_ENV: 'development',
      DATABASE_URL:
        'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity?schema=public',
      SMS_PROVIDER_MODE: 'deterministic',
      DEV_CASHIER_TEST_SESSION_ENABLED: true,
    });
    expect(local.error).toBeUndefined();

    const unsafe = [
      {
        NODE_ENV: 'development',
        VERCEL_ENV: 'preview',
        DATABASE_URL: 'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity',
        SMS_PROVIDER_MODE: 'deterministic',
      },
      {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://shopcity:shopcity@db.example.com/shopcity',
        SMS_PROVIDER_MODE: 'deterministic',
      },
      {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity',
        SMS_PROVIDER_MODE: 'real',
      },
      {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity',
        SMS_PROVIDER_MODE: 'deterministic',
      },
    ];

    for (const environment of unsafe) {
      expect(
        envValidationSchema.validate({
          ...environment,
          DEV_CASHIER_TEST_SESSION_ENABLED: true,
        }).error,
      ).toBeDefined();
    }
  });

  it('allows only an exact HTTPS Tailscale origin with the complete local cashier gate', () => {
    const local = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity',
      SMS_PROVIDER_MODE: 'deterministic',
      DEV_CASHIER_TEST_SESSION_ENABLED: true,
    };
    const allowed = envValidationSchema.validate({
      ...local,
      DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN:
        'https://shopcity-dev.tailnet.ts.net:8445',
    });
    expect(allowed.error).toBeUndefined();

    const unsafe = [
      {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity',
        SMS_PROVIDER_MODE: 'deterministic',
        DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN:
          'https://shopcity-dev.tailnet.ts.net:8445',
      },
      {
        ...local,
        VERCEL_ENV: 'preview',
      },
      {
        ...local,
        DATABASE_URL: 'postgresql://shopcity:shopcity@db.example.test/shopcity',
      },
      {
        ...local,
        DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN:
          'https://preview.shopcity.test',
      },
      {
        ...local,
        DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN:
          'https://shopcity-dev.tailnet.ts.net:8445/path',
      },
    ];

    for (const environment of unsafe) {
      expect(envValidationSchema.validate(environment).error).toBeDefined();
    }
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

  it('allows Preview enrollment only with VERCEL_ENV=preview and HTTPS RP config', () => {
    const missingConfig = envValidationSchema.validate({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED: true,
    });
    expect(missingConfig.error).toBeDefined();

    const preview = envValidationSchema.validate({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_TARGET_ENV: 'preview',
      SHOPCITY_DEPLOYMENT_ENV: 'preview',
      SHOPCITY_BFF_SHARED_SECRET: Buffer.alloc(32, 10).toString('base64url'),
      PILOT_CASHIER_DEVICE_TOKEN_ONLY: true,
      WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED: true,
      WEBAUTHN_RP_ID: 'pos-preview.example.com',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://pos-preview.example.com',
    });
    expect(preview.error).toBeUndefined();

    for (const vercelEnv of [undefined, 'development', 'production']) {
      const disallowed = envValidationSchema.validate({
        NODE_ENV: 'production',
        ...(vercelEnv ? { VERCEL_ENV: vercelEnv } : {}),
        WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED: true,
        WEBAUTHN_RP_ID: 'pos-preview.example.com',
        WEBAUTHN_ALLOWED_ORIGINS: 'https://pos-preview.example.com',
      });
      expect(disallowed.error).toBeDefined();
    }

    for (const invalidPair of [
      {
        rpId: 'example.com',
        origin: 'https://pos-preview.example.com',
      },
      { rpId: 'localhost', origin: 'http://localhost:3000' },
    ]) {
      const disallowed = envValidationSchema.validate({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        SHOPCITY_DEPLOYMENT_ENV: 'preview',
        SHOPCITY_BFF_SHARED_SECRET: Buffer.alloc(32, 10).toString('base64url'),
        PILOT_CASHIER_DEVICE_TOKEN_ONLY: true,
        WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED: true,
        WEBAUTHN_RP_ID: invalidPair.rpId,
        WEBAUTHN_ALLOWED_ORIGINS: invalidPair.origin,
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
