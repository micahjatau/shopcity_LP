import type { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { OutboxProcessingService } from './outbox-processing.service';
import { OutboxProcessingCronController } from './outbox-processing-cron.controller';

describe('OutboxProcessingCronController', () => {
  const batchResult = {
    claimed: 2,
    completed: 1,
    retried: 1,
    deadLettered: 0,
  };

  function setup(secret?: string) {
    const processBatch = jest.fn().mockResolvedValue(batchResult);
    const controller = new OutboxProcessingCronController(
      { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService,
      { processBatch } as unknown as OutboxProcessingService,
    );
    return { controller, processBatch };
  }

  it('fails closed when CRON_SECRET is missing', async () => {
    const { controller, processBatch } = setup();

    await expect(controller.run('Bearer anything')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(processBatch).not.toHaveBeenCalled();
  });

  it('rejects invalid authorization before claiming events', async () => {
    const { controller, processBatch } = setup('expected-secret');

    await expect(controller.run('Bearer wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(processBatch).not.toHaveBeenCalled();
  });

  it('runs a bounded fraud batch after valid bearer authentication', async () => {
    const { controller, processBatch } = setup('expected-secret');

    await expect(controller.run('Bearer expected-secret')).resolves.toEqual({
      success: false,
      ...batchResult,
    });
    expect(processBatch).toHaveBeenCalledTimes(1);
  });
});
