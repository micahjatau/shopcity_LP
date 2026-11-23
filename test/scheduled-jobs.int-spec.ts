import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaService } from '../src/database/prisma.service';
import { ScheduledJobsService } from '../src/modules/scheduled-jobs/scheduled-jobs.service';

describe('scheduled job persistence (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    prisma = new PrismaService();
    await prisma.$connect();
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120_000);

  it('protects internal scheduler tables with RLS and no user-facing policies', async () => {
    const security = await prisma.$queryRaw<
      Array<{
        table_name: string;
        rls_enabled: boolean;
        policy_count: number;
      }>
    >`
      SELECT
        table_row.relname AS table_name,
        table_row.relrowsecurity AS rls_enabled,
        COUNT(policy.oid)::int AS policy_count
      FROM pg_class AS table_row
      JOIN pg_namespace AS schema_row ON schema_row.oid = table_row.relnamespace
      LEFT JOIN pg_policy AS policy ON policy.polrelid = table_row.oid
      WHERE schema_row.nspname = 'public'
        AND table_row.relname IN ('ScheduledJobRun', 'ScheduledJobCursor')
      GROUP BY table_row.relname, table_row.relrowsecurity
    `;

    expect(security).toEqual(
      expect.arrayContaining([
        {
          table_name: 'ScheduledJobRun',
          rls_enabled: true,
          policy_count: 0,
        },
        {
          table_name: 'ScheduledJobCursor',
          rls_enabled: true,
          policy_count: 0,
        },
      ]),
    );
  });

  it('serializes overlapping report sweeps with a durable cursor lease', async () => {
    await prisma.tenant.create({ data: { name: `scheduler-${randomUUID()}` } });
    let rebuildCount = 0;
    const materializer = {
      rebuildTenant: jest.fn(async () => {
        rebuildCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }),
    };
    const service = new ScheduledJobsService(
      prisma,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      materializer as never,
    );

    const [first, second] = await Promise.all([
      service.run('F7', `preview:F7:${randomUUID()}`),
      service.run('F7', `preview:F7:${randomUUID()}`),
    ]);

    expect(first.status).toBe('COMPLETED');
    expect(second.status).toBe('COMPLETED');
    expect(rebuildCount).toBe(1);
    expect(materializer.rebuildTenant).toHaveBeenCalledTimes(1);
    const cursor = await prisma.scheduledJobCursor.findUniqueOrThrow({
      where: { jobKey: 'report-materialization' },
    });
    expect(cursor.cursor).toBeTruthy();
    expect(cursor.leaseToken).toBeNull();
  });

  it('records a failed report tenant without advancing its cursor or leaking errors', async () => {
    const cursorBefore = await prisma.scheduledJobCursor.findUnique({
      where: { jobKey: 'report-materialization' },
    });
    const tenant = await prisma.tenant.create({
      data: { name: `materialize-failure-${randomUUID()}` },
    });
    const materializer = {
      rebuildTenant: jest
        .fn()
        .mockRejectedValue(new Error('sensitive provider detail')),
    };
    const service = new ScheduledJobsService(
      prisma,
      {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'SCHEDULER_ENVIRONMENT' ? 'preview' : undefined,
          ),
      } as unknown as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      materializer as never,
    );

    const run = await service.run('F7', `preview:F7:${randomUUID()}`);

    expect(run.status).toBe('FAILED');
    expect(run.failureCategory).toBe('ScheduledJobExecutionFailure');
    expect(run.result).toEqual({
      flow: 'F7',
      failedTenantId: tenant.id,
      failureCategory: 'Error',
    });
    expect(JSON.stringify(run.result)).not.toContain(
      'sensitive provider detail',
    );
    expect(materializer.rebuildTenant).toHaveBeenCalledTimes(1);
    const cursor = await prisma.scheduledJobCursor.findUniqueOrThrow({
      where: { jobKey: 'report-materialization' },
    });
    expect(cursor.cursor).toBe(cursorBefore?.cursor ?? null);
    expect(cursor.leaseToken).toBeNull();
  });

  it('prunes pilot history in a configured bounded batch', async () => {
    const tenant = await prisma.tenant.create({
      data: { name: `prune-${randomUUID()}` },
    });
    const oldCapturedAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    await prisma.pilotOperationsSnapshot.createMany({
      data: Array.from({ length: 3 }, (_, index) => ({
        tenantId: tenant.id,
        bucketStart: new Date(oldCapturedAt.getTime() + index * 60 * 60 * 1000),
        capturedAt: oldCapturedAt,
        outboxBacklogCount: 0,
        outboxStaleCount: 0,
        smsFailedCount: 0,
        offlineSyncFailureCount: 0,
        fraudOpenCount: 0,
        staleReportCount: 0,
        reconciliationHealthy: true,
        reconciliationMismatchCount: 0,
      })),
    });
    const service = new ScheduledJobsService(
      prisma,
      {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'SCHEDULER_ENVIRONMENT' ? 'preview' : 2,
          ),
      } as unknown as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const run = await service.run('F9', `preview:F9:${randomUUID()}`);

    expect(run.status).toBe('COMPLETED');
    expect(run.result).toMatchObject({ counters: { pruned: 2 } });
    expect(
      await prisma.pilotOperationsSnapshot.count({
        where: { tenantId: tenant.id },
      }),
    ).toBe(1);
  });

  it('keeps the scheduled invocation idempotency key unique by environment and flow', async () => {
    const idempotencyKey = `preview:F0:${randomUUID()}`;
    const created = await prisma.scheduledJobRun.create({
      data: {
        environment: 'preview',
        flow: 'F0',
        idempotencyKey,
        status: 'COMPLETED',
      },
    });
    await expect(
      prisma.scheduledJobRun.create({
        data: {
          environment: 'preview',
          flow: 'F0',
          idempotencyKey,
          status: 'RUNNING',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(created.status).toBe('COMPLETED');
  });

  it('executes a concurrent duplicate invocation key once', async () => {
    let signalEntered!: () => void;
    let releaseWork!: () => void;
    const entered = new Promise<void>((resolve) => {
      signalEntered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseWork = resolve;
    });
    const expireDueCredit = jest.fn(async () => {
      signalEntered();
      await gate;
      return { examined: 1, expiredLots: 1, expiredAmountKobo: 250n };
    });
    const service = new ScheduledJobsService(
      prisma,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      { expireDueCredit } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const key = `preview:F1:${randomUUID()}`;
    const first = service.run('F1', key);
    await entered;

    const concurrent = await service.run('F1', key);
    expect(concurrent.status).toBe('RUNNING');
    expect(expireDueCredit).toHaveBeenCalledTimes(1);
    releaseWork();

    await expect(first).resolves.toMatchObject({ status: 'COMPLETED' });
    expect(
      await prisma.scheduledJobRun.count({
        where: { environment: 'preview', flow: 'F1', idempotencyKey: key },
      }),
    ).toBe(1);
    expect(expireDueCredit).toHaveBeenCalledTimes(1);
  });

  it('reclaims an invocation stranded in RUNNING after the stale-run window', async () => {
    const key = `preview:F1:${randomUUID()}`;
    const staleStartedAt = new Date(Date.now() - 11 * 60_000);
    await prisma.scheduledJobRun.create({
      data: {
        environment: 'preview',
        flow: 'F1',
        idempotencyKey: key,
        status: 'RUNNING',
        startedAt: staleStartedAt,
      },
    });
    const expireDueCredit = jest.fn().mockResolvedValue({
      examined: 1,
      expiredLots: 1,
      expiredAmountKobo: 250n,
    });
    const service = new ScheduledJobsService(
      prisma,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      { expireDueCredit } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.run('F1', key);
    const persisted = await prisma.scheduledJobRun.findUniqueOrThrow({
      where: {
        environment_flow_idempotencyKey: {
          environment: 'preview',
          flow: 'F1',
          idempotencyKey: key,
        },
      },
    });

    expect(result.status).toBe('COMPLETED');
    expect(persisted.startedAt.getTime()).toBeGreaterThan(
      staleStartedAt.getTime(),
    );
    expect(persisted.finishedAt).not.toBeNull();
    expect(expireDueCredit).toHaveBeenCalledTimes(1);
  });

  it('reclaims an expired cursor lease and releases it after F7 succeeds', async () => {
    await prisma.scheduledJobCursor.upsert({
      where: { jobKey: 'report-materialization' },
      create: {
        jobKey: 'report-materialization',
        cursor: null,
        leaseToken: 'expired-lease-token',
        leaseExpiresAt: new Date(Date.now() - 1_000),
      },
      update: {
        leaseToken: 'expired-lease-token',
        leaseExpiresAt: new Date(Date.now() - 1_000),
      },
    });
    const rebuildTenant = jest
      .fn<Promise<void>, [string, { materializedAt?: Date; asOf?: Date }]>()
      .mockResolvedValue(undefined);
    const service = new ScheduledJobsService(
      prisma,
      { get: jest.fn().mockReturnValue('preview') } as unknown as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { rebuildTenant } as never,
    );

    const result = await service.run('F7', `preview:F7:${randomUUID()}`);
    const cursor = await prisma.scheduledJobCursor.findUniqueOrThrow({
      where: { jobKey: 'report-materialization' },
    });

    expect(result.status).toBe('COMPLETED');
    expect(rebuildTenant).toHaveBeenCalledTimes(1);
    expect(cursor.cursor).toBe(rebuildTenant.mock.calls[0]?.[0]);
    expect(cursor.leaseToken).toBeNull();
    expect(cursor.leaseExpiresAt).toBeNull();
  });
});
