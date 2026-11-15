import { THROTTLE_KEY } from '../../common/throttle/throttle.constants';
import {
  AuthController,
  buildPasswordRecoveryRedirectUrl,
  buildPasswordRecoveryRequestThrottleKey,
} from './auth.controller';

const TAILSCALE_ORIGIN = 'https://shopcity-dev.tailnet.ts.net:8445';

describe('password recovery routing', () => {
  it('builds a fixed callback from the validated origin, ignoring URL paths', () => {
    expect(
      buildPasswordRecoveryRedirectUrl(
        'https://shopcity.example.test',
        undefined,
      ),
    ).toBe('https://shopcity.example.test/reset-password');
    expect(
      buildPasswordRecoveryRedirectUrl(
        undefined,
        'http://localhost:3100/login?next=https://evil.example',
      ),
    ).toBe('http://localhost:3100/reset-password');
  });

  it('uses only a server-keyed HMAC of normalized email in recovery throttle keys', () => {
    const previousSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'test-session-secret-for-recovery-throttle';
    try {
      const keys = buildPasswordRecoveryRequestThrottleKey({
        ip: '127.0.0.1',
        body: { email: ' Staff@Example.test ' },
      } as never);

      expect(keys[0]).toBe('password-recovery:ip:127.0.0.1');
      expect(keys[1]).toMatch(/^password-recovery:email:[a-f0-9]{64}$/);
      expect(keys.join(':')).not.toContain('staff@example.test');
    } finally {
      if (previousSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previousSecret;
    }
  });

  it('applies finite throttles to recovery request and completion routes', () => {
    const requestHandler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'requestPasswordRecovery',
    )?.value as object;
    const completionHandler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'completePasswordRecovery',
    )?.value as object;
    const requestThrottle = Reflect.getMetadata(
      THROTTLE_KEY,
      requestHandler,
    ) as { bucket: string; limit: number; windowMs: number };
    const completionThrottle = Reflect.getMetadata(
      THROTTLE_KEY,
      completionHandler,
    ) as { bucket: string; limit: number; windowMs: number };

    expect(requestThrottle).toMatchObject({
      bucket: 'auth.password_recovery.request',
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    expect(completionThrottle).toMatchObject({
      bucket: 'auth.password_recovery.complete',
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
  });

  it('validates the browser origin before requesting a fixed recovery redirect', async () => {
    const authService = {
      assertPublicLoginOrigin: jest.fn(),
      requestPasswordRecovery: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AuthController(authService as never);

    const result = await controller.requestPasswordRecovery(
      { email: 'staff@example.test' },
      TAILSCALE_ORIGIN,
      undefined,
      'bff-token',
      'local',
      '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
    );

    expect(authService.assertPublicLoginOrigin).toHaveBeenCalledWith(
      TAILSCALE_ORIGIN,
      undefined,
      'bff-token',
      'local',
    );
    expect(authService.requestPasswordRecovery).toHaveBeenCalledWith(
      'staff@example.test',
      `${TAILSCALE_ORIGIN}/reset-password`,
      '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
    );
    expect(result.message).toContain('If an account exists');
  });
});

describe('AuthController local cashier test session cookies', () => {
  const issued = {
    sessionToken: 'session-token',
    csrfToken: 'csrf-token',
    context: { session: { expiresAt: new Date(Date.now() + 60_000) } },
  };

  async function createSession(origin: string) {
    const authService = {
      createLocalCashierTestSession: jest.fn().mockResolvedValue(issued),
      toResponse: jest.fn().mockReturnValue({ status: 'ok' }),
    };
    const reply = { header: jest.fn() };
    const controller = new AuthController(authService as never);

    await controller.localCashierTestSession(
      { username: 'cashier@example.test' },
      origin,
      reply as never,
    );

    const [, cookies] = reply.header.mock.calls[0] as [
      string,
      [string, string],
    ];
    return cookies;
  }

  it('marks session and CSRF cookies Secure for the HTTPS Tailscale origin', async () => {
    const cookies = await createSession(TAILSCALE_ORIGIN);

    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => cookie.includes('; Secure;'))).toBe(true);
  });

  it('preserves the local HTTP cookie behavior', async () => {
    const cookies = await createSession('http://127.0.0.1:3101');

    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => !cookie.includes('; Secure'))).toBe(true);
  });
});
