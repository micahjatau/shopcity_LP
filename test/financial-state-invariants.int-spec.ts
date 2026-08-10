import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  ApprovalStatus,
  ApprovalTargetType,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  PrismaClient,
  RedemptionStatus,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createAttestedDeviceData } from './support/device-attestation';

describe('financial state invariants (int)', () => {
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

  it('rejects incoherent redemption lifecycle rows', async () => {
    await expect(
      prisma.redemption.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          branchId: fixture.branchId,
          customerId: fixture.customerId,
          cardId: fixture.cardId,
          deviceId: fixture.deviceId,
          receiptId: fixture.receiptId,
          requestedByTenantId: fixture.tenantId,
          requestedBy: fixture.userId,
          requestedAmountKobo: 6_000n,
          basketAmountKobo: 30_000n,
          maximumAllowedKobo: 6_000n,
          confirmedAmountKobo: 6_000n,
          status: 'CONFIRMED',
          policyVersion: 'policy-v1',
          confirmedAt: null,
        },
      }),
    ).rejects.toThrow(/Redemption_financial_state_machine_check/i);
  }, 120000);

  it('rejects incoherent approval lifecycle rows', async () => {
    const redemption = await prisma.redemption.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId: fixture.receiptId,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: 6_000n,
        basketAmountKobo: 30_000n,
        maximumAllowedKobo: 6_000n,
        status: 'PENDING_APPROVAL',
        policyVersion: 'policy-v1',
      },
    });

    await expect(
      prisma.approval.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          redemptionId: redemption.id,
          targetType: 'REDEEM',
          status: ApprovalStatus.PENDING,
          requestedByTenantId: fixture.tenantId,
          requestedBy: fixture.userId,
          policyVersion: 'policy-v1',
          expiresAt: new Date('2026-07-30T12:00:00.000Z'),
          decisionByTenantId: fixture.tenantId,
          decisionBy: fixture.userId,
          decisionReason: 'should not be here',
          decidedAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(/Approval_financial_state_machine_check/i);
  }, 120000);

  it('rejects approval rows that bind both receipt and redemption targets', async () => {
    const { receiptId, redemptionId } = await createConfirmedRedemption(
      prisma,
      fixture,
      'REDEEM-APPROVAL-XOR',
      6_000n,
    );

    await expect(
      prisma.approval.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          receiptId,
          redemptionId,
          targetType: ApprovalTargetType.REDEEM,
          status: ApprovalStatus.PENDING,
          requestedByTenantId: fixture.tenantId,
          requestedBy: fixture.userId,
          policyVersion: 'policy-v1',
          expiresAt: new Date('2026-07-30T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(/Approval_target_xor_check/i);
  }, 120000);

  it('rejects ledger rows without required evidence', async () => {
    await expect(
      prisma.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: fixture.receiptId,
          type: LedgerEntryType.REDEEM,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 6_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `ledger-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(
      /redeem ledger entry must reference a confirmed redemption/i,
    );
  }, 120000);

  it('rejects unsupported ledger type and direction pairs', async () => {
    await expect(
      prisma.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: fixture.receiptId,
          type: LedgerEntryType.EARN,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 6_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `ledger-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(/unsupported ledger type\/direction combination/i);
  }, 120000);

  it('rejects a second reversal for the same original transaction', async () => {
    const { debitLedgerEntryId: originalLedgerId, allocationId } =
      await createConfirmedRedemption(
        prisma,
        fixture,
        'REDEEM-REVERSAL-ONE',
        6_000n,
      );

    await prisma.$transaction(async (tx) => {
      const reversalLedger = await tx.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: null,
          type: LedgerEntryType.REVERSAL,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 6_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `reversal-${randomUUID()}`,
          reversesEntryId: originalLedgerId,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
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

      await tx.creditLot.update({
        where: {
          tenantId_id: {
            tenantId: fixture.tenantId,
            id: (
              await tx.redemptionAllocation.findUniqueOrThrow({
                where: {
                  tenantId_id: { tenantId: fixture.tenantId, id: allocationId },
                },
              })
            ).creditLotId,
          },
        },
        data: { remainingAmountKobo: { increment: 6_000n } },
      });
    });

    await expect(
      prisma.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: null,
          type: LedgerEntryType.REVERSAL,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 6_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `reversal-${randomUUID()}`,
          reversesEntryId: originalLedgerId,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(
      /reversesentryid|unique constraint failed|duplicate key value/i,
    );
  }, 120000);

  it('verifies the financial SQL guards are present after migration deploy', async () => {
    const functions = await prisma.$queryRaw<{ proname: string }[]>`
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'validate_credit_lot_source',
          'prevent_credit_lot_source_mutation',
          'validate_allocation_restoration_commit_state',
          'validate_ledger_entry_commit_state'
        )
      ORDER BY p.proname
    `;
    const triggers = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname IN (
        'validate_credit_lot_source_insert',
        'validate_credit_lot_source_update',
        'prevent_credit_lot_source_update',
        'validate_allocation_restoration_commit_state_insert',
        'validate_ledger_entry_commit_state_insert'
      )
      ORDER BY tgname
    `;
    const ledgerValidation = await prisma.$queryRaw<{ definition: string }[]>`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_ledger_entry_commit_state'
      LIMIT 1
    `;
    const restorationValidation = await prisma.$queryRaw<
      {
        definition: string;
      }[]
    >`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_allocation_restoration_commit_state'
      LIMIT 1
    `;

    expect(functions.map((row) => row.proname)).toEqual(
      expect.arrayContaining([
        'prevent_credit_lot_source_mutation',
        'validate_allocation_restoration_commit_state',
        'validate_credit_lot_source',
        'validate_ledger_entry_commit_state',
      ]),
    );
    expect(triggers.map((row) => row.tgname)).toEqual(
      expect.arrayContaining([
        'prevent_credit_lot_source_update',
        'validate_allocation_restoration_commit_state_insert',
        'validate_credit_lot_source_insert',
        'validate_credit_lot_source_update',
        'validate_ledger_entry_commit_state_insert',
      ]),
    );
    expect(ledgerValidation[0].definition).toContain(
      'unsupported ledger type/direction combination',
    );
    expect(ledgerValidation[0].definition).toContain(
      'credit adjustment ledger entry must have exactly one credit lot',
    );
    expect(restorationValidation[0].definition).toContain(
      'allocation restoration must reference the original debit entry',
    );
  }, 120000);

  it('prevents redemption evidence mutation', async () => {
    const receiptId = randomUUID();
    await prisma.receipt.create({
      data: {
        id: receiptId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        posReceiptNumber: 'POS-MUTATION',
        normalizedPosReceiptNumber: 'POS-MUTATION',
        receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
        purchaseAmountKobo: 30_000n,
        occurredAt: new Date('2026-07-26T12:00:00.000Z'),
        capturedByTenantId: fixture.tenantId,
        capturedBy: fixture.userId,
        capturedAt: new Date('2026-07-26T12:00:00.000Z'),
        captureStatus: ReceiptCaptureStatus.PENDING_APPROVAL,
        reviewStatus: ReceiptReviewStatus.PENDING,
      },
    });

    const redemption = await prisma.redemption.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: 6_000n,
        basketAmountKobo: 30_000n,
        maximumAllowedKobo: 6_000n,
        status: 'PENDING_APPROVAL',
        policyVersion: 'policy-v1',
      },
    });

    await expect(
      prisma.redemption.update({
        where: {
          tenantId_id: { tenantId: fixture.tenantId, id: redemption.id },
        },
        data: { requestedAmountKobo: 7_000n },
      }),
    ).rejects.toThrow(/redemption evidence fields are immutable/i);
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();
  const receiptId = randomUUID();

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
  await prisma.receipt.create({
    data: {
      id: receiptId,
      tenantId,
      branchId,
      customerId,
      cardId,
      deviceId,
      posReceiptNumber: 'POS-INVARIANT',
      normalizedPosReceiptNumber: 'POS-INVARIANT',
      receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
      purchaseAmountKobo: 30_000n,
      occurredAt: new Date('2026-07-26T12:00:00.000Z'),
      capturedByTenantId: tenantId,
      capturedBy: userId,
      capturedAt: new Date('2026-07-26T12:00:00.000Z'),
      captureStatus: ReceiptCaptureStatus.PENDING_APPROVAL,
      reviewStatus: ReceiptReviewStatus.PENDING,
    },
  });

  return {
    tenantId,
    branchId,
    userId,
    customerId,
    cardId,
    deviceId,
    receiptId,
  };
}

async function createConfirmedRedemption(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  receiptNumber: string,
  debitAmountKobo: bigint,
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const scenario = await createRedemptionScenario(tx, fixture);
    const receiptId = randomUUID();

    await tx.receipt.create({
      data: {
        id: receiptId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        posReceiptNumber: receiptNumber,
        normalizedPosReceiptNumber: receiptNumber,
        receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
        purchaseAmountKobo: 30_000n,
        occurredAt: now,
        capturedByTenantId: fixture.tenantId,
        capturedBy: fixture.userId,
        capturedAt: now,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        reviewedAt: now,
        reviewedByTenantId: fixture.tenantId,
        reviewedBy: fixture.userId,
        approvedAt: now,
        approvedByTenantId: fixture.tenantId,
        approvedBy: fixture.userId,
      },
    });

    const redemptionId = randomUUID();
    const debitLedgerEntryId = randomUUID();

    await tx.loyaltyLedgerEntry.create({
      data: {
        id: debitLedgerEntryId,
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId,
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
        requestedBy: fixture.userId,
        requestedAmountKobo: debitAmountKobo,
        basketAmountKobo: 30_000n,
        maximumAllowedKobo: 9_000n,
        confirmedAmountKobo: debitAmountKobo,
        status: RedemptionStatus.CONFIRMED,
        policyVersion: 'policy-v1',
        ledgerEntryId: debitLedgerEntryId,
        requestedAt: now,
        confirmedAt: now,
      },
    });

    const allocationId = randomUUID();

    await tx.redemptionAllocation.create({
      data: {
        id: allocationId,
        tenantId: fixture.tenantId,
        redemptionId,
        redemptionLedgerEntryId: debitLedgerEntryId,
        creditLotId: scenario.creditLotId,
        amountKobo: debitAmountKobo,
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
      data: { remainingAmountKobo: { decrement: debitAmountKobo } },
    });

    return { receiptId, redemptionId, debitLedgerEntryId, allocationId };
  });
}

async function createRedemptionScenario(
  tx: Prisma.TransactionClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const now = new Date();
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

  return { creditLotId: creditLot.id, now };
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
