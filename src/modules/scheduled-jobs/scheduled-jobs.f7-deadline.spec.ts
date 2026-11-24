import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { performance } from 'node:perf_hooks';
import { ScheduledJobsService } from './scheduled-jobs.service';

describe('ScheduledJobsService F7 execution deadline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops before starting a tenant when the remaining budget is unsafe', async () => {
    const { prisma, service, rebuildTenant } = createF7Harness(30_000);

    const result = await service.run('F7', 'local:F7:early-stop', 0);

    expect(result.status).toBe('COMPLETED');
    expect(result.result).toMatchObject({
      flow: 'F7',
      counters: {
        skipped: true,
        reason: 'execution-deadline',
        executionBudgetMs: 30_000,
        cursor: null,
      },
    });
    expect(prisma.scheduledJobCursor.create).not.toHaveBeenCalled();
    expect(rebuildTenant).not.toHaveBeenCalled();
  });

  it('keeps the cursor on the tenant when the deadline expires and resumes it later', async () => {
    let monotonicNow = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => monotonicNow);
    const { prisma, service, rebuildTenant } = createF7Harness(40_000);
    rebuildTenant
      .mockImplementationOnce(() => {
        monotonicNow = 36_000;
        return Promise.resolve();
      })
      .mockResolvedValueOnce(undefined);

    const expired = await service.run('F7', 'local:F7:deadline', 0);

    expect(expired.status).toBe('FAILED');
    expect(expired.failureCategory).toBe('ScheduledJobDeadlineExceeded');
    expect(expired.result).toMatchObject({
      flow: 'F7',
      failedTenantId: 'tenant-1',
      failureCategory: 'ExecutionDeadlineExceeded',
    });
    const rebuiltTenantArgs = rebuildTenant.mock.calls[0];
    expect(rebuiltTenantArgs?.[0]).toBe('tenant-1');
    expect(rebuiltTenantArgs?.[1].asOf).toBeInstanceOf(Date);
    expect(
      prisma.scheduledJobCursor.updateMany.mock.calls.filter(([args]) =>
        Object.hasOwn(args.data, 'cursor'),
      ),
    ).toHaveLength(0);
    expect(
      prisma.scheduledJobCursor.updateMany.mock.calls.filter(
        ([args]) => args.data.leaseToken === null,
      ),
    ).toHaveLength(1);

    monotonicNow = 40_000;
    const resumed = await service.run('F7', 'local:F7:retry', 40_000);

    expect(resumed.status).toBe('COMPLETED');
    expect(rebuildTenant).toHaveBeenCalledTimes(2);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { gt: 'tenant-0' } } }),
    );
    expect(
      prisma.scheduledJobCursor.updateMany.mock.calls.filter(([args]) =>
        Object.hasOwn(args.data, 'cursor'),
      ),
    ).toHaveLength(1);
    expect(
      prisma.scheduledJobCursor.updateMany.mock.calls.filter(
        ([args]) => args.data.leaseToken === null,
      ),
    ).toHaveLength(2);
  });
});

function createF7Harness(executionBudgetMs: number) {
  const runRecord = {
    id: 'run-f7',
    environment: 'local',
    flow: 'F7',
    idempotencyKey: 'local:F7:run',
    status: 'RUNNING',
    startedAt: new Date(),
    finishedAt: null,
    result: null,
    failureCategory: null,
  };
  const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
    'Unique conflict',
    { code: 'P2002', clientVersion: 'test' },
  );
  type CursorUpdateArgs = {
    where: { jobKey: string; leaseToken?: string };
    data: {
      cursor?: string | null;
      leaseToken?: string | null;
      leaseExpiresAt?: Date | null;
    };
  };
  const cursorUpdateMany = jest
    .fn<Promise<{ count: number }>, [CursorUpdateArgs]>()
    .mockResolvedValue({ count: 1 });
  const prisma = {
    scheduledJobRun: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(runRecord),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...runRecord, ...data }),
        ),
    },
    scheduledJobCursor: {
      create: jest.fn().mockRejectedValue(uniqueConflict),
      updateMany: cursorUpdateMany,
      findUniqueOrThrow: jest.fn().mockResolvedValue({ cursor: 'tenant-0' }),
    },
    tenant: { findMany: jest.fn().mockResolvedValue([{ id: 'tenant-1' }]) },
  };
  const rebuildTenant = jest
    .fn<Promise<void>, [string, Record<string, Date>]>()
    .mockResolvedValue(undefined);
  const service = new ScheduledJobsService(
    prisma as never,
    {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'SCHEDULER_ENVIRONMENT') return 'local';
        if (key === 'SCHEDULED_F7_EXECUTION_BUDGET_MS')
          return executionBudgetMs;
        return fallback;
      }),
    } as unknown as ConfigService,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { rebuildTenant } as never,
  );

  return { prisma, service, rebuildTenant };
}
