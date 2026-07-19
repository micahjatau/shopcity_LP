import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  it('requires matching header and cookie tokens', async () => {
    process.env.CSRF_SECRET = 'test-csrf-secret';
    const guard = new CsrfGuard({
      getAllAndOverride: () => false,
    } as unknown as Reflector,
    {
      session: {
        findUnique: jest.fn(),
      },
    } as never,
    {
      get: (key: string) =>
        key === 'CSRF_SECRET' ? 'test-csrf-secret' : undefined,
    } as never);

    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': 'csrf-token',
              cookie: 'shopcity_csrf=csrf-token',
            },
            authContext: {
              session: {
                csrfTokenHash: createHash('sha256')
                  .update('test-csrf-secret:csrf-token')
                  .digest('hex'),
              },
            },
          }),
        }),
        getHandler: () => undefined,
        getClass: () => undefined,
      } as never),
    ).resolves.toBe(true);
  });

  it('rejects when the header token is missing', async () => {
    const guard = new CsrfGuard({
      getAllAndOverride: () => false,
    } as unknown as Reflector,
    {
      session: {
        findUnique: jest.fn(),
      },
    } as never,
    {
      get: (key: string) =>
        key === 'CSRF_SECRET' ? 'test-csrf-secret' : undefined,
    } as never);

    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { cookie: 'shopcity_csrf=csrf-token' },
            authContext: {
              session: { csrfTokenHash: 'placeholder' },
            },
          }),
        }),
        getHandler: () => undefined,
        getClass: () => undefined,
      } as never),
    ).rejects.toThrow('CSRF token missing');
  });
});
