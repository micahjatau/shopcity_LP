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
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  CORS_ORIGIN_ALLOWLIST: requiredString(
    'http://localhost:3000,http://127.0.0.1:3000',
  ),
  SUPABASE_URL: requiredString('http://127.0.0.1:54321'),
  SUPABASE_ANON_KEY: requiredString('test-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: requiredString('test-service-role-key'),
}).unknown(true);
