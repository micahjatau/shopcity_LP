import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditService } from '../src/modules/audit/audit.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import type { AuthContext } from '../src/common/auth/session.types';
import { PrismaService } from '../src/database/prisma.service';
import { createAttestedDeviceData } from './support/device-attestation';
import { createRedisTestEnvironment } from './support/redis-testcontainer';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from '../src/jobs/outbox-worker.runtime';
import {
  DeterministicSmsProvider,
  ScriptedSmsProvider,
} from '../src/jobs/sms.provider';
import { ReportMaterializerService } from '../src/modules/reports/report-materializer.service';

describe('outbox worker recovery (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let loyaltyService: LoyaltyService;
  let auditService: AuditService;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    prisma = new PrismaService();
    await prisma.$connect();

    auditService = new AuditService(prisma);
    const configService = {
      get: (key: string) => {
        const values: Record<string, number> = {
          DEFAULT_EARN_RATE_BPS: 200,
          PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
          PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
          PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
        };

        return values[key];
      },
    } as never;

    loyaltyService = new LoyaltyService(prisma, auditService, configService);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('keeps Redis empty until the worker publishes committed outbox rows', async () => {
    const redisEnv = await createRedisTestEnvironment();

    try {
      const fixture = await createEarnFixture(prisma, 'receipt-worker-1');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-1',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      expect(response.smsStatus).toBe('QUEUED');

      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: {
          tenantId: fixture.tenant.id,
          aggregateId: response.receiptId,
          eventType: 'sms.send',
        },
        orderBy: { createdAt: 'desc' },
      });
      const smsMessage = await findSmsMessageByReceipt(
        prisma,
        fixture.tenant.id,
        response.receiptId,
      );

      expect(outboxEvent?.status).toBe('PENDING');
      expect(smsMessage?.status).toBe('QUEUED');
      expect(await redisEnv.getKeys('*')).toEqual([]);
    } finally {
      await redisEnv.close();
    }
  }, 120000);

  it('publishes pending outbox rows and delivers sms after worker recovery', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
    );

    try {
      await runtime.start();

      const fixture = await createEarnFixture(prisma, 'receipt-worker-2');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-2',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        const outboxEvent = await prisma.outboxEvent.findFirst({
          where: {
            tenantId: fixture.tenant.id,
            aggregateId: response.receiptId,
            eventType: 'sms.send',
          },
          orderBy: { createdAt: 'desc' },
        });

        return (
          smsMessage?.status === 'DELIVERED' &&
          outboxEvent?.status === 'PUBLISHED'
        );
      });

      const smsMessage = await findSmsMessageByReceipt(
        prisma,
        fixture.tenant.id,
        response.receiptId,
      );

      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: {
          tenantId: fixture.tenant.id,
          aggregateId: response.receiptId,
          eventType: 'sms.send',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(smsMessage?.status).toBe('DELIVERED');
      expect(smsMessage?.providerMessageId).toBeDefined();
      expect(outboxEvent?.status).toBe('PUBLISHED');
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('recovers and completes durable report refresh work', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const reportMaterializer = new ReportMaterializerService(
      prisma,
      new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' }),
    );
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
      undefined,
      reportMaterializer,
    );

    try {
      const { tenant, branch, outboxEvent } = await createReportRefreshFixture(
        prisma,
        'durable',
      );

      await runtime.start();

      await waitFor(async () => {
        const [event, materializationState] = await Promise.all([
          prisma.outboxEvent.findUnique({
            where: {
              tenantId_id: { tenantId: tenant.id, id: outboxEvent.id },
            },
          }),
          prisma.reportMaterializationState.findUnique({
            where: {
              tenantId_scope_scopeKey: {
                tenantId: tenant.id,
                scope: 'TENANT',
                scopeKey: tenant.id,
              },
            },
          }),
        ]);

        return Boolean(
          event?.status === 'COMPLETED' &&
          event.processedAt &&
          materializationState?.status === 'COMPLETED',
        );
      });

      await prisma.outboxEvent.update({
        where: { tenantId_id: { tenantId: tenant.id, id: outboxEvent.id } },
        data: {
          status: 'PUBLISHED',
          processedAt: null,
          publishedAt: new Date(Date.now() - 120_000),
          nextAttemptAt: null,
        },
      });

      await waitFor(async () => {
        const event = await prisma.outboxEvent.findUnique({
          where: { tenantId_id: { tenantId: tenant.id, id: outboxEvent.id } },
        });

        return Boolean(event?.status === 'COMPLETED' && event.processedAt);
      }, 20000);

      const states = await prisma.reportMaterializationState.findMany({
        where: { tenantId: tenant.id },
      });
      expect(states).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scope: 'TENANT',
            scopeKey: tenant.id,
            status: 'COMPLETED',
          }),
          expect.objectContaining({
            scope: 'BRANCH',
            scopeKey: branch.id,
            status: 'COMPLETED',
          }),
        ]),
      );
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('excludes completed report refresh events from recovery', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const reportMaterializer = new ReportMaterializerService(
      prisma,
      new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' }),
    );
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
      undefined,
      reportMaterializer,
    );

    try {
      const { tenant, outboxEvent } = await createReportRefreshFixture(
        prisma,
        'completed-exclusion',
        {
          status: 'COMPLETED',
          processedAt: new Date(Date.now() - 5_000),
          nextAttemptAt: null,
        },
      );

      await runtime.start();
      await new Promise((resolve) => setTimeout(resolve, 1_000));

      const [event, materializationStates] = await Promise.all([
        prisma.outboxEvent.findUnique({
          where: { tenantId_id: { tenantId: tenant.id, id: outboxEvent.id } },
        }),
        prisma.reportMaterializationState.findMany({
          where: { tenantId: tenant.id },
        }),
      ]);

      expect(event).toMatchObject({
        status: 'COMPLETED',
        processedAt: outboxEvent.processedAt,
      });
      expect(materializationStates).toHaveLength(0);
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('excludes dead-lettered report refresh events from recovery', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const reportMaterializer = new ReportMaterializerService(
      prisma,
      new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' }),
    );
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
      undefined,
      reportMaterializer,
    );

    try {
      const deadLetteredAt = new Date(Date.now() - 5_000);
      const { tenant, outboxEvent } = await createReportRefreshFixture(
        prisma,
        'dead-lettered-exclusion',
        {
          status: 'FAILED',
          deadLetteredAt,
          nextAttemptAt: null,
        },
      );

      await runtime.start();
      await new Promise((resolve) => setTimeout(resolve, 1_000));

      const [event, materializationStates] = await Promise.all([
        prisma.outboxEvent.findUnique({
          where: { tenantId_id: { tenantId: tenant.id, id: outboxEvent.id } },
        }),
        prisma.reportMaterializationState.findMany({
          where: { tenantId: tenant.id },
        }),
      ]);

      expect(event).toMatchObject({
        status: 'FAILED',
        deadLetteredAt,
      });
      expect(materializationStates).toHaveLength(0);
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('recovers queued deliveries after a Redis outage and restart', async () => {
    const redisEnv = await createRedisTestEnvironment();
    let recoveryRuntime: OutboxWorkerRuntime | undefined;

    try {
      const fixture = await createEarnFixture(prisma, 'receipt-worker-redis');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-redis',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        const outboxEvent = await prisma.outboxEvent.findFirst({
          where: {
            tenantId: fixture.tenant.id,
            aggregateId: response.receiptId,
            eventType: 'sms.send',
          },
          orderBy: { createdAt: 'desc' },
        });

        return (
          smsMessage?.status === 'QUEUED' && outboxEvent?.status === 'PENDING'
        );
      });

      await redisEnv.restart();

      recoveryRuntime = new OutboxWorkerRuntime(
        prisma,
        loadWorkerConfig({
          ...process.env,
          REDIS_URL: redisEnv.redisUrl,
          OUTBOX_PUBLISH_INTERVAL_MS: '200',
          OUTBOX_RETRY_DELAY_MS: '1000',
        }),
        new DeterministicSmsProvider(),
      );
      await recoveryRuntime.start();

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        const outboxEvent = await prisma.outboxEvent.findFirst({
          where: {
            tenantId: fixture.tenant.id,
            aggregateId: response.receiptId,
            eventType: 'sms.send',
          },
          orderBy: { createdAt: 'desc' },
        });

        return (
          smsMessage?.status === 'DELIVERED' &&
          outboxEvent?.status === 'PUBLISHED'
        );
      }, 20000);

      const [smsMessage, outboxEvent] = await Promise.all([
        findSmsMessageByReceipt(prisma, fixture.tenant.id, response.receiptId),
        prisma.outboxEvent.findFirst({
          where: {
            tenantId: fixture.tenant.id,
            aggregateId: response.receiptId,
            eventType: 'sms.send',
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      expect(smsMessage?.status).toBe('DELIVERED');
      expect(outboxEvent?.status).toBe('PUBLISHED');
    } finally {
      await recoveryRuntime?.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('backfills missing sms rows for published outbox events', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
    );

    try {
      const fixture = await createEarnFixture(prisma, 'receipt-worker-2b');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-2b',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      await prisma.smsMessage.deleteMany({
        where: { tenantId: fixture.tenant.id, receiptId: response.receiptId },
      });

      await prisma.outboxEvent.updateMany({
        where: {
          tenantId: fixture.tenant.id,
          aggregateId: response.receiptId,
          eventType: 'sms.send',
        },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(Date.now() - 5 * 60 * 1000),
          nextAttemptAt: null,
        },
      });

      await runtime.start();

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        return smsMessage?.status === 'DELIVERED';
      });

      const smsMessage = await findSmsMessageByReceipt(
        prisma,
        fixture.tenant.id,
        response.receiptId,
      );

      expect(smsMessage?.outboxEventId).toBeDefined();
      expect(smsMessage?.status).toBe('DELIVERED');
      expect(smsMessage?.providerMessageId).toBeDefined();
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('keeps multi-worker recovery to one sms delivery per outbox event', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const runtimeA = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
    );
    const runtimeB = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new DeterministicSmsProvider(),
    );

    try {
      await Promise.all([runtimeA.start(), runtimeB.start()]);

      const fixture = await createEarnFixture(prisma, 'receipt-worker-2c');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-2c',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        return smsMessage?.status === 'DELIVERED';
      });

      const [smsCount, outboxCount] = await Promise.all([
        prisma.smsMessage.count({
          where: { tenantId: fixture.tenant.id, receiptId: response.receiptId },
        }),
        prisma.outboxEvent.count({
          where: {
            tenantId: fixture.tenant.id,
            aggregateId: response.receiptId,
            eventType: 'sms.send',
          },
        }),
      ]);

      expect([smsCount, outboxCount]).toEqual([1, 1]);
    } finally {
      await runtimeA.stop();
      await runtimeB.stop();
      await redisEnv.close();
    }
  }, 120000);

  it('records sms delivery failure when the provider rejects a message', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new ScriptedSmsProvider(() => ({
        status: 'FAILED',
        errorMessage: 'provider offline',
      })),
    );

    try {
      await runtime.start();

      const fixture = await createEarnFixture(prisma, 'receipt-worker-3');
      const response = await loyaltyService.earn(
        fixture.tenant.id,
        fixture.actor,
        'worker-earn-key-3',
        {
          posReceiptNumber: fixture.posReceiptNumber,
          cardSerialNumber: fixture.card.barcodeValue,
          purchaseAmountKobo: 1_000_000,
          occurredAt: recentOccurredAt(),
        },
      );

      await waitFor(async () => {
        const smsMessage = await findSmsMessageByReceipt(
          prisma,
          fixture.tenant.id,
          response.receiptId,
        );

        return smsMessage?.status === 'FAILED';
      });

      const smsMessage = await findSmsMessageByReceipt(
        prisma,
        fixture.tenant.id,
        response.receiptId,
      );

      expect(smsMessage?.status).toBe('FAILED');
      expect(smsMessage?.lastError).toContain('provider offline');
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);
});

