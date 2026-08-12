import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { CreditExpiryService } from '../src/modules/credit-expiry/credit-expiry.service';
import { createAttestedDeviceData } from './support/device-attestation';

describe('credit expiry invariants (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let redemptionPrisma: PrismaClient;
  let databaseUrl: string;
  let fixture: Awaited<ReturnType<typeof createBaseFixture>>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    redemptionPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
    await redemptionPrisma.$connect();
    fixture = await createBaseFixture(prisma);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await redemptionPrisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('commits one valid expiry ledger and evidence row for a lot', async () => {
    const lot = await createEarnCreditLot(prisma, fixture, 20_000n);
    const expiredAt = lot.expiresAt;

    await prisma.$transaction(async (tx) => {
      const expiryLedger = await tx.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: null,
          type: LedgerEntryType.EXPIRY,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 20_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `expiry-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.systemUserId,
          effectiveAt: expiredAt,
        },
      });

      await tx.creditExpiry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          creditLotId: lot.id,
          ledgerEntryId: expiryLedger.id,
          amountKobo: 20_000n,
          expiredAt,
        },
      });

      await tx.creditLot.update({
        where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
        data: { remainingAmountKobo: 0n },
      });
    });

    const persistedExpiry = await prisma.creditExpiry.findFirstOrThrow({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });
    const refreshedLot = await prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
    });

    expect(persistedExpiry.amountKobo).toBe(20_000n);
    expect(refreshedLot.remainingAmountKobo).toBe(0n);
  }, 120000);

  it('rejects expiry evidence when the lot balance is not updated to reflect the expiry', async () => {
    const lot = await createEarnCreditLot(prisma, fixture, 15_000n);

    await expect(
      prisma.$transaction(async (tx) => {
        const expiryLedger = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            receiptId: null,
            type: LedgerEntryType.EXPIRY,
            direction: LedgerEntryDirection.DEBIT,
            amountKobo: 15_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `expiry-${randomUUID()}`,
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.systemUserId,
            effectiveAt: lot.expiresAt,
          },
        });

        await tx.creditExpiry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            creditLotId: lot.id,
            ledgerEntryId: expiryLedger.id,
            amountKobo: 15_000n,
            expiredAt: lot.expiresAt,
          },
        });
      }),
    ).rejects.toThrow(
      /credit lot remaining balance must match allocation, restoration, and expiry evidence/i,
    );
  }, 120000);

  it('rejects expiry ledger entries without exactly one credit expiry row', async () => {
    const lot = await createEarnCreditLot(prisma, fixture, 12_000n);

    await expect(
      prisma.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: null,
          type: LedgerEntryType.EXPIRY,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 12_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `expiry-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.systemUserId,
          effectiveAt: lot.expiresAt,
        },
      }),
    ).rejects.toThrow(
      /expiry ledger entry must reference exactly one credit expiry row/i,
    );
  }, 120000);

  it('prevents credit expiry mutation and duplicate lot expiry evidence', async () => {
    const lot = await createEarnCreditLot(prisma, fixture, 8_000n);
    const expiry = await createExpiredLot(prisma, fixture, lot, 8_000n);

    await expect(
      prisma.creditExpiry.update({
        where: { tenantId_id: { tenantId: fixture.tenantId, id: expiry.id } },
        data: { amountKobo: 7_000n },
      }),
    ).rejects.toThrow(/credit expiry evidence is immutable/i);

    await expect(
      prisma.creditExpiry.delete({
        where: { tenantId_id: { tenantId: fixture.tenantId, id: expiry.id } },
      }),
    ).rejects.toThrow(/credit expiry evidence is immutable/i);

    await expect(
      prisma.$transaction(async (tx) => {
        const secondExpiryLedger = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            receiptId: null,
            type: LedgerEntryType.EXPIRY,
            direction: LedgerEntryDirection.DEBIT,
            amountKobo: 8_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `expiry-${randomUUID()}`,
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.systemUserId,
            effectiveAt: lot.expiresAt,
          },
        });

        await tx.creditExpiry.create({
          data: {
            id: randomUUID(),
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            creditLotId: lot.id,
            ledgerEntryId: secondExpiryLedger.id,
            amountKobo: 8_000n,
            expiredAt: lot.expiresAt,
          },
        });
      }),
    ).rejects.toThrow(/unique constraint failed|duplicate key value/i);
  }, 120000);

  it('keeps expiry and redemption mutually consistent when both target the same due lot', async () => {
    const lot = await createEarnCreditLot(prisma, fixture, 11_000n);
    const expiryService = new CreditExpiryService(
      prisma as never,
      {
        recordWithClient: jest.fn().mockResolvedValue(undefined),
      } as never,
      {
        getOrCreate: jest.fn().mockResolvedValue({
          id: fixture.systemUserId,
          tenantId: fixture.tenantId,
        }),
      },
    );

    const [expiryOutcome, redemptionOutcome] = await Promise.allSettled([
      expiryService.expireDueCredit({ now: lot.expiresAt, batchSize: 10 }),
      redeemCreditLot(redemptionPrisma, fixture, lot.id, 11_000n),
    ]);

    expect(
      [expiryOutcome.status, redemptionOutcome.status].filter(
        (status) => status === 'fulfilled',
      ),
    ).toHaveLength(1);

    const refreshedLot = await prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
    });
    const expiredCount = await prisma.creditExpiry.count({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });
    const redemptionAllocationCount = await prisma.redemptionAllocation.count({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });

    expect(refreshedLot.remainingAmountKobo).toBe(0n);
    expect(expiredCount + redemptionAllocationCount).toBe(1);
  }, 120000);

  it('verifies credit expiry SQL guards are present after migration deploy', async () => {
    const functions = await prisma.$queryRaw<{ proname: string }[]>`
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'validate_credit_lot_balance_evidence_for_lot',
          'validate_credit_expiry_commit_state',
          'prevent_credit_expiry_mutation',
          'validate_ledger_entry_commit_state'
        )
      ORDER BY p.proname
    `;
    const triggers = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname IN (
        'validate_credit_expiry_commit_state_insert',
        'prevent_credit_expiry_update',
        'prevent_credit_expiry_delete',
        'validate_ledger_entry_commit_state_insert'
      )
      ORDER BY tgname
    `;
    const balanceValidation = await prisma.$queryRaw<{ definition: string }[]>`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_credit_lot_balance_evidence_for_lot'
      LIMIT 1
    `;
    const expiryValidation = await prisma.$queryRaw<{ definition: string }[]>`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_credit_expiry_commit_state'
      LIMIT 1
    `;
    const ledgerValidation = await prisma.$queryRaw<{ definition: string }[]>`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_ledger_entry_commit_state'
      LIMIT 1
    `;

    expect(functions.map((row) => row.proname)).toEqual(
      expect.arrayContaining([
        'prevent_credit_expiry_mutation',
        'validate_credit_expiry_commit_state',
        'validate_credit_lot_balance_evidence_for_lot',
        'validate_ledger_entry_commit_state',
      ]),
    );
    expect(triggers.map((row) => row.tgname)).toEqual(
      expect.arrayContaining([
        'prevent_credit_expiry_delete',
        'prevent_credit_expiry_update',
        'validate_credit_expiry_commit_state_insert',
        'validate_ledger_entry_commit_state_insert',
      ]),
    );
    expect(balanceValidation[0].definition).toContain('expiry evidence');
    expect(expiryValidation[0].definition).toContain(
      'credit expiry ledger entry must be EXPIRY DEBIT',
    );
    expect(ledgerValidation[0].definition).toContain(
      'expiry ledger entry must reference exactly one credit expiry row',
    );
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const cashierUserId = randomUUID();
  const systemUserId = randomUUID();
  const customerId = randomUUID();
  const deviceId = randomUUID();
  const cardId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Expiry Invariant Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Main Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });
  await prisma.user.createMany({
    data: [
      {
        id: cashierUserId,
        tenantId,
        branchId,
        username: `cashier-${tenantId}@shopcity.local`,
        role: UserRole.CASHIER,
        status: 'ACTIVE',
      },
      {
        id: systemUserId,
        tenantId,
        branchId: null,
        username: `system-${tenantId}@shopcity.internal`,
        role: UserRole.SYSTEM,
        status: 'ACTIVE',
      },
    ],
  });
  await prisma.device.create({
    data: createAttestedDeviceData({
      id: deviceId,
      tenantId,
      branchId,
      name: 'Expiry Device',
      fingerprintHash: `expiry-device-${tenantId}`,
      status: 'ACTIVE',
    }),
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Expiry Customer',
      phoneE164: `+2348${Math.floor(Math.random() * 1_000_000_000)
        .toString()
        .padStart(9, '0')}`,
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: cashierUserId,
    },
  });
  await prisma.card.create({
    data: {
      id: cardId,
      tenantId,
      customerId,
      barcodeValue: `CARD-${tenantId}`,
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: cashierUserId,
    },
  });

  return {
    tenantId,
    branchId,
    cashierUserId,
    systemUserId,
    customerId,
    deviceId,
    cardId,
  };
}

async function createEarnCreditLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  amountKobo: bigint,
) {
  const receiptId = randomUUID();
  const ledgerEntryId = randomUUID();
  const lotId = randomUUID();
  const earnedAt = new Date('2026-08-01T10:00:00.000Z');
  const expiresAt = new Date('2027-08-01T10:00:00.000Z');
  const receiptNumber = `EXP-REC-${receiptId.slice(0, 8)}`;

  await prisma.$transaction(async (tx) => {
    await tx.receipt.create({
      data: {
        id: receiptId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: null,
        posReceiptNumber: receiptNumber,
        normalizedPosReceiptNumber: receiptNumber,
        receiptWeekStart: new Date('2026-07-27T00:00:00.000Z'),
        purchaseAmountKobo: amountKobo,
        occurredAt: earnedAt,
        capturedByTenantId: fixture.tenantId,
        capturedBy: fixture.cashierUserId,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        capturedAt: earnedAt,
        approvedByTenantId: fixture.tenantId,
        approvedBy: fixture.cashierUserId,
        approvedAt: earnedAt,
      },
    });

    await tx.loyaltyLedgerEntry.create({
      data: {
        id: ledgerEntryId,
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.cashierUserId,
        effectiveAt: earnedAt,
      },
    });

    await tx.creditLot.create({
      data: {
        id: lotId,
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: ledgerEntryId,
        originalAmountKobo: amountKobo,
        remainingAmountKobo: amountKobo,
        earnedAt,
        expiresAt,
      },
    });
  });

  return { id: lotId, receiptId, ledgerEntryId, earnedAt, expiresAt };
}

async function createExpiredLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  lot: Awaited<ReturnType<typeof createEarnCreditLot>>,
  amountKobo: bigint,
) {
  const expiryId = randomUUID();

  await prisma.$transaction(async (tx) => {
    const expiryLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: null,
        type: LedgerEntryType.EXPIRY,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `expiry-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.systemUserId,
        effectiveAt: lot.expiresAt,
      },
    });

    await tx.creditExpiry.create({
      data: {
        id: expiryId,
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        creditLotId: lot.id,
        ledgerEntryId: expiryLedger.id,
        amountKobo,
        expiredAt: lot.expiresAt,
      },
    });

    await tx.creditLot.update({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
      data: { remainingAmountKobo: 0n },
    });
  });

  return { id: expiryId };
}

