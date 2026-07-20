import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestThrottleGuard } from './request-throttle.guard';

describe('RequestThrottleGuard', () => {
  it('rejects requests after the configured limit', async () => {
    const reflector = {
      getAllAndOverride: () => ({
        bucket: 'auth.login',
        limit: 1,
        windowMs: 60_000,
        keyFactory: () => [
          'login:ip:127.0.0.1',
          'login:account:admin@shopcity.local',
          'login:pair:127.0.0.1:admin@shopcity.local',
        ],
      }),
    } as unknown as Reflector;
    const throttleService = {
      consume: jest
        .fn()
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false })
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: true }),
    };
    const guard = new RequestThrottleGuard(reflector, throttleService as never);
    const context = executionContextStub();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toMatchObject(
      new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(throttleService.consume).toHaveBeenNthCalledWith(
      1,
      'auth.login:login:ip:127.0.0.1',
      1,
      60_000,
    );
    expect(throttleService.consume).toHaveBeenNthCalledWith(
      2,
      'auth.login:login:account:admin@shopcity.local',
      1,
      60_000,
    );
    expect(throttleService.consume).toHaveBeenNthCalledWith(
      3,
      'auth.login:login:pair:127.0.0.1:admin@shopcity.local',
      1,
      60_000,
    );
  });
});

function executionContextStub() {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        ip: '127.0.0.1',
        body: { username: 'admin@shopcity.local' },
        params: {},
      }),
    }),
  } as never;
}
