import * as Joi from 'joi';

const isTest = process.env.NODE_ENV === 'test';

const requiredString = (fallback: string) =>
  isTest ? Joi.string().default(fallback) : Joi.string().min(1).required();

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: requiredString(
    'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public',
  ),
  REDIS_URL: requiredString('redis://127.0.0.1:6379'),
  SESSION_SECRET: requiredString('test-session-secret-test-session-secret'),
  CSRF_SECRET: requiredString('test-csrf-secret-test-csrf-secret'),
  SHOPCITY_TIMEZONE: Joi.string().default('Africa/Lagos'),
  RECEIPT_WEEK_START_DAY: Joi.number().integer().min(0).max(6).default(1),
  DEFAULT_EARN_RATE_BPS: Joi.number().integer().min(0).max(10000).default(200),
  MIN_REDEMPTION_KOBO: Joi.number().integer().min(0).default(50000),
  MAX_REDEMPTION_BASKET_PERCENT: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(30),
  PURCHASE_FLAG_THRESHOLD_KOBO: Joi.number().integer().min(0).default(10000000),
  PURCHASE_APPROVAL_THRESHOLD_KOBO: Joi.number()
    .integer()
    .min(0)
    .default(20000000),
  PURCHASE_AMOUNT_CEILING_KOBO: Joi.number()
    .integer()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(100000000),
  OUTBOX_PUBLISH_BATCH_SIZE: Joi.number().integer().min(1).max(1000).default(25),
  OUTBOX_PUBLISH_INTERVAL_MS: Joi.number()
    .integer()
    .min(100)
    .default(5000),
  OUTBOX_RETRY_DELAY_MS: Joi.number().integer().min(1000).default(30000),
  OUTBOX_RECOVERY_THRESHOLD_MS: Joi.number()
    .integer()
    .min(1000)
    .default(60000),
  SMS_PROVIDER_MODE: Joi.string().valid('deterministic').default('deterministic'),
  REDEMPTION_APPROVAL_THRESHOLD_KOBO: Joi.number()
    .integer()
    .min(0)
    .default(500000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
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
}).unknown(true);
