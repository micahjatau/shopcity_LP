import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditService } from '../src/modules/audit/audit.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import { ReportMaterializerService } from '../src/modules/reports/report-materializer.service';
import { PrismaService } from '../src/database/prisma.service';
import { createAttestedDeviceData } from './support/device-attestation';

describe('report materialization (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let loyaltyService: LoyaltyService;
  let reportMaterializer: ReportMaterializerService;
  let tenant: { id: string };
  let branch: { id: string };
  let cashier: Awaited<ReturnType<typeof createStaffUser>>;
  let configValues: Record<string, number>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    process.env.DATABASE_URL = databaseUrl;

    prisma = new PrismaService();
    await prisma.$connect();

    tenant = await prisma.tenant.create({
      data: { id: randomUUID(), name: 'Reporting Tenant', status: 'ACTIVE' },
    });

    branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: 'Reporting Branch',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });

    cashier = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.CASHIER,
      'cashier@reporting.local',
    );

    configValues = {
      DEFAULT_EARN_RATE_BPS: 200,
      PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
      PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
      PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
    };
    const configService = { get: (key: string) => configValues[key] } as never;

    const auditService = new AuditService(prisma);
    loyaltyService = new LoyaltyService(prisma, auditService, configService);
    reportMaterializer = new ReportMaterializerService(
      prisma,
      new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' }),
    );
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('rebuilds report rows from authoritative source data', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-REPORT-0001',
    );

    const occurredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const earn = await loyaltyService.earn(
      tenant.id,
      makeContext(
        {
          id: cashier.id,
          tenantId: tenant.id,
          branchId: branch.id,
          role: UserRole.CASHIER,
        },
        fixture.device.id,
      ),
      'report-materialization-earn-1',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      },
    );

    await reportMaterializer.materializeTenant(tenant.id, {
      materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      asOf: new Date('2026-08-10T12:00:00.000Z'),
    });

    const summaryBefore = await prisma.reportDailyFinancialSummary.findMany({
      where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
    });
    const customerSnapshotBefore = await prisma.reportCustomerSnapshot.findMany(
      {
        where: {
          tenantId: tenant.id,
          scope: 'TENANT',
          scopeKey: tenant.id,
          customerId: fixture.customer.id,
        },
      },
    );
    const liabilityRowsBefore = await prisma.reportLiabilityBucket.findMany({
      where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
    });
    const smsRowsBefore = await prisma.reportSmsDailySummary.findMany({
      where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
    });
    const stateRowsBefore = await prisma.reportMaterializationState.findMany({
      where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
    });

    expect(summaryBefore).toHaveLength(0);
    expect(customerSnapshotBefore).toHaveLength(0);
    expect(liabilityRowsBefore).toHaveLength(0);
    expect(smsRowsBefore).toHaveLength(0);
    expect(stateRowsBefore).toHaveLength(1);
    expect(stateRowsBefore[0]).toMatchObject({
      status: 'COMPLETED',
      materializedAt: new Date('2026-08-10T12:00:00.000Z'),
    });

    await reportMaterializer.materializeTenant(tenant.id, {
      materializedAt: new Date('2026-08-20T21:00:00.000Z'),
      asOf: new Date('2026-08-20T21:00:00.000Z'),
    });

    const [summary, customerSnapshot, liabilityRows, smsRows, stateRows] =
      await Promise.all([
        prisma.reportDailyFinancialSummary.findMany({
          where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
        }),
        prisma.reportCustomerSnapshot.findMany({
          where: {
            tenantId: tenant.id,
            scope: 'TENANT',
            scopeKey: tenant.id,
            customerId: fixture.customer.id,
          },
        }),
        prisma.reportLiabilityBucket.findMany({
          where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
        }),
        prisma.reportSmsDailySummary.findMany({
          where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
        }),
        prisma.reportMaterializationState.findMany({
          where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
        }),
      ]);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      reportDate: new Date('2026-08-11T00:00:00.000Z'),
      registeredCustomers: 1,
      activeCustomers: 1,
      transactionCount: 1,
      loyaltyPurchaseValueKobo: BigInt(1_000_000),
      creditIssuedKobo: BigInt(20_000),
      creditRedeemedKobo: BigInt(0),
      outstandingLiabilityKobo: BigInt(20_000),
    });

    expect(customerSnapshot).toHaveLength(1);
    expect(customerSnapshot[0]).toMatchObject({
      purchaseValueKobo: BigInt(1_000_000),
      currentBalanceKobo: BigInt(20_000),
      visitCount: 1,
      dormant: false,
    });

    expect(liabilityRows).toHaveLength(1);
    expect(liabilityRows[0]?.outstandingKobo).toBe(BigInt(20_000));

    expect(smsRows).toHaveLength(1);
    expect(smsRows[0]).toMatchObject({
      queuedCount: 1,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      suppressedCount: 0,
    });

    expect(stateRows).toHaveLength(1);
    expect(stateRows[0]).toMatchObject({
      status: 'COMPLETED',
      materializedAt: new Date('2026-08-20T21:00:00.000Z'),
    });

    expect(
      await prisma.reportDailyFinancialSummary.count({
        where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
      }),
    ).toBe(1);
    expect(
      await prisma.reportCustomerSnapshot.count({
        where: {
          tenantId: tenant.id,
          scope: 'TENANT',
          scopeKey: tenant.id,
          customerId: fixture.customer.id,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.reportSmsDailySummary.count({
        where: { tenantId: tenant.id, scope: 'TENANT', scopeKey: tenant.id },
      }),
    ).toBe(1);

    expect(earn.creditKobo).toBe(20_000);
  }, 120000);
});

async function createStaffUser(
  prisma: PrismaService,
  tenantId: string,
  branchId: string,
  role: UserRole,
  username: string,
) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      username,
      role,
      status: 'ACTIVE',
    },
  });
}

async function createEarnFixture(
  prisma: PrismaService,
  tenantId: string,
  branchId: string,
  cashierId: string,
  receiptNumber: string,
) {
  const device = await prisma.device.create({
    data: createAttestedDeviceData({
      id: randomUUID(),
      tenantId,
      branchId,
      name: `Device-${receiptNumber}`,
      fingerprintHash: `fingerprint-${receiptNumber}`,
      status: 'ACTIVE',
    }),
  });

  const customer = await prisma.customer.create({
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      fullName: `Customer ${receiptNumber}`,
      phoneE164: `+23480123${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')}`,
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: cashierId,
    },
  });

  const card = await prisma.card.create({
    data: {
      id: randomUUID(),
      tenantId,
      customerId: customer.id,
      barcodeValue: `CARD-${receiptNumber}`,
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: cashierId,
    },
  });

  return {
    device,
    customer,
    card,
    posReceiptNumber: receiptNumber,
  };
}

function makeContext(
  user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    role: UserRole;
  },
  deviceId?: string,
): {
  session: {
    id: string;
    userId: string;
    deviceId: string | null;
    sessionTokenHash: string;
    csrfTokenHash: string;
    status: 'ACTIVE';
    expiresAt: Date;
    revokedAt: Date | null;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    username: string;
    role: UserRole;
    status: 'ACTIVE';
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    supabaseAuthId: string | null;
    tenant: null;
    branch: null;
  };
} {
  const now = new Date();

  return {
    session: {
      id: randomUUID(),
      userId: user.id,
      deviceId: deviceId ?? null,
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
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      username: `${user.role.toLowerCase()}@reporting.local`,
      role: user.role,
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
