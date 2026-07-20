import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestThrottleGuard } from './request-throttle.guard';
import { RequestThrottleService } from './request-throttle.service';

describe('RequestThrottleGuard', () => {
  it('rejects requests after the configured limit', () => {
    const reflector = {
      getAllAndOverride: () => ({
        bucket: 'auth.login',
        limit: 1,
        windowMs: 60_000,
        keyFactory: () => '127.0.0.1:admin@shopcity.local',
      }),
    } as unknown as Reflector;
    const guard = new RequestThrottleGuard(
      reflector,
      new RequestThrottleService(),
    );
    const context = executionContextStub();

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(() => guard.canActivate(context)).toThrow('Too many requests');
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
