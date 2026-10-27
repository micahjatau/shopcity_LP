import { randomUUID } from 'node:crypto';
import {
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
  BranchStatus,
} from '@prisma/client';

const REQUIRED_DATABASE = 'shopcity_profiles_local_20260929';
const REQUIRED_PORT = '55422';
const REQUIRED_HOSTS = new Set(['127.0.0.1', 'localhost']);
const DEMO_DAYS = 30;
const prisma = new PrismaClient();

function assertLocalTarget(databaseUrl: string | undefined): void {
  if (process.env.SHOPCITY_LOCAL_REPORT_DEMO !== '1') {
    throw new Error(
      'Set SHOPCITY_LOCAL_REPORT_DEMO=1 to enable local demo seeding.',
    );
  }
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL must explicitly target the active local API database.',
    );
  }

  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const databaseName = target.pathname.replace(/^\//, '').split('?')[0];
  if (target.protocol !== 'postgresql:' && target.protocol !== 'postgres:') {
    throw new Error('Only a local PostgreSQL database can receive demo data.');
  }
  if (
    !REQUIRED_HOSTS.has(target.hostname) ||
    target.port !== REQUIRED_PORT ||
    databaseName !== REQUIRED_DATABASE
  ) {
    throw new Error(
      `Refusing to seed a non-local database; expected ${REQUIRED_HOSTS.values().next().value}:${REQUIRED_PORT}/${REQUIRED_DATABASE}.`,
    );
  }
}

function businessDate(today: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(today);
  const get = (name: string) =>
    parts.find((part) => part.type === name)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateAtUtcStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function shiftDate(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta, 12))
    .toISOString()
    .slice(0, 10);
}

