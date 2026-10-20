import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PosDeviceTokenKeyHealthIndicator } from './pos-device-token-key.health.indicator';

describe('HealthController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks token-only readiness unavailable when the HMAC key is missing', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const keyHealth = new PosDeviceTokenKeyHealthIndicator({
      get: (name: string) =>
        name === 'PILOT_CASHIER_DEVICE_TOKEN_ONLY' ? true : undefined,
    } as never);
    const healthCheckService = {
      check: async (checks: Array<() => Promise<unknown>>) => {
        const results = await Promise.all(checks.map((check) => check()));
        const keyStatus = (
          results[2] as {
            posDeviceTokenKey: { status: string; message?: string };
          }
        ).posDeviceTokenKey;
        if (keyStatus.status === 'down') {
          throw new ServiceUnavailableException({
            error: { posDeviceTokenKey: keyStatus },
            details: { posDeviceTokenKey: keyStatus },
          });
        }
        return { info: {} };
      },
    };
    const controller = new HealthController(
      healthCheckService as never,
      { pingCheck: jest.fn().mockResolvedValue({ status: 'up' }) } as never,
      { pingCheck: jest.fn().mockResolvedValue({ status: 'up' }) } as never,
      { pingCheck: jest.fn().mockResolvedValue({ status: 'up' }) } as never,
      keyHealth,
    );

    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid',
      ),
    );
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
      {
        check: () => Promise.resolve({ posDeviceTokenKey: { status: 'up' } }),
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
