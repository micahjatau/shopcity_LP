import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditService } from '../src/modules/audit/audit.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import type { AuthContext } from '../src/common/auth/session.types';
import { PrismaService } from '../src/database/prisma.service';
import { createRedisTestEnvironment } from './support/redis-testcontainer';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from '../src/jobs/outbox-worker.runtime';
import { ScriptedSmsProvider } from '../src/jobs/sms.provider';

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

    execSync('npx prisma db push --skip-generate', {
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
        where: { tenantId: fixture.tenant.id, aggregateId: response.receiptId },
        orderBy: { createdAt: 'desc' },
      });
      const smsMessage = await prisma.smsMessage.findUnique({
        where: {
          tenantId_receiptId: {
            tenantId: fixture.tenant.id,
            receiptId: response.receiptId,
          },
        },
      });

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
        const smsMessage = await prisma.smsMessage.findUnique({
          where: {
            tenantId_receiptId: {
              tenantId: fixture.tenant.id,
              receiptId: response.receiptId,
            },
          },
        });

        const outboxEvent = await prisma.outboxEvent.findFirst({
          where: { tenantId: fixture.tenant.id, aggregateId: response.receiptId },
          orderBy: { createdAt: 'desc' },
        });

        return smsMessage?.status === 'DELIVERED' && outboxEvent?.status === 'PUBLISHED';
      });

      const smsMessage = await prisma.smsMessage.findUnique({
        where: {
          tenantId_receiptId: {
            tenantId: fixture.tenant.id,
            receiptId: response.receiptId,
          },
        },
      });

      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { tenantId: fixture.tenant.id, aggregateId: response.receiptId },
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

  it('records sms delivery failure when the provider rejects a message', async () => {
    const redisEnv = await createRedisTestEnvironment();
    const runtime = new OutboxWorkerRuntime(
      prisma,
      loadWorkerConfig({
        ...process.env,
        REDIS_URL: redisEnv.redisUrl,
      }),
      new ScriptedSmsProvider(async () => ({
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
        const smsMessage = await prisma.smsMessage.findUnique({
          where: {
            tenantId_receiptId: {
              tenantId: fixture.tenant.id,
              receiptId: response.receiptId,
            },
          },
        });

        return smsMessage?.status === 'FAILED';
      });

      const smsMessage = await prisma.smsMessage.findUnique({
        where: {
          tenantId_receiptId: {
            tenantId: fixture.tenant.id,
            receiptId: response.receiptId,
          },
        },
      });

      expect(smsMessage?.status).toBe('FAILED');
      expect(smsMessage?.lastError).toContain('provider offline');
    } finally {
      await runtime.stop();
      await redisEnv.close();
    }
  }, 120000);
});

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
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      branchId: branch.id,
      name: `Device ${suffix}`,
      fingerprintHash: `fingerprint-${suffix}`,
      status: 'ACTIVE',
    },
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