async function findSmsMessageByReceipt(
  prismaService: PrismaService,
  tenantId: string,
  receiptId: string,
) {
  return prismaService.smsMessage.findFirst({
    where: { tenantId, receiptId },
    orderBy: { createdAt: 'desc' },
  });
}

async function createReportRefreshFixture(
  prismaService: PrismaService,
  suffix: string,
  eventOverrides: Partial<{
    status: 'PENDING' | 'FAILED' | 'PUBLISHED' | 'COMPLETED';
    processedAt: Date | null;
    publishedAt: Date | null;
    nextAttemptAt: Date | null;
    deadLetteredAt: Date | null;
  }> = {},
) {
  const tenant = await prismaService.tenant.create({
    data: {
      id: randomUUID(),
      name: `Report Refresh Tenant ${suffix}`,
      status: 'ACTIVE',
    },
  });

  const branch = await prismaService.branch.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: `Report Refresh Branch ${suffix}`,
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });

  const outboxEvent = await prismaService.outboxEvent.create({
    data: {
      tenantId: tenant.id,
      aggregateType: 'report',
      aggregateId: 'executive-summary',
      eventType: 'report.refresh',
      payload: {
        version: 1,
        report: 'executive-summary',
        branchId: null,
        timezone: 'Africa/Lagos',
      },
      status: eventOverrides.status ?? 'PENDING',
      processedAt: eventOverrides.processedAt,
      publishedAt: eventOverrides.publishedAt,
      nextAttemptAt:
        eventOverrides.nextAttemptAt ?? new Date(Date.now() - 1_000),
      deadLetteredAt: eventOverrides.deadLetteredAt ?? null,
    },
  });

  return { tenant, branch, outboxEvent };
}

