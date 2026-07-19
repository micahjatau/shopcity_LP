import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('maps readiness failures to 503', async () => {
    const controller = new HealthController(
      {
        check: () => Promise.reject(new Error('unavailable')),
      } as never,
      {
        pingCheck: () =>
          Promise.resolve({ status: 'up', database: 'postgresql' }),
      } as never,
      {
        pingCheck: () =>
          Promise.resolve({ status: 'up', redis: { status: 'up' } }),
      } as never,
      {
        pingCheck: () =>
          Promise.resolve({ status: 'up', api: { status: 'up' } }),
      } as never,
    );

    try {
      await controller.ready();
      throw new Error('Expected readiness to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    }
  });
});
