export interface LocalCashierTestSessionEnvironment {
  NODE_ENV?: unknown;
  VERCEL_ENV?: unknown;
  DATABASE_URL?: unknown;
  SMS_PROVIDER_MODE?: unknown;
  DEV_CASHIER_TEST_SESSION_ENABLED?: unknown;
}

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_BROWSER_HOSTS = new Set(['localhost', '127.0.0.1']);

export function resolveApiListenHost(
  localCashierTestSessionFlag: unknown,
): '127.0.0.1' | '0.0.0.0' {
  return localCashierTestSessionFlag === true ||
    localCashierTestSessionFlag === 'true'
    ? '127.0.0.1'
    : '0.0.0.0';
}

export function isLocalCashierTestSessionEnabledFromConfig(config: {
  get: (key: string) => unknown;
}): boolean {
  return isLocalCashierTestSessionEnabled({
    NODE_ENV: config.get('NODE_ENV'),
    VERCEL_ENV: config.get('VERCEL_ENV'),
    DATABASE_URL: config.get('DATABASE_URL'),
    SMS_PROVIDER_MODE: config.get('SMS_PROVIDER_MODE'),
    DEV_CASHIER_TEST_SESSION_ENABLED: config.get(
      'DEV_CASHIER_TEST_SESSION_ENABLED',
    ),
  });
}

export function isLocalCashierTestSessionEnabled(
  environment: LocalCashierTestSessionEnvironment,
): boolean {
  const enabled =
    environment.DEV_CASHIER_TEST_SESSION_ENABLED === true ||
    environment.DEV_CASHIER_TEST_SESSION_ENABLED === 'true';

  return (
    enabled &&
    environment.NODE_ENV === 'development' &&
    !environment.VERCEL_ENV &&
    isLoopbackDatabaseUrl(environment.DATABASE_URL) &&
    environment.SMS_PROVIDER_MODE === 'deterministic'
  );
}

export function isLoopbackDatabaseUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === 'postgres:' || url.protocol === 'postgresql:') &&
      LOCAL_DATABASE_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function isLoopbackHttpOrigin(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      url.protocol === 'http:' &&
      LOCAL_BROWSER_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function isValidTailscaleHttpsOrigin(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      url.protocol === 'https:' &&
      url.hostname.toLowerCase().endsWith('.ts.net') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function isAllowedLocalCashierTestSessionOrigin(
  origin: unknown,
  configuredTailscaleOrigin: unknown,
): boolean {
  return (
    isLoopbackHttpOrigin(origin) ||
    (isValidTailscaleHttpsOrigin(configuredTailscaleOrigin) &&
      origin === configuredTailscaleOrigin)
  );
}
