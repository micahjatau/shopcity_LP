import { AuthController } from './auth.controller';

const TAILSCALE_ORIGIN = 'https://shopcity-dev.tailnet.ts.net:8445';

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
