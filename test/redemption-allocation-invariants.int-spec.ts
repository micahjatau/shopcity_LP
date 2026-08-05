import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  Prisma,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  RedemptionStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createAttestedDeviceData } from './support/device-attestation';

describe('redemption allocation invariants (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let fixture: Awaited<ReturnType<typeof createBaseFixture>>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    fixture = await createBaseFixture(prisma);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('accepts allocation rows when debit totals and lot balance evidence match', async () => {
    const scenario = await createRedemptionScenario(prisma, fixture);

    await expect(
      prisma.$transaction(async (tx) => {
        const redemption = await createConfirmedRedemption(tx, fixture, 6_000n);

        await tx.redemptionAllocation.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            redemptionId: redemption.redemptionId,
            redemptionLedgerEntryId: redemption.debitLedgerEntryId,
            creditLotId: scenario.creditLotId,
            amountKobo: 6_000n,
            allocationOrder: 1,
          },
        });
        await tx.creditLot.update({
          where: {
            tenantId_id: {
              tenantId: fixture.tenantId,
              id: scenario.creditLotId,
            },
          },
          data: { remainingAmountKobo: { decrement: 6_000n } },
        });
      }),
    ).resolves.toBeUndefined();
  }, 120000);

  it('rejects allocation rows that are not reflected in credit lot balance', async () => {
    const scenario = await createRedemptionScenario(prisma, fixture);

    await expect(
      prisma.$transaction(async (tx) => {
        const redemption = await createConfirmedRedemption(tx, fixture, 6_000n);

        await tx.redemptionAllocation.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            redemptionId: redemption.redemptionId,
            redemptionLedgerEntryId: redemption.debitLedgerEntryId,
            creditLotId: scenario.creditLotId,
            amountKobo: 6_000n,
            allocationOrder: 1,
          },
        });
      }),
    ).rejects.toThrow(/remaining balance must match allocation/i);
  }, 120000);

  it('rejects allocation totals that do not equal the debit ledger amount', async () => {
    const scenario = await createRedemptionScenario(prisma, fixture);

    await expect(
      prisma.$transaction(async (tx) => {
        const redemption = await createConfirmedRedemption(tx, fixture, 6_000n);

        await tx.redemptionAllocation.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            redemptionId: redemption.redemptionId,
            redemptionLedgerEntryId: redemption.debitLedgerEntryId,
            creditLotId: scenario.creditLotId,
            amountKobo: 5_000n,
            allocationOrder: 1,
          },
        });
        await tx.creditLot.update({
          where: {
            tenantId_id: {
              tenantId: fixture.tenantId,
              id: scenario.creditLotId,
            },
          },
          data: { remainingAmountKobo: { decrement: 5_000n } },
        });
      }),
    ).rejects.toThrow(/allocation total must equal ledger amount/i);
  }, 120000);

  it('rejects restoration rows that are not reflected in credit lot balance', async () => {
    const scenario = await createRedemptionScenario(prisma, fixture);

    await expect(
      prisma.$transaction(async (tx) => {
        const redemption = await createConfirmedRedemption(tx, fixture, 6_000n);

        const allocationId = randomUUID();

        await tx.redemptionAllocation.create({
          data: {
            id: allocationId,
            tenantId: fixture.tenantId,
            redemptionId: redemption.redemptionId,
            redemptionLedgerEntryId: redemption.debitLedgerEntryId,
            creditLotId: scenario.creditLotId,
            amountKobo: 6_000n,
            allocationOrder: 1,
          },
        });

        await tx.creditLot.update({
          where: {
            tenantId_id: {
              tenantId: fixture.tenantId,
              id: scenario.creditLotId,
            },
          },
          data: { remainingAmountKobo: { decrement: 6_000n } },
        });

        const reversalLedger = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            type: LedgerEntryType.REVERSAL,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: 6_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `reversal-${randomUUID()}`,
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.userId,
            reversesEntryId: redemption.debitLedgerEntryId,
            effectiveAt: new Date(),
          },
        });

        await tx.allocationRestoration.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            allocationId,
            reversalLedgerEntryId: reversalLedger.id,
            amountKobo: 6_000n,
          },
        });
      }),
    ).rejects.toThrow(/remaining balance must match allocation/i);
  }, 120000);

  it('rejects restorations that point to the wrong original debit', async () => {
    const scenario = await createRedemptionScenario(prisma, fixture);

    const committedAllocation = await prisma.$transaction(async (tx) => {
      const firstRedemption = await createConfirmedRedemption(
        tx,
        fixture,
        6_000n,
      );
      const allocationId = randomUUID();

      await tx.redemptionAllocation.create({
        data: {
          id: allocationId,
          tenantId: fixture.tenantId,
          redemptionId: firstRedemption.redemptionId,
          redemptionLedgerEntryId: firstRedemption.debitLedgerEntryId,
          creditLotId: scenario.creditLotId,
          amountKobo: 6_000n,
          allocationOrder: 1,
        },
      });

      await tx.creditLot.update({
        where: {
          tenantId_id: {
            tenantId: fixture.tenantId,
            id: scenario.creditLotId,
          },
        },
        data: { remainingAmountKobo: { decrement: 6_000n } },
      });

      return { allocationId };
    });

    const wrongScenario = await createRedemptionScenario(prisma, fixture);

    const wrongDebitLedgerEntryId = await prisma.$transaction(async (tx) => {
      const wrongRedemption = await createConfirmedRedemption(
        tx,
        fixture,
        6_000n,
      );

      await tx.redemptionAllocation.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          redemptionId: wrongRedemption.redemptionId,
          redemptionLedgerEntryId: wrongRedemption.debitLedgerEntryId,
          creditLotId: wrongScenario.creditLotId,
          amountKobo: 6_000n,
          allocationOrder: 1,
        },
      });

      await tx.creditLot.update({
        where: {
          tenantId_id: {
            tenantId: fixture.tenantId,
            id: wrongScenario.creditLotId,
          },
        },
        data: { remainingAmountKobo: { decrement: 6_000n } },
      });

      return wrongRedemption.debitLedgerEntryId;
    });

    await expect(
      prisma.$transaction(async (tx) => {
        const wrongReversalLedger = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            type: LedgerEntryType.REVERSAL,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: 6_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `reversal-${randomUUID()}`,
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.userId,
            reversesEntryId: wrongDebitLedgerEntryId,
            effectiveAt: new Date(),
          },
        });

        await tx.allocationRestoration.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            allocationId: committedAllocation.allocationId,
            reversalLedgerEntryId: wrongReversalLedger.id,
            amountKobo: 6_000n,
          },
        });

        await tx.creditLot.update({
          where: {
            tenantId_id: {
              tenantId: fixture.tenantId,
              id: scenario.creditLotId,
            },
          },
          data: { remainingAmountKobo: { increment: 6_000n } },
        });
      }),
    ).rejects.toThrow(/original debit/i);
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
    data: { id: tenantId, name: 'Invariant Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Invariant Branch',
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
      username: 'cashier@invariant.local',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Invariant Customer',
      phoneE164: '+2348000000001',
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
      barcodeValue: 'CARD-INVARIANT',
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: userId,
    },
  });
  await prisma.device.create({
    data: createAttestedDeviceData({
      id: deviceId,
      tenantId,
      branchId,
      name: 'Invariant Device',
      fingerprintHash: 'invariant-device-fingerprint',
      status: 'ACTIVE',
    }),
  });

  return { tenantId, branchId, userId, customerId, cardId, deviceId };
}

