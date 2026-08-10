import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  AdjustmentKind,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { LotAllocationService } from '../src/common/balance/lot-allocation.service';
import { ReversalsService } from '../src/modules/reversals/reversals.service';

describe('reversal lot isolation (int)', () => {
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

  it('reverses an earn by consuming only its own credit lot', async () => {
    const fixture = await createBaseFixture(prisma);
    const original = await createEarnSource(prisma, fixture);
    const service = createReversalsService(prisma);

    const response = await service.reverse(
      fixture.tenantId,
      actor(fixture),
      original.ledgerEntryId,
      'idem-earn-reversal',
      {
        reason: 'Earn correction',
      },
    );

    expect(response.originalTransactionId).toBe(original.ledgerEntryId);
    expect(response.allocations).toEqual([
      {
        creditLotId: original.creditLotId,
        amountKobo: Number(original.amountKobo),
        allocationOrder: 1,
        expiresAt: original.expiresAt.toISOString(),
      },
    ]);

    const lots = await prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [original.olderLotId, original.creditLotId] },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(lots).toEqual(
      expect.arrayContaining([
        {
          id: original.olderLotId,
          remainingAmountKobo: 50n,
        },
        {
          id: original.creditLotId,
          remainingAmountKobo: 0n,
        },
      ]),
    );

    const allocation = await prisma.redemptionAllocation.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        redemptionLedgerEntryId: response.id,
      },
      select: {
        creditLotId: true,
        amountKobo: true,
        allocationOrder: true,
      },
    });

    expect(allocation).toEqual({
      creditLotId: original.creditLotId,
      amountKobo: 40n,
      allocationOrder: 1,
    });

    const reversalLedger = await prisma.loyaltyLedgerEntry.findUniqueOrThrow({
      where: {
        tenantId_id: {
          tenantId: fixture.tenantId,
          id: response.id,
        },
      },
      select: { reversesEntryId: true },
    });

    expect(reversalLedger.reversesEntryId).toBe(original.ledgerEntryId);
  }, 120000);

  it('reverses a credit adjustment by consuming only its own credit lot', async () => {
    const fixture = await createBaseFixture(prisma);
    const original = await createCreditAdjustmentSource(prisma, fixture);
    const service = createReversalsService(prisma);

    const response = await service.reverse(
      fixture.tenantId,
      actor(fixture),
      original.ledgerEntryId,
      'idem-adjustment-reversal',
      {
        reason: 'Adjustment correction',
      },
    );

    expect(response.originalTransactionId).toBe(original.ledgerEntryId);
    expect(response.allocations).toEqual([
      {
        creditLotId: original.creditLotId,
        amountKobo: Number(original.amountKobo),
        allocationOrder: 1,
        expiresAt: original.expiresAt.toISOString(),
      },
    ]);

    const lots = await prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [original.olderLotId, original.creditLotId] },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(lots).toHaveLength(2);
    expect(lots).toEqual(
      expect.arrayContaining([
        {
          id: original.olderLotId,
          remainingAmountKobo: 50n,
        },
        {
          id: original.creditLotId,
          remainingAmountKobo: 0n,
        },
      ]),
    );

    const allocation = await prisma.redemptionAllocation.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        redemptionLedgerEntryId: response.id,
      },
      select: {
        creditLotId: true,
        amountKobo: true,
        allocationOrder: true,
      },
    });

    expect(allocation).toEqual({
      creditLotId: original.creditLotId,
      amountKobo: 40n,
      allocationOrder: 1,
    });

    const reversalLedger = await prisma.loyaltyLedgerEntry.findUniqueOrThrow({
      where: {
        tenantId_id: {
          tenantId: fixture.tenantId,
          id: response.id,
        },
      },
      select: { reversesEntryId: true },
    });

    expect(reversalLedger.reversesEntryId).toBe(original.ledgerEntryId);
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Reversal Isolation Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Reversal Isolation Branch',
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
      username: 'reverse-user@example.test',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Reversal Isolation Customer',
      phoneE164: '+2348000000999',
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: userId,
    },
  });
  await prisma.card.create({
    data: {
      id: cardId,
      tenantId,
      customerId,
      barcodeValue: `CARD-${randomUUID()}`,
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: userId,
    },
  });
  await prisma.device.create({
    data: {
      id: deviceId,
      tenantId,
      branchId,
      name: 'Reversal Isolation Device',
      fingerprintHash: `device-${randomUUID()}`,
      attestationSecretCiphertext: 'ciphertext',
      attestationSecretVersion: 1,
      attestationSecretRotatedAt: new Date('2026-07-26T12:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  return { tenantId, branchId, userId, customerId, cardId, deviceId };
}

async function createEarnSource(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const olderAt = new Date('2026-07-26T11:50:00.000Z');
  const targetAt = new Date('2026-07-26T12:00:00.000Z');

  return prisma.$transaction(async (tx) => {
    const olderEarnReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-OLD-1',
      olderAt,
    );
    const olderLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: olderEarnReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 50n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `older-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: olderAt,
      },
    });

    const olderLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: olderLedger.id,
        originalAmountKobo: 50n,
        remainingAmountKobo: 50n,
        earnedAt: olderAt,
        expiresAt: addMonthsUtc(olderAt, 12),
      },
    });

    const targetEarnReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-TARGET-1',
      targetAt,
    );
    const targetLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: targetEarnReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 40n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `target-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: targetAt,
      },
    });

    const targetLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: targetLedger.id,
        originalAmountKobo: 40n,
        remainingAmountKobo: 40n,
        earnedAt: targetAt,
        expiresAt: addMonthsUtc(targetAt, 12),
      },
    });

    return {
      olderLotId: olderLot.id,
      creditLotId: targetLot.id,
      ledgerEntryId: targetLedger.id,
      amountKobo: 40n,
      expiresAt: targetLot.expiresAt,
    };
  });
}

