import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  AdjustmentKind,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { LotAllocationService } from '../src/common/balance/lot-allocation.service';

describe('lot allocation ordering (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('allocates FIFO by expiry, earned-at, and id while ignoring ineligible lots', async () => {
    const fixture = await createFixture(prisma);
    const service = new LotAllocationService();

    const debitLedgerEntryId = randomUUID();
    const allocations = await prisma.$transaction(async (tx) => {
      const ledgerEntry = await tx.loyaltyLedgerEntry.create({
        data: {
          id: debitLedgerEntryId,
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          type: LedgerEntryType.ADJUSTMENT,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 420n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `debit-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      });

      await tx.adjustment.update({
        where: {
          tenantId_id: { tenantId: fixture.tenantId, id: fixture.adjustmentId },
        },
        data: { ledgerEntryId: ledgerEntry.id },
      });

      return service.allocateDebit(tx, {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        debitLedgerEntryId: ledgerEntry.id,
        adjustmentId: fixture.adjustmentId,
        amountKobo: 420n,
        now: new Date('2026-07-26T12:00:00.000Z'),
      });
    });

    expect(allocations).toEqual([
      {
        creditLotId: fixture.eligibleLots[0].id,
        amountKobo: 200n,
        allocationOrder: 1,
        expiresAt: fixture.eligibleLots[0].expiresAt,
      },
      {
        creditLotId: fixture.eligibleLots[1].id,
        amountKobo: 150n,
        allocationOrder: 2,
        expiresAt: fixture.eligibleLots[1].expiresAt,
      },
      {
        creditLotId: fixture.eligibleLots[2].id,
        amountKobo: 70n,
        allocationOrder: 3,
        expiresAt: fixture.eligibleLots[2].expiresAt,
      },
    ]);

    const mainTenantLots = await prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: {
          in: [
            fixture.eligibleLots[0].id,
            fixture.eligibleLots[1].id,
            fixture.eligibleLots[2].id,
            fixture.laterExpiryLot.id,
            fixture.expiredLot.id,
            fixture.otherCustomerLot.id,
          ],
        },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(mainTenantLots).toHaveLength(6);
    expect(mainTenantLots).toEqual(
      expect.arrayContaining([
        { id: fixture.expiredLot.id, remainingAmountKobo: 50n },
        { id: fixture.otherCustomerLot.id, remainingAmountKobo: 500n },
        { id: fixture.eligibleLots[0].id, remainingAmountKobo: 0n },
        { id: fixture.laterExpiryLot.id, remainingAmountKobo: 400n },
        { id: fixture.eligibleLots[1].id, remainingAmountKobo: 0n },
        { id: fixture.eligibleLots[2].id, remainingAmountKobo: 30n },
      ]),
    );

    const otherTenantLot = await prisma.creditLot.findUniqueOrThrow({
      where: {
        tenantId_id: {
          tenantId: fixture.otherTenantId,
          id: fixture.otherTenantLot.id,
        },
      },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(otherTenantLot).toEqual({
      id: fixture.otherTenantLot.id,
      remainingAmountKobo: 700n,
    });
  }, 120000);
});

async function createFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const branchId = randomUUID();
  const otherTenantBranchId = randomUUID();
  const userId = randomUUID();
  const otherTenantUserId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();
  const otherTenantCustomerId = randomUUID();
  const mainCardId = randomUUID();
  const otherCustomerCardId = randomUUID();
  const otherTenantCardId = randomUUID();
  const adjustmentId = randomUUID();

  const eligibleLots = [
    {
      id: randomUUID(),
      remainingAmountKobo: 200n,
      earnedAt: new Date('2025-12-31T00:00:00.000Z'),
      expiresAt: addMonthsUtc(new Date('2025-12-31T00:00:00.000Z'), 12),
    },
    {
      id: 'lot-a',
      remainingAmountKobo: 150n,
      earnedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: addMonthsUtc(new Date('2026-01-01T00:00:00.000Z'), 12),
    },
    {
      id: 'lot-b',
      remainingAmountKobo: 100n,
      earnedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: addMonthsUtc(new Date('2026-01-01T00:00:00.000Z'), 12),
    },
  ];
  const laterExpiryLot = {
    id: randomUUID(),
    remainingAmountKobo: 400n,
    earnedAt: new Date('2026-01-02T00:00:00.000Z'),
    expiresAt: addMonthsUtc(new Date('2026-01-02T00:00:00.000Z'), 12),
  };
  const expiredLot = {
    id: randomUUID(),
    remainingAmountKobo: 50n,
    earnedAt: new Date('2024-11-01T00:00:00.000Z'),
    expiresAt: addMonthsUtc(new Date('2024-11-01T00:00:00.000Z'), 12),
  };
  const otherCustomerLot = {
    id: randomUUID(),
    remainingAmountKobo: 500n,
    earnedAt: new Date('2026-01-04T00:00:00.000Z'),
    expiresAt: addMonthsUtc(new Date('2026-01-04T00:00:00.000Z'), 12),
  };
  const otherTenantLot = {
    id: randomUUID(),
    remainingAmountKobo: 700n,
    earnedAt: new Date('2026-01-05T00:00:00.000Z'),
    expiresAt: addMonthsUtc(new Date('2026-01-05T00:00:00.000Z'), 12),
  };

  await prisma.tenant.create({ data: { id: tenantId, name: 'FIFO Tenant' } });
  await prisma.tenant.create({
    data: { id: otherTenantId, name: 'Other Tenant' },
  });

  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'FIFO Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });
  await prisma.branch.create({
    data: {
      id: otherTenantBranchId,
      tenantId: otherTenantId,
      name: 'Other Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      id: userId,
      tenantId,
      branchId,
      username: 'fifo-user@example.test',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      id: otherTenantUserId,
      tenantId: otherTenantId,
      branchId: otherTenantBranchId,
      username: 'other-user@example.test',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });

  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'FIFO Customer',
      phoneE164: '+2348000000101',
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: userId,
    },
  });
  await prisma.customer.create({
    data: {
      id: otherCustomerId,
      tenantId,
      branchId,
      fullName: 'Other Customer',
      phoneE164: '+2348000000102',
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: userId,
    },
  });
  await prisma.customer.create({
    data: {
      id: otherTenantCustomerId,
      tenantId: otherTenantId,
      branchId: otherTenantBranchId,
      fullName: 'Other Tenant Customer',
      phoneE164: '+2348000000103',
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: otherTenantId,
      registeredBy: otherTenantUserId,
    },
  });

  await prisma.card.create({
    data: {
      id: mainCardId,
      tenantId,
      customerId,
      barcodeValue: 'FIFO-CARD-1',
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: userId,
    },
  });
  await prisma.card.create({
    data: {
      id: otherCustomerCardId,
      tenantId,
      customerId: otherCustomerId,
      barcodeValue: 'FIFO-CARD-2',
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: userId,
    },
  });
  await prisma.card.create({
    data: {
      id: otherTenantCardId,
      tenantId: otherTenantId,
      customerId: otherTenantCustomerId,
      barcodeValue: 'FIFO-CARD-3',
      status: 'ACTIVE',
      issuedByTenantId: otherTenantId,
      issuedBy: otherTenantUserId,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.adjustment.create({
      data: {
        id: adjustmentId,
        tenantId,
        customerId,
        kind: AdjustmentKind.DEBIT,
        amountKobo: 420n,
        reason: 'FIFO test adjustment',
        createdByTenantId: tenantId,
        createdBy: userId,
        effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      },
    });

    const seedLots = [
      eligibleLots[1],
      laterExpiryLot,
      otherCustomerLot,
      eligibleLots[2],
      expiredLot,
      eligibleLots[0],
      otherTenantLot,
    ];

    for (const lot of seedLots) {
      const lotTenantId = lot === otherTenantLot ? otherTenantId : tenantId;
      const lotCustomerId =
        lot === otherTenantLot
          ? otherTenantCustomerId
          : lot === otherCustomerLot
            ? otherCustomerId
            : customerId;
      const lotUserId = lot === otherTenantLot ? otherTenantUserId : userId;
      const lotBranchId =
        lot === otherTenantLot ? otherTenantBranchId : branchId;
      const lotCardId =
        lot === otherTenantLot
          ? otherTenantCardId
          : lot === otherCustomerLot
            ? otherCustomerCardId
            : mainCardId;

      const receipt = await tx.receipt.create({
        data: {
          id: randomUUID(),
          tenantId: lotTenantId,
          branchId: lotBranchId,
          customerId: lotCustomerId,
          cardId: lotCardId,
          posReceiptNumber: `POS-${lot.id}`,
          normalizedPosReceiptNumber: `POS-${lot.id}`,
          receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
          purchaseAmountKobo: lot.remainingAmountKobo,
          occurredAt: lot.earnedAt,
          capturedByTenantId: lotTenantId,
          capturedBy: lotUserId,
        },
      });

      const ledgerEntry = await tx.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: lotTenantId,
          customerId: lotCustomerId,
          type: LedgerEntryType.EARN,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: lot.remainingAmountKobo,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `earn-${randomUUID()}`,
          createdByTenantId: lotTenantId,
          createdBy: lotUserId,
          effectiveAt: lot.earnedAt,
          receiptId: receipt.id,
        },
      });

      await tx.creditLot.create({
        data: {
          id: lot.id,
          tenantId: lotTenantId,
          customerId: lotCustomerId,
          earnLedgerEntryId: ledgerEntry.id,
          originalAmountKobo: lot.remainingAmountKobo,
          remainingAmountKobo: lot.remainingAmountKobo,
          earnedAt: lot.earnedAt,
          expiresAt: lot.expiresAt,
        },
      });
    }
  });

  return {
    tenantId,
    otherTenantId,
    userId,
    customerId,
    adjustmentId,
    eligibleLots,
    laterExpiryLot,
    expiredLot,
    otherCustomerLot,
    otherTenantLot,
  };
}

function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}
