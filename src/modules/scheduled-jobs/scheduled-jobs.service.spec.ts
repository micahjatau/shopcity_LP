import { ConfigService } from '@nestjs/config';
import {
  ScheduledJobsService,
  type ScheduledFlowId,
} from './scheduled-jobs.service';

const SCHEDULED_FLOWS: readonly ScheduledFlowId[] = [
  'F0',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
];

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

  it.each(SCHEDULED_FLOWS)(
    'dispatches %s through its bounded flow adapter and records completion',
    async (flow) => {
      const running = {
        ...completed,
        id: `run-${flow}`,
        flow,
        idempotencyKey: `preview:${flow}:matrix`,
        status: 'RUNNING',
        finishedAt: null,
        result: null,
      };
      const completedRun = {
        ...running,
        status: 'COMPLETED',
        finishedAt: new Date(),
        result: { flow, counters: {} },
      };
      const queryRaw = jest.fn().mockResolvedValue([]);
      const tx = { $queryRaw: queryRaw };
      const transaction = jest
        .fn()
        .mockImplementation(
          async (callback: (transaction: typeof tx) => Promise<unknown>) =>
            callback(tx),
        );
      const executeRaw = jest.fn().mockResolvedValue(0);
      const prisma = {
        scheduledJobRun: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(running),
          update: jest.fn().mockResolvedValue(completedRun),
        },
        scheduledJobCursor: {
          create: jest.fn().mockResolvedValue({}),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        tenant: { findMany: jest.fn().mockResolvedValue([{ id: 'tenant-1' }]) },
        $transaction: transaction,
        $executeRaw: executeRaw,
      };
      const creditExpiry = {
        expireDueCredit: jest.fn().mockResolvedValue({
          examined: 1,
          expiredLots: 1,
          expiredAmountKobo: 100n,
        }),
      };
      const reminder = {
        enqueueDueReminders: jest.fn().mockResolvedValue({
          customers: 1,
          amountKobo: 100n,
        }),
      };
      const outbox = {
        processBatch: jest.fn().mockResolvedValue({ claimed: 0 }),
        processAllBatches: jest.fn().mockResolvedValue({ claimed: 0 }),
        pollDeliveryReportsOnce: jest.fn().mockResolvedValue(0),
      };
      const reports = {
        recordPilotOperationsSnapshot: jest.fn().mockResolvedValue(undefined),
      };
      const materializer = {
        rebuildTenant: jest
          .fn<Promise<void>, [string, { materializedAt?: Date; asOf?: Date }]>()
          .mockResolvedValue(undefined),
      };
      const service = new ScheduledJobsService(
        prisma as never,
        {
          get: jest.fn((key: string, fallback?: unknown) =>
            key === 'SCHEDULER_ENVIRONMENT' ? 'preview' : fallback,
          ),
        } as unknown as ConfigService,
        {} as never,
        creditExpiry as never,
        reminder as never,
        outbox as never,
        reports as never,
        materializer as never,
      );

      const result = await service.run(flow, running.idempotencyKey);

      expect(result.status).toBe('COMPLETED');
      expect(result.result).toEqual({ flow, counters: {} });
      switch (flow) {
        case 'F0':
          expect(transaction).toHaveBeenCalledTimes(1);
          break;
        case 'F1':
          expect(creditExpiry.expireDueCredit).toHaveBeenCalledTimes(1);
          break;
        case 'F2':
          expect(reminder.enqueueDueReminders).toHaveBeenCalledTimes(1);
          break;
        case 'F3':
          expect(outbox.processBatch).toHaveBeenCalledWith('sms.send');
          break;
        case 'F4':
          expect(outbox.processBatch).toHaveBeenCalledWith('fraud.evaluate');
          break;
        case 'F5':
          expect(outbox.processBatch).toHaveBeenCalledWith('report.refresh');
          break;
        case 'F6':
          expect(outbox.pollDeliveryReportsOnce).toHaveBeenCalledTimes(1);
          break;
        case 'F7': {
          const rebuildCall = materializer.rebuildTenant.mock.calls[0];
          expect(rebuildCall?.[0]).toBe('tenant-1');
          expect(rebuildCall?.[1]?.asOf).toBeInstanceOf(Date);
          const cursorCreateMock = prisma.scheduledJobCursor
            .create as unknown as jest.Mock<
            unknown,
            [
              {
                data: {
                  jobKey: string;
                  cursor: string | null;
                  leaseToken: string;
                  leaseExpiresAt: Date;
                };
              },
            ]
          >;
          const leaseExpiresAt =
            cursorCreateMock.mock.calls[0]?.[0].data.leaseExpiresAt;
          expect(leaseExpiresAt).toBeInstanceOf(Date);
          const leaseRemainingMs = leaseExpiresAt.getTime() - Date.now();
          expect(leaseRemainingMs).toBeGreaterThan(6 * 60_000);
          expect(leaseRemainingMs).toBeLessThanOrEqual(7 * 60_000);
          break;
        }
        case 'F8':
          expect(reports.recordPilotOperationsSnapshot).toHaveBeenCalledWith(
            'tenant-1',
            expect.any(Date),
          );
          break;
        case 'F9':
          expect(executeRaw).toHaveBeenCalledTimes(1);
          break;
        case 'F10':
          expect(outbox.processAllBatches).toHaveBeenCalledTimes(1);
          break;
      }
    },
  );
});
