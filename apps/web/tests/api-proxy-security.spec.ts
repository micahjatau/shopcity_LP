import {
  isTrustedShopcityBrowserOrigin,
  requiresShopcityBffIdentity,
  resolveShopcityBackendBaseUrl,
  resolveShopcityBffHeaders,
} from '../lib/api-proxy-security';

const testSecret = Buffer.alloc(32, 7).toString('base64url');

describe('API proxy security configuration', () => {
  it('trusts Vercel-generated Preview origins from platform metadata', () => {
    const env = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_TARGET_ENV: 'preview',
      VERCEL_URL: 'shopcity-git-feature-micahjatau.vercel.app',
      VERCEL_BRANCH_URL: 'shopcity-git-feature.vercel.app',
      SHOPCITY_DEPLOYMENT_ENV: 'preview',
    };

    expect(
      isTrustedShopcityBrowserOrigin(
        'https://shopcity-git-feature-micahjatau.vercel.app',
        null,
        env,
      ),
    ).toBe(true);
    expect(
      isTrustedShopcityBrowserOrigin(
        'https://attacker.example',
        'https://shopcity-git-feature-micahjatau.vercel.app/login',
        env,
      ),
    ).toBe(false);
  });

  it('uses Referer only when Origin is absent and rejects missing or malformed origins', () => {
    const env = { NODE_ENV: 'development' };
    expect(
      isTrustedShopcityBrowserOrigin(
        null,
        'http://localhost:3000/login?next=%2Fadmin',
        env,
      ),
    ).toBe(true);
    expect(
      isTrustedShopcityBrowserOrigin(
        'https://evil.example',
        'http://localhost:3000/login',
        env,
      ),
    ).toBe(false);
    expect(isTrustedShopcityBrowserOrigin(null, null, env)).toBe(false);
    expect(isTrustedShopcityBrowserOrigin('not-an-origin', null, env)).toBe(
      false,
    );
  });

  it('rejects malformed configured origins even if a Preview URL exists', () => {
    expect(
      isTrustedShopcityBrowserOrigin(
        'https://shopcity-preview.vercel.app',
        null,
        {
          NODE_ENV: 'production',
          VERCEL_ENV: 'preview',
          VERCEL_TARGET_ENV: 'preview',
          VERCEL_URL: 'shopcity-preview.vercel.app',
          SHOPCITY_DEPLOYMENT_ENV: 'preview',
          SHOPCITY_WEB_ORIGINS: 'https://good.example/path',
        },
      ),
    ).toBe(false);
  });

  it('requires explicit deployment mapping and never selects an API from a Git ref', () => {
    expect(
      resolveShopcityBackendBaseUrl({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        VERCEL_GIT_COMMIT_REF: 'staging',
        SHOPCITY_DEPLOYMENT_ENV: 'preview',
      }),
    ).toBeNull();

    expect(
      resolveShopcityBackendBaseUrl({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        VERCEL_GIT_COMMIT_REF: 'staging',
        SHOPCITY_DEPLOYMENT_ENV: 'preview',
        SHOPCITY_BACKEND_URL: 'https://preview-api.example',
      }),
    ).toBe('https://preview-api.example');
  });

  it('fails closed for insecure or local deployed API targets', () => {
    for (const backendUrl of [
      'http://api.example',
      'https://127.0.0.1:3000',
      'https://user:password@api.example',
    ]) {
      expect(
        resolveShopcityBackendBaseUrl({
          NODE_ENV: 'production',
          VERCEL_ENV: 'preview',
          VERCEL_TARGET_ENV: 'preview',
          SHOPCITY_DEPLOYMENT_ENV: 'preview',
          SHOPCITY_BACKEND_URL: backendUrl,
        }),
      ).toBeNull();
    }
  });

  it('requires a 32-byte environment-specific BFF secret outside local/test/CI', () => {
    expect(
      resolveShopcityBffHeaders({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        SHOPCITY_DEPLOYMENT_ENV: 'preview',
      }),
    ).toBeNull();

    expect(
      resolveShopcityBffHeaders({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        SHOPCITY_DEPLOYMENT_ENV: 'preview',
        SHOPCITY_BFF_SHARED_SECRET: testSecret,
      }),
    ).toEqual({
      'x-shopcity-bff-token': testSecret,
      'x-shopcity-deployment-environment': 'preview',
    });
  });

  it('does not require a secret for local development and scopes the BFF gate to auth POSTs', () => {
    expect(resolveShopcityBffHeaders({ NODE_ENV: 'development' })).toEqual({
      'x-shopcity-deployment-environment': 'local',
    });
    expect(requiresShopcityBffIdentity('/api/v1/auth/login', 'POST')).toBe(
      true,
    );
    expect(
      requiresShopcityBffIdentity(
        '/api/v1/auth/cashier-login/complete',
        'POST',
      ),
    ).toBe(true);
    expect(requiresShopcityBffIdentity('/api/v1/auth/me', 'GET')).toBe(false);
    expect(requiresShopcityBffIdentity('/api/v1/customers', 'POST')).toBe(
      false,
    );
  });
});