async function createRedemptionScenario(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const earnReceipt = await createReceipt(
      tx,
      fixture,
      `EARN-${randomUUID()}`,
      now,
    );
    const earnLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: earnReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 20_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: now,
      },
    });
    const creditLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: earnLedger.id,
        originalAmountKobo: 20_000n,
        remainingAmountKobo: 20_000n,
        earnedAt: now,
        expiresAt: addMonthsUtc(now, 12),
      },
    });

    return {
      creditLotId: creditLot.id,
      now,
    };
  });
}

async function createConfirmedRedemption(
  tx: Prisma.TransactionClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  debitAmountKobo: bigint,
) {
  const now = new Date();
  const redemptionReceipt = await createReceipt(
    tx,
    fixture,
    `REDEEM-${randomUUID()}`,
    now,
  );
  const debitLedger = await tx.loyaltyLedgerEntry.create({
    data: {
      id: randomUUID(),
      tenantId: fixture.tenantId,
      customerId: fixture.customerId,
      receiptId: redemptionReceipt.id,
      type: LedgerEntryType.REDEEM,
      direction: LedgerEntryDirection.DEBIT,
      amountKobo: debitAmountKobo,
      status: LedgerEntryStatus.CONFIRMED,
      correlationId: `redeem-${randomUUID()}`,
      createdByTenantId: fixture.tenantId,
      createdBy: fixture.userId,
      effectiveAt: now,
    },
  });
  const redemption = await tx.redemption.create({
    data: {
      id: randomUUID(),
      tenantId: fixture.tenantId,
      branchId: fixture.branchId,
      customerId: fixture.customerId,
      cardId: fixture.cardId,
      deviceId: fixture.deviceId,
      receiptId: redemptionReceipt.id,
      requestedByTenantId: fixture.tenantId,
      requestedBy: fixture.userId,
      requestedAmountKobo: debitAmountKobo,
      basketAmountKobo: 30_000n,
      maximumAllowedKobo: 9_000n,
      confirmedAmountKobo: debitAmountKobo,
      status: RedemptionStatus.CONFIRMED,
      policyVersion: 'test-policy',
      ledgerEntryId: debitLedger.id,
      requestedAt: now,
      confirmedAt: now,
    },
  });

  return { redemptionId: redemption.id, debitLedgerEntryId: debitLedger.id };
}

async function createReceipt(
  prisma: Prisma.TransactionClient,
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
