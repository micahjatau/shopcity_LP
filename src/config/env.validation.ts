import * as Joi from 'joi';

const isTest = process.env.NODE_ENV === 'test';

const requiredString = (fallback: string) =>
  isTest ? Joi.string().default(fallback) : Joi.string().min(1).required();

const requiredKek = (fallback: string) =>
  isTest ? Joi.string().default(fallback) : Joi.string().min(32).required();

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: requiredString(
    'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public',
  ),
  REDIS_URL: Joi.string().min(1).optional(),
  UPSTASH_REDIS_URL: Joi.string().optional(),
  UPSTASH_REDIS_REST_URL: Joi.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().optional(),
  UPSTASH_REDIS_REST_API_URL: Joi.string().optional(),
  UPSTASH_REDIS_REST_API_TOKEN: Joi.string().optional(),
  UPSTASH_KV_URL: Joi.string().optional(),
  UPSTASH_KV_REST_API_URL: Joi.string().optional(),
  UPSTASH_KV_REST_API_TOKEN: Joi.string().optional(),
  KV_REST_API_URL: Joi.string().optional(),
  KV_REST_API_TOKEN: Joi.string().optional(),
  SESSION_SECRET: requiredString('test-session-secret-test-session-secret'),
  SESSION_IDLE_CASHIER_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(240)
    .default(30),
  SESSION_IDLE_SUPERVISOR_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(240)
    .default(15),
  SESSION_IDLE_ADMIN_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(240)
    .default(15),
  CSRF_SECRET: requiredString('test-csrf-secret-test-csrf-secret'),
  DEVICE_ATTESTATION_KEK: requiredKek(
    'test-device-attestation-kek-test-device-attestation-kek',
  ),
  DEVICE_ATTESTATION_KEK_VERSION: Joi.number().integer().min(1).default(1),
  SHOPCITY_TIMEZONE: Joi.string().default('Africa/Lagos'),
  RECEIPT_WEEK_START_DAY: Joi.number().integer().min(0).max(6).default(1),
  DEFAULT_EARN_RATE_BPS: Joi.number().integer().min(0).max(10000).default(200),
  OFFLINE_SYNC_MAX_RECORDS: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100),
  OFFLINE_EARN_MAX_AGE_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(72),
  REPORT_EXPORT_MAX_ROWS: Joi.number()
    .integer()
    .min(1)
    .max(50000)
    .default(5000),
  REPORT_EXPORT_RATE_LIMIT_PER_MINUTE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(10),
  MIN_REDEMPTION_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(50000),
  MAX_REDEMPTION_BASKET_PERCENT: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(30),
  PURCHASE_FLAG_THRESHOLD_KOBO: Joi.number()
    .integer()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .default(10000000),
  PURCHASE_APPROVAL_THRESHOLD_KOBO: Joi.number()
    .integer()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .default(20000000),
  FRAUD_CARD_DAILY_COUNT_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(5),
  FRAUD_CASHIER_MIN_SAMPLE_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(5),
  FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS: Joi.number()
    .integer()
    .min(1)
    .max(100000)
    .default(15000),
  FRAUD_ROUNDED_VALUE_MIN_SAMPLE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(5),
  FRAUD_ROUNDED_VALUE_UNIT_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(1000),
  FRAUD_REVERSAL_WINDOW_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(24),
  FRAUD_REVERSAL_COUNT_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(3),
  FRAUD_CARD_REPLACEMENT_WINDOW_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30),
  FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(3),
  FRAUD_AUTH_FAILURE_WINDOW_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(15),
  FRAUD_AUTH_FAILURE_COUNT_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(5),
  PURCHASE_AMOUNT_CEILING_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(100000000),
  OUTBOX_PUBLISH_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(25),
  OUTBOX_PUBLISH_INTERVAL_MS: Joi.number().integer().min(100).default(5000),
  OUTBOX_RETRY_DELAY_MS: Joi.number().integer().min(1000).default(30000),
  OUTBOX_RECOVERY_THRESHOLD_MS: Joi.number().integer().min(1000).default(60000),
  CREDIT_EXPIRY_SWEEP_INTERVAL_MS: Joi.number()
    .integer()
    .min(1000)
    .default(86400000),
  CREDIT_EXPIRY_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100),
  CREDIT_EXPIRY_REMINDER_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30),
  CREDIT_EXPIRY_REMINDER_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100),
  SMS_PROVIDER_MODE: Joi.string()
    .valid('deterministic', 'sandbox', 'real')
    .default('deterministic'),
  SMS_PROVIDER_URL: Joi.string().uri().when('SMS_PROVIDER_MODE', {
    is: 'real',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMS_PROVIDER_USERNAME: Joi.string().when('SMS_PROVIDER_MODE', {
    is: 'real',
    then: Joi.string().min(1).required(),
    otherwise: Joi.optional(),
  }),
  SMS_PROVIDER_API_KEY: Joi.string().when('SMS_PROVIDER_MODE', {
    is: 'real',
    then: Joi.string().min(1).required(),
    otherwise: Joi.optional(),
  }),
  SMS_PROVIDER_SENDER_ID: Joi.string().when('SMS_PROVIDER_MODE', {
    is: 'real',
    then: Joi.string().min(1).required(),
    otherwise: Joi.optional(),
  }),
  SMS_PROVIDER_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  ALLOW_FAKE_SMS_IN_PRODUCTION: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  REDEMPTION_APPROVAL_THRESHOLD_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(500000),
  ADJUSTMENT_AMOUNT_CEILING_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(100000000),
  ADJUSTMENT_CREDIT_EXPIRY_MONTHS: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .default(12),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  RELEASE_SHA: Joi.string().default('dev'),
  RELEASE_VERSION: Joi.string().default('0.0.0-dev'),
  SENTRY_DSN: Joi.string().uri().optional(),
  REPORT_STALENESS_THRESHOLD_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(10080)
    .default(180),
  OUTBOX_STALE_THRESHOLD_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(10080)
    .default(30),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  DEFAULT_PUBLIC_TENANT_ID: requiredString(
    '00000000-0000-0000-0000-000000000001',
  ),
  DEFAULT_PUBLIC_BRANCH_ID: requiredString(
    '00000000-0000-0000-0000-000000000002',
  ),
  CORS_ORIGIN_ALLOWLIST: requiredString(
    'http://localhost:3000,http://127.0.0.1:3000',
  ),
  SUPABASE_URL: requiredString('http://127.0.0.1:54321'),
  SUPABASE_ANON_KEY: requiredString('test-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: requiredString('test-service-role-key'),
})
  .custom((value: unknown, helpers) => {
    const env = value as Record<string, number>;
    const attestationKek = String(env.DEVICE_ATTESTATION_KEK ?? '');
    const secretValues = [
      env.SESSION_SECRET,
      env.CSRF_SECRET,
      env.SMS_PROVIDER_USERNAME,
      env.SMS_PROVIDER_API_KEY,
      env.SMS_PROVIDER_SENDER_ID,
    ]
      .filter((secret) => typeof secret === 'string')
      .map((secret) => String(secret));

    if (attestationKek.trim().length < 32) {
      return helpers.error('any.invalid');
    }

    if (secretValues.includes(attestationKek)) {
      return helpers.error('any.invalid');
    }

    if (env.REDEMPTION_APPROVAL_THRESHOLD_KOBO < env.MIN_REDEMPTION_KOBO) {
      return helpers.error('any.invalid');
    }

    if (
      env.PURCHASE_APPROVAL_THRESHOLD_KOBO < env.PURCHASE_FLAG_THRESHOLD_KOBO
    ) {
      return helpers.error('any.invalid');
    }

    return env;
  })
  .unknown(true);