async function createCreditAdjustmentSource(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const olderAt = new Date('2026-07-26T11:50:00.000Z');
  const targetAt = new Date('2026-07-26T12:00:00.000Z');

  return prisma.$transaction(async (tx) => {
    const olderReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-OLD-2',
      olderAt,
    );
    const olderLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: olderReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 50n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `older-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: olderAt,
      },
    });

    const olderLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: olderLedger.id,
        originalAmountKobo: 50n,
        remainingAmountKobo: 50n,
        earnedAt: olderAt,
        expiresAt: addMonthsUtc(olderAt, 12),
      },
    });

    const targetLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: null,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 40n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `credit-adjustment-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: targetAt,
      },
    });

    const targetAdjustment = await tx.adjustment.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        kind: AdjustmentKind.CREDIT,
        amountKobo: 40n,
        reason: 'Credit adjustment source',
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        ledgerEntryId: targetLedger.id,
        effectiveAt: targetAt,
      },
    });

    const targetLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: targetLedger.id,
        originalAmountKobo: 40n,
        remainingAmountKobo: 40n,
        earnedAt: targetAt,
        expiresAt: addMonthsUtc(targetAt, 12),
      },
    });

    return {
      olderLotId: olderLot.id,
      creditLotId: targetLot.id,
      ledgerEntryId: targetLedger.id,
      adjustmentId: targetAdjustment.id,
      amountKobo: 40n,
      expiresAt: targetLot.expiresAt,
    };
  });
}

function createReversalsService(prisma: PrismaClient) {
  const activeBalanceService = {
    getActiveBalanceKobo: jest
      .fn()
      .mockImplementation(
        async (
          tenantId: string,
          customerId: string,
          now: Date,
          tx: PrismaClient,
        ) => {
          const lots = await tx.creditLot.findMany({
            where: {
              tenantId,
              customerId,
              remainingAmountKobo: { gt: 0n },
              expiresAt: { gt: now },
            },
            select: { remainingAmountKobo: true },
          });

          return lots.reduce((sum, lot) => sum + lot.remainingAmountKobo, 0n);
        },
      ),
  };
  const auditService = {
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  };

  return new ReversalsService(
    prisma as never,
    activeBalanceService as never,
    new LotAllocationService(),
    auditService as never,
  );
}

function actor(fixture: Awaited<ReturnType<typeof createBaseFixture>>) {
  return {
    user: {
      id: fixture.userId,
      tenantId: fixture.tenantId,
      branchId: fixture.branchId,
      username: 'reverse-user@example.test',
      supabaseAuthId: null,
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date('2026-07-26T12:00:00.000Z'),
      updatedAt: new Date('2026-07-26T12:00:00.000Z'),
    },
    session: {
      id: 'session-1',
      userId: fixture.userId,
      deviceId: null,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date('2026-08-04T00:00:00.000Z'),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    },
  };
}

async function createReceipt(
  prisma: Pick<PrismaClient, 'receipt'>,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  receiptNumber: string,
  occurredAt: Date,
) {
  return prisma.receipt.create({
    data: {
      id: randomUUID(),
      tenantId: fixture.tenantId,
      branchId: fixture.branchId,
      customerId: fixture.customerId,
      cardId: fixture.cardId,
      deviceId: fixture.deviceId,
      posReceiptNumber: receiptNumber,
      normalizedPosReceiptNumber: receiptNumber,
      receiptWeekStart: new Date(Date.UTC(2026, 6, 20)),
      purchaseAmountKobo: 30_000n,
      occurredAt,
      capturedByTenantId: fixture.tenantId,
      capturedBy: fixture.userId,
      captureStatus: ReceiptCaptureStatus.CAPTURED,
      reviewStatus: ReceiptReviewStatus.APPROVED,
      reviewedAt: occurredAt,
      reviewedByTenantId: fixture.tenantId,
      reviewedBy: fixture.userId,
      approvedAt: occurredAt,
      approvedByTenantId: fixture.tenantId,
      approvedBy: fixture.userId,
    },
  });
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
