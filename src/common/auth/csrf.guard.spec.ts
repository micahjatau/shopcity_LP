import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  it('requires matching header and cookie tokens', () => {
    process.env.CSRF_SECRET = 'test-csrf-secret';
    const guard = new CsrfGuard({
      getAllAndOverride: () => false,
    } as unknown as Reflector);

    expect(
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
    ).toBe(true);
  });

  it('rejects when the header token is missing', () => {
    const guard = new CsrfGuard({
      getAllAndOverride: () => false,
    } as unknown as Reflector);

    expect(() =>
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
    ).toThrow('CSRF token missing');
  });
});
