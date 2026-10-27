const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const TEST_SUPABASE_ANON_KEY = 'shopcity-e2e-anon-key';
const TEST_SUPABASE_SERVICE_ROLE_KEY = 'shopcity-e2e-service-role-key';

function parseUrl(name, value) {
  if (!value) throw new Error(`${name} is required for disposable E2E.`);
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL for disposable E2E.`);
  }
}

function requireLoopback(name, value, protocols) {
  const url = parseUrl(name, value);
  if (!protocols.includes(url.protocol) || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${name} must target a loopback test service.`);
  }
  return url;
}

function isValidBffSecret(value) {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === value;
}

function assertDisposableTarget(env = process.env) {
  if (env.SHOPCITY_E2E_DISPOSABLE !== '1') {
    throw new Error(
      'Live backend E2E is blocked unless launched by the disposable Testcontainers runner.',
    );
  }

  const database = requireLoopback('DATABASE_URL', env.DATABASE_URL, [
    'postgres:',
    'postgresql:',
  ]);
  if (
    database.pathname.replace(/^\//, '') !== 'shopcity_e2e' ||
    database.username !== 'shopcity_e2e' ||
    !database.password
  ) {
    throw new Error(
      'DATABASE_URL must target the isolated shopcity_e2e database.',
    );
  }

  const redis = requireLoopback('REDIS_URL', env.REDIS_URL, ['redis:']);
  if (
    redis.username ||
    redis.password ||
    !['', '/'].includes(redis.pathname) ||
    redis.search ||
    redis.hash
  ) {
    throw new Error(
      'REDIS_URL must target the fresh isolated Redis container.',
    );
  }

  const supabase = requireLoopback('SUPABASE_URL', env.SUPABASE_URL, ['http:']);
  if (
    supabase.pathname !== '/' ||
    supabase.search ||
    supabase.hash ||
    env.SUPABASE_ANON_KEY !== TEST_SUPABASE_ANON_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY !== TEST_SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Supabase E2E keys must be the local auth-stub test keys.');
  }

  const api = requireLoopback(
    'SHOPCITY_BACKEND_URL',
    env.SHOPCITY_BACKEND_URL,
    ['http:'],
  );
  if (
    api.pathname !== '/' ||
    api.search ||
    api.hash ||
    env.SHOPCITY_API_BASE_URL !== api.origin
  ) {
    throw new Error('ShopCity API URLs must use the same loopback origin.');
  }

  const webOrigins = (env.SHOPCITY_WEB_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (webOrigins.length !== 1) {
    throw new Error('Exactly one loopback web origin is required for E2E.');
  }
  const web = requireLoopback('SHOPCITY_WEB_ORIGINS', webOrigins[0], ['http:']);
  if (
    web.origin !== webOrigins[0] ||
    env.CORS_ORIGIN_ALLOWLIST !== web.origin
  ) {
    throw new Error('Web and API CORS origins must match exactly.');
  }

  if (env.SHOPCITY_DEPLOYMENT_ENV !== 'local') {
    throw new Error(
      'Disposable E2E must use the local deployment environment.',
    );
  }
  if (!isValidBffSecret(env.SHOPCITY_BFF_SHARED_SECRET)) {
    throw new Error('A valid ephemeral BFF test secret is required.');
  }
  if (
    !env.DEFAULT_ADMIN_PASSWORD ||
    env.DEFAULT_ADMIN_PASSWORD.length < 24 ||
    env.SHOPCITY_LIVE_ADMIN_PASSWORD !== env.DEFAULT_ADMIN_PASSWORD
  ) {
    throw new Error('A matching ephemeral admin password is required for E2E.');
  }
  if (env.SMS_PROVIDER_MODE !== 'deterministic') {
    throw new Error('Live provider delivery is disabled in disposable E2E.');
  }
  if (
    Object.entries(env).some(
      ([name, value]) =>
        value &&
        (name.startsWith('UPSTASH_') || name.startsWith('KV_REST_API_')),
    )
  ) {
    throw new Error(
      'Remote Redis configuration is not permitted in disposable E2E.',
    );
  }

  return {
    database: `${database.hostname}/${database.pathname.slice(1)}`,
    redis: `${redis.hostname}:${redis.port}`,
    supabase: `${supabase.hostname}:${supabase.port}`,
    api: api.origin,
    web: web.origin,
  };
}

if (require.main === module) {
  try {
    const target = assertDisposableTarget();
    process.stdout.write(
      `Disposable E2E targets verified: database=${target.database}, redis=${target.redis}, supabase=${target.supabase}, api=${target.api}, web=${target.web}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Disposable E2E target validation failed.'}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = { assertDisposableTarget };
