import { ConfigService } from '@nestjs/config';
import { ScheduledJobsService } from './scheduled-jobs.service';

describe('ScheduledJobsService', () => {
  const completed = {
    id: 'run-1',
    environment: 'preview',
    flow: 'F0',
    idempotencyKey: 'preview:F0:window-1',
    status: 'COMPLETED',
    startedAt: new Date('2026-11-15T00:00:00Z'),
    finishedAt: new Date('2026-11-15T00:00:01Z'),
    result: { flow: 'F0', counters: { expired: 2 } },
    failureCategory: null,
  };

  it('returns completed run evidence without repeating the domain action', async () => {
    const prisma = {
      scheduledJobRun: { findUnique: jest.fn().mockResolvedValue(completed) },
    };
    const audit = {};
    const creditExpiry = { expireDueCredit: jest.fn() };
    const reminder = { enqueueDueReminders: jest.fn() };
    const outbox = { processBatch: jest.fn() };
    const reports = { recordPilotOperationsSnapshot: jest.fn() };
    const materializer = { rebuildTenant: jest.fn() };
    const service = new ScheduledJobsService(
      prisma as never,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      audit as never,
      creditExpiry as never,
      reminder as never,
      outbox as never,
      reports as never,
      materializer as never,
    );

    await expect(service.run('F0', completed.idempotencyKey)).resolves.toBe(
      completed,
    );
    expect(prisma.scheduledJobRun.findUnique).toHaveBeenCalledWith({
      where: {
        environment_flow_idempotencyKey: {
          environment: 'preview',
          flow: 'F0',
          idempotencyKey: completed.idempotencyKey,
        },
      },
    });
    expect(creditExpiry.expireDueCredit).not.toHaveBeenCalled();
    expect(outbox.processBatch).not.toHaveBeenCalled();
  });

  it('preserves a failed invocation record when the same key is retried', async () => {
    const failed = {
      ...completed,
      status: 'FAILED',
      finishedAt: new Date('2026-11-15T00:00:02Z'),
      result: null,
      failureCategory: 'Error',
    };
    const prisma = {
      scheduledJobRun: {
        findUnique: jest.fn().mockResolvedValue(failed),
        updateMany: jest.fn(),
      },
    };
    const creditExpiry = { expireDueCredit: jest.fn() };
    const service = new ScheduledJobsService(
      prisma as never,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      creditExpiry as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.run('F0', failed.idempotencyKey)).resolves.toBe(
      failed,
    );
    expect(prisma.scheduledJobRun.updateMany).not.toHaveBeenCalled();
    expect(creditExpiry.expireDueCredit).not.toHaveBeenCalled();
  });

  it('records unsupported flows as failed instead of reporting success', async () => {
    const created = { ...completed, status: 'RUNNING', result: null };
    const updateRun = jest
      .fn()
      .mockResolvedValue({ ...created, status: 'FAILED' });
    const prisma = {
      scheduledJobRun: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
        update: updateRun,
      },
    };
    const service = new ScheduledJobsService(
      prisma as never,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.run('F6', 'preview:F6:window-2');
    expect(result.status).toBe('FAILED');
    expect(updateRun).toHaveBeenCalledTimes(1);
  });
});
