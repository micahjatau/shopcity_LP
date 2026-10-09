import {
  isAllowedLocalCashierTestSessionOrigin,
  isLocalCashierTestSessionEnabled,
  isLoopbackDatabaseUrl,
  isLoopbackHttpOrigin,
  isValidTailscaleHttpsOrigin,
  resolveApiListenHost,
} from './local-cashier-test-session';

describe('local cashier test-session environment', () => {
  const localEnvironment = {
    NODE_ENV: 'development',
    DATABASE_URL:
      'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity?schema=public',
    SMS_PROVIDER_MODE: 'deterministic',
    DEV_CASHIER_TEST_SESSION_ENABLED: true,
  };

  it('requires an explicit local-only opt-in', () => {
    expect(isLocalCashierTestSessionEnabled(localEnvironment)).toBe(true);
    expect(
      isLocalCashierTestSessionEnabled({
        ...localEnvironment,
        DEV_CASHIER_TEST_SESSION_ENABLED: false,
      }),
    ).toBe(false);
  });

  it.each([
    ['test mode', { NODE_ENV: 'test' }],
    ['production mode', { NODE_ENV: 'production' }],
    ['any Vercel runtime', { VERCEL_ENV: 'development' }],
    [
      'remote database',
      {
        DATABASE_URL: 'postgresql://shopcity:shopcity@db.example.test/shopcity',
      },
    ],
    ['real SMS delivery', { SMS_PROVIDER_MODE: 'real' }],
  ])('rejects %s', (_label, overrides) => {
    expect(
      isLocalCashierTestSessionEnabled({ ...localEnvironment, ...overrides }),
    ).toBe(false);
  });
});

describe('API listener host for local cashier test sessions', () => {
  it.each([true, 'true'])('binds to loopback when the opt-in is %s', (flag) => {
    expect(resolveApiListenHost(flag)).toBe('127.0.0.1');
  });

  it.each([false, 'false', undefined])(
    'preserves the standard bind when the opt-in is %s',
    (flag) => {
      expect(resolveApiListenHost(flag)).toBe('0.0.0.0');
    },
  );
});

describe('local-only endpoint origin validation', () => {
  it.each(['http://localhost:3100', 'http://127.0.0.1:3000'])(
    'accepts %s',
    (origin) => {
      expect(isLoopbackHttpOrigin(origin)).toBe(true);
    },
  );

  it.each([
    'https://preview.shopcity.test',
    'http://localhost:3100/path',
    'http://evil.example.test',
    undefined,
  ])('rejects %s', (origin) => {
    expect(isLoopbackHttpOrigin(origin)).toBe(false);
  });
});

describe('exact Tailscale origin validation', () => {
  const tailscaleOrigin = 'https://shopcity-dev.tailnet.ts.net:8445';

  it('accepts a canonical HTTPS Tailscale Serve origin', () => {
    expect(isValidTailscaleHttpsOrigin(tailscaleOrigin)).toBe(true);
  });

  it.each([
    'http://shopcity-dev.tailnet.ts.net:8445',
    'https://shopcity-dev.tailnet.ts.net:8445/path',
    'https://user@shopcity-dev.tailnet.ts.net:8445',
    'https://shopcity-dev.tailnet.ts.net.evil.test',
    'https://preview.shopcity.test',
    undefined,
  ])('rejects invalid Tailscale origin %s', (origin) => {
    expect(isValidTailscaleHttpsOrigin(origin)).toBe(false);
  });

  it('allows loopback by default and only the exact configured Tailscale origin', () => {
    expect(
      isAllowedLocalCashierTestSessionOrigin(
        'http://localhost:3100',
        undefined,
      ),
    ).toBe(true);
    expect(
      isAllowedLocalCashierTestSessionOrigin(tailscaleOrigin, tailscaleOrigin),
    ).toBe(true);
    expect(
      isAllowedLocalCashierTestSessionOrigin(
        'https://other.tailnet.ts.net:8445',
        tailscaleOrigin,
      ),
    ).toBe(false);
    expect(
      isAllowedLocalCashierTestSessionOrigin(tailscaleOrigin, undefined),
    ).toBe(false);
  });
});

describe('loopback database URL validation', () => {
  it.each([
    'postgresql://user:password@localhost:5432/shopcity',
    'postgres://user:password@127.0.0.1:5432/shopcity',
  ])('accepts local database URL %s', (url) => {
    expect(isLoopbackDatabaseUrl(url)).toBe(true);
  });

  it.each([
    'postgresql://user:password@database.example.test/shopcity',
    'postgresql://user:password@0.0.0.0:5432/shopcity',
    'not-a-database-url',
    undefined,
  ])('rejects non-loopback database URL %s', (url) => {
    expect(isLoopbackDatabaseUrl(url)).toBe(false);
  });
});