async function redeemCreditLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  lotId: string,
  amountKobo: bigint,
) {
  const receiptId = randomUUID();
  const redemptionId = randomUUID();
  const ledgerEntryId = randomUUID();
  const occurredAt = new Date('2027-08-01T10:00:00.000Z');
  const receiptNumber = `RACE-${receiptId.slice(0, 8)}`;

  await prisma.$transaction(async (tx) => {
    await tx.receipt.create({
      data: {
        id: receiptId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: null,
        posReceiptNumber: receiptNumber,
        normalizedPosReceiptNumber: receiptNumber,
        receiptWeekStart: new Date('2027-07-26T00:00:00.000Z'),
        purchaseAmountKobo: amountKobo,
        occurredAt,
        capturedByTenantId: fixture.tenantId,
        capturedBy: fixture.cashierUserId,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        capturedAt: occurredAt,
        approvedByTenantId: fixture.tenantId,
        approvedBy: fixture.cashierUserId,
        approvedAt: occurredAt,
      },
    });

    await tx.loyaltyLedgerEntry.create({
      data: {
        id: ledgerEntryId,
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId,
        type: LedgerEntryType.REDEEM,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `redeem-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.cashierUserId,
        effectiveAt: occurredAt,
      },
    });

    await tx.redemption.create({
      data: {
        id: redemptionId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.cashierUserId,
        requestedAmountKobo: amountKobo,
        basketAmountKobo: amountKobo,
        maximumAllowedKobo: amountKobo,
        confirmedAmountKobo: amountKobo,
        status: 'CONFIRMED',
        policyVersion: 'policy-v1',
        ledgerEntryId,
        requestedAt: occurredAt,
        confirmedAt: occurredAt,
      },
    });

    await tx.redemptionAllocation.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        redemptionId,
        redemptionLedgerEntryId: ledgerEntryId,
        creditLotId: lotId,
        amountKobo,
        allocationOrder: 1,
      },
    });

    const updated = await tx.creditLot.updateMany({
      where: {
        tenantId: fixture.tenantId,
        id: lotId,
        customerId: fixture.customerId,
        remainingAmountKobo: { gte: amountKobo },
      },
      data: {
        remainingAmountKobo: {
          decrement: amountKobo,
        },
      },
    });

    if (updated.count !== 1) {
      throw new Error('redemption raced with credit expiry');
    }
  });
}
