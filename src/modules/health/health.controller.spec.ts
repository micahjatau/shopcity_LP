import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps readiness failures to 503 and logs dependency diagnostics', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const controller = new HealthController(
      {
        check: () =>
          Promise.reject(
            new ServiceUnavailableException({
              error: {
                database: { status: 'down', message: 'postgres unavailable' },
                redis: { status: 'down', message: 'redis unavailable' },
              },
              details: {
                database: { status: 'down', message: 'postgres unavailable' },
                redis: { status: 'down', message: 'redis unavailable' },
              },
            }),
          ),
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

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'database=status=down message=postgres unavailable',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('redis=status=down message=redis unavailable'),
    );
  });
});
