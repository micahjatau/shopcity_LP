const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDisposableTarget } = require('./assert-disposable-target.cjs');

const testSecret = Buffer.alloc(32, 9).toString('base64url');

function validEnvironment() {
  return {
    SHOPCITY_E2E_DISPOSABLE: '1',
    SHOPCITY_DEPLOYMENT_ENV: 'local',
    SHOPCITY_BFF_SHARED_SECRET: testSecret,
    SHOPCITY_BACKEND_URL: 'http://127.0.0.1:31000',
    SHOPCITY_API_BASE_URL: 'http://127.0.0.1:31000',
    SHOPCITY_WEB_ORIGINS: 'http://127.0.0.1:32000',
    CORS_ORIGIN_ALLOWLIST: 'http://127.0.0.1:32000',
    DATABASE_URL:
      'postgresql://shopcity_e2e:container-password@127.0.0.1:32100/shopcity_e2e?schema=public',
    REDIS_URL: 'redis://127.0.0.1:32200',
    SUPABASE_URL: 'http://127.0.0.1:32300',
    SUPABASE_ANON_KEY: 'shopcity-e2e-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'shopcity-e2e-service-role-key',
    DEFAULT_ADMIN_PASSWORD: 'ephemeral-test-password-for-runner',
    SHOPCITY_LIVE_ADMIN_PASSWORD: 'ephemeral-test-password-for-runner',
    SMS_PROVIDER_MODE: 'deterministic',
  };
}

test('accepts only the isolated loopback E2E targets', () => {
  assert.deepEqual(assertDisposableTarget(validEnvironment()), {
    database: '127.0.0.1/shopcity_e2e',
    redis: '127.0.0.1:32200',
    supabase: '127.0.0.1:32300',
    api: 'http://127.0.0.1:31000',
    web: 'http://127.0.0.1:32000',
  });
});

test('refuses an absent disposable-runner marker', () => {
  const env = validEnvironment();
  delete env.SHOPCITY_E2E_DISPOSABLE;
  assert.throws(() => assertDisposableTarget(env), /blocked unless launched/);
});

test('refuses shared, remote, or mis-mapped service targets', () => {
  for (const [key, value] of [
    ['DATABASE_URL', 'postgresql://user:pass@db.example/shopcity_e2e'],
    ['DATABASE_URL', 'postgresql://user:pass@127.0.0.1:5432/shopcity'],
    ['REDIS_URL', 'rediss://redis.example:6379'],
    ['SUPABASE_URL', 'https://project.supabase.co'],
    ['SHOPCITY_BACKEND_URL', 'https://api.example'],
    ['SHOPCITY_API_BASE_URL', 'http://127.0.0.1:31001'],
    ['SHOPCITY_WEB_ORIGINS', 'https://shopcity.example'],
    ['CORS_ORIGIN_ALLOWLIST', 'http://127.0.0.1:32001'],
    ['SHOPCITY_DEPLOYMENT_ENV', 'preview'],
    ['SHOPCITY_BFF_SHARED_SECRET', 'short-secret'],
    ['SMS_PROVIDER_MODE', 'real'],
    ['UPSTASH_REDIS_URL', 'https://remote.example'],
  ]) {
    const env = { ...validEnvironment(), [key]: value };
    assert.throws(() => assertDisposableTarget(env), undefined, key);
  }
});