function monthAfter(day: string, delta: number): string {
  const [year, month] = day.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function seed(): Promise<void> {
  assertLocalTarget(process.env.DATABASE_URL);

  const branches = await prisma.branch.findMany({
    where: { status: BranchStatus.ACTIVE },
    select: { id: true, tenantId: true, timezone: true },
  });
  if (branches.length !== 1) {
    throw new Error(
      'Expected exactly one active branch in the local API database.',
    );
  }
  const branch = branches[0];

  const [supervisor, cashier, customers] = await Promise.all([
    prisma.user.findFirst({
      where: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        role: UserRole.SUPERVISOR,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        role: UserRole.CASHIER,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.customer.findMany({
      where: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        status: 'ACTIVE',
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    }),
  ]);
  if (!supervisor || !cashier || customers.length < 2) {
    throw new Error(
      'Local demo prerequisites missing: active Supervisor, Cashier, and two branch customers are required.',
    );
  }

  const [
    financial,
    cashiers,
    customerSnapshots,
    liabilities,
    redemptions,
    sms,
    states,
  ] = await Promise.all([
    prisma.reportDailyFinancialSummary.count(),
    prisma.reportCashierDailySummary.count(),
    prisma.reportCustomerSnapshot.count(),
    prisma.reportLiabilityBucket.count(),
    prisma.reportRedemptionDailySummary.count(),
    prisma.reportSmsDailySummary.count(),
    prisma.reportMaterializationState.count(),
  ]);
  const existingRows =
    financial +
    cashiers +
    customerSnapshots +
    liabilities +
    redemptions +
    sms +
    states;
  if (existingRows > 0) {
    throw new Error(
      `Found ${existingRows} existing report rows/state records; refusing to mix demo fixtures with materialized data.`,
    );
  }

  const today = businessDate(new Date());
  const generatedAt = new Date();
  let outstandingKobo = 150_000_000n;
  const daily: Array<{
    date: Date;
    day: string;
    purchase: bigint;
    issued: bigint;
    redeemed: bigint;
    expired: bigint;
    outstanding: bigint;
    transactionCount: number;
  }> = [];

  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = shiftDate(today, -daysAgo);
    const date = dateAtUtcStart(day);
    const purchase = 27_000_000n + BigInt((daysAgo * 1_300_000) % 12_000_000);
    const issued = (purchase * 500n) / 10_000n;
    const redeemed =
      daysAgo % 3 === 0 ? 900_000n + BigInt((daysAgo % 4) * 125_000) : 0n;
    const expired = daysAgo % 10 === 0 ? 75_000n : 0n;
    outstandingKobo += issued - redeemed - expired;
    daily.push({
      date,
      day,
      purchase,
      issued,
      redeemed,
      expired,
      outstanding: outstandingKobo,
      transactionCount: 3 + (daysAgo % 4),
    });
  }

  const financialRows: Prisma.ReportDailyFinancialSummaryCreateManyInput[] =
    daily.map((row) => ({
      id: randomUUID(),
      tenantId: branch.tenantId,
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
      reportDate: row.date,
      registeredCustomers: customers.length,
      activeCustomers: customers.length,
      transactionCount: row.transactionCount,
      loyaltyPurchaseValueKobo: row.purchase,
      creditIssuedKobo: row.issued,
      creditRedeemedKobo: row.redeemed,
      creditExpiredKobo: row.expired,
      outstandingLiabilityKobo: row.outstanding,
      materializedAt: generatedAt,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }));

  const cashierRows: Prisma.ReportCashierDailySummaryCreateManyInput[] =
    daily.map((row, index) => ({
      id: randomUUID(),
      tenantId: branch.tenantId,
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
      cashierId: cashier.id,
      reportDate: row.date,
      transactionCount: row.transactionCount,
      purchaseValueKobo: row.purchase,
      creditIssuedKobo: row.issued,
      redemptionCount: row.redeemed > 0n ? 1 : 0,
      redemptionValueKobo: row.redeemed,
      duplicateAttempts: index % 11 === 0 ? 1 : 0,
      reversalCount: 0,
      approvalRequests: index % 9 === 0 ? 1 : 0,
      fraudFlagCount: 0,
      materializedAt: generatedAt,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }));

  const customerRows: Prisma.ReportCustomerSnapshotCreateManyInput[] =
    daily.flatMap((row, dayIndex) =>
      customers.map((customer, customerIndex) => {
        const balanceShare = row.outstanding / BigInt(customers.length);
        const balanceRemainder = row.outstanding % BigInt(customers.length);
        const purchaseShare = row.purchase / BigInt(customers.length);
        const purchaseRemainder = row.purchase % BigInt(customers.length);
        return {
          id: randomUUID(),
          tenantId: branch.tenantId,
          scope: 'BRANCH',
          scopeKey: branch.id,
          branchId: branch.id,
          customerId: customer.id,
          reportDate: row.date,
          purchaseValueKobo:
            purchaseShare +
            (BigInt(customerIndex) < purchaseRemainder ? 1n : 0n),
          currentBalanceKobo:
            balanceShare + (BigInt(customerIndex) < balanceRemainder ? 1n : 0n),
          visitCount: 1 + ((dayIndex + customerIndex) % 3),
          lastActivityAt: new Date(row.date.getTime() + 12 * 60 * 60 * 1000),
          dormant: false,
          materializedAt: generatedAt,
          createdAt: generatedAt,
          updatedAt: generatedAt,
        };
      }),
    );

  const liabilityRows: Prisma.ReportLiabilityBucketCreateManyInput[] =
    daily.flatMap((row, index) => {
      const firstBucket = row.outstanding / 2n;
      return [
        {
          id: randomUUID(),
          tenantId: branch.tenantId,
          scope: 'BRANCH',
          scopeKey: branch.id,
          branchId: branch.id,
          reportDate: row.date,
          expiryMonth: monthAfter(row.day, 1),
          ageBucket: '0-30',
          customerCount: customers.length,
          lotCount: 2 + (index % 3),
          outstandingKobo: firstBucket,
          materializedAt: generatedAt,
          createdAt: generatedAt,
          updatedAt: generatedAt,
        },
        {
          id: randomUUID(),
          tenantId: branch.tenantId,
          scope: 'BRANCH',
          scopeKey: branch.id,
          branchId: branch.id,
          reportDate: row.date,
          expiryMonth: monthAfter(row.day, 2),
          ageBucket: '31-60',
          customerCount: customers.length,
          lotCount: 1 + (index % 2),
          outstandingKobo: row.outstanding - firstBucket,
          materializedAt: generatedAt,
          createdAt: generatedAt,
          updatedAt: generatedAt,
        },
      ];
    });

  const redemptionRows: Prisma.ReportRedemptionDailySummaryCreateManyInput[] =
    daily.map((row) => ({
      id: randomUUID(),
      tenantId: branch.tenantId,
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
      reportDate: row.date,
      redemptionCount: row.redeemed > 0n ? 1 : 0,
      requestedKobo: row.redeemed > 0n ? row.redeemed + 100_000n : 0n,
      confirmedKobo: row.redeemed,
      reversedKobo: 0n,
      pendingApprovalCount: 0,
      basketRatioBps: row.redeemed > 0n ? 1_200 : 0,
      lotsConsumed: row.redeemed > 0n ? 1 : 0,
      allocationCount: row.redeemed > 0n ? 1 : 0,
      endingBalanceKobo: row.outstanding,
      approvedCount: row.redeemed > 0n ? 1 : 0,
      rejectedCount: 0,
      expiredApprovalCount: 0,
      materializedAt: generatedAt,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }));

  const smsRows: Prisma.ReportSmsDailySummaryCreateManyInput[] = daily.map(
    (row, index) => {
      const total = 2 + (index % 4);
      const failed = index % 5 === 0 ? 1 : 0;
      return {
        id: randomUUID(),
        tenantId: branch.tenantId,
        scope: 'BRANCH',
        scopeKey: branch.id,
        branchId: branch.id,
        reportDate: row.date,
        totalCount: total,
        queuedCount: 0,
        sentCount: total - failed,
        deliveredCount: total - failed,
        failedCount: failed,
        suppressedCount: 0,
        retryCount: failed,
        deadLetterCount: 0,
        costStatus: 'UNAVAILABLE',
        materializedAt: generatedAt,
        createdAt: generatedAt,
        updatedAt: generatedAt,
      };
    },
  );

  await prisma.$transaction(async (tx) => {
    await tx.reportDailyFinancialSummary.createMany({ data: financialRows });
    await tx.reportCashierDailySummary.createMany({ data: cashierRows });
    await tx.reportCustomerSnapshot.createMany({ data: customerRows });
    await tx.reportLiabilityBucket.createMany({ data: liabilityRows });
    await tx.reportRedemptionDailySummary.createMany({ data: redemptionRows });
    await tx.reportSmsDailySummary.createMany({ data: smsRows });
  });

  console.log(
    `Seeded synthetic report read models for local branch ${branch.id}: ${financialRows.length} financial, ${cashierRows.length} cashier, ${customerRows.length} customer, ${liabilityRows.length} liability, ${redemptionRows.length} redemption, and ${smsRows.length} SMS rows. No source transactions or ledger entries were created.`,
  );
}

assertLocalTarget(process.env.DATABASE_URL);
seed()
  .catch((error: unknown) => {
    console.error(
      'Local reports demo seed failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