async function createEarnFixture(prismaService: PrismaService, suffix: string) {
  const tenant = await prismaService.tenant.create({
    data: {
      id: randomUUID(),
      name: `Worker Tenant ${suffix}`,
      status: 'ACTIVE',
    },
  });

  const branch = await prismaService.branch.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: `Branch ${suffix}`,
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });

  const cashier = await prismaService.user.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      branchId: branch.id,
      username: `cashier.${suffix}@worker.local`,
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });

  const device = await prismaService.device.create({
    data: createAttestedDeviceData({
      id: randomUUID(),
      tenantId: tenant.id,
      branchId: branch.id,
      name: `Device ${suffix}`,
      fingerprintHash: `fingerprint-${suffix}`,
      status: 'ACTIVE',
    }),
  });

  const customer = await prismaService.customer.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      branchId: branch.id,
      fullName: `Customer ${suffix}`,
      phoneE164: `+23480123${suffix.replace(/\D/g, '').padStart(6, '0') || '000001'}`,
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenant.id,
      registeredBy: cashier.id,
    },
  });

  const card = await prismaService.card.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      customerId: customer.id,
      barcodeValue: `CARD-${suffix}`,
      status: 'ACTIVE',
      issuedByTenantId: tenant.id,
      issuedBy: cashier.id,
    },
  });

  return {
    tenant,
    branch,
    cashier,
    device,
    customer,
    card,
    posReceiptNumber: `POS-${suffix}`,
    actor: makeContext(cashier.id, tenant.id, branch.id, device.id),
  };
}

function makeContext(
  userId: string,
  tenantId: string,
  branchId: string,
  deviceId: string,
): AuthContext {
  const now = new Date();

  return {
    session: {
      id: randomUUID(),
      userId,
      deviceId,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: 'ACTIVE',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      revokedAt: null,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: userId,
      tenantId,
      branchId,
      username: 'cashier.worker.local',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      supabaseAuthId: null,
      tenant: null,
      branch: null,
    },
  };
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Timed out waiting for worker state change');
}

function recentOccurredAt(): string {
  return new Date(Date.now() - 60_000).toISOString();
}
