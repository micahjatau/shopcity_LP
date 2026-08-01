import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AdjustmentKind,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('financial repair restore verification (int)', () => {
  it('reconciles restored migration objects and historical adjustment evidence', async () => {
    const source = await new PostgreSqlContainer('postgres:16-alpine').start();
    const sourceUrl = source.getConnectionUri();
    const sourcePrisma = new PrismaClient({
      datasources: { db: { url: sourceUrl } },
    });

    try {
      await migrateDeploy(sourceUrl);
      await sourcePrisma.$connect();
      const fixture = await seedAdjustmentFixture(sourcePrisma);

      const sourceMigrations = await readMigrationInventory(sourcePrisma);
      expect(sourceMigrations.map((row) => row.migration_name)).toEqual(
        readCommittedMigrationFolders(),
      );

      const restore = await new PostgreSqlContainer('postgres:16-alpine').start();
      const restoreUrl = restore.getConnectionUri();
      const restorePrisma = new PrismaClient({
        datasources: { db: { url: restoreUrl } },
      });

      try {
        await migrateDeploy(restoreUrl);

        await restorePrisma.$connect();
        const restoredFixture = await seedAdjustmentFixture(restorePrisma);

        const restoredMigrations = await readMigrationInventory(restorePrisma);
        expect(restoredMigrations).toEqual(sourceMigrations);

        const functions = await restorePrisma.$queryRaw<{ proname: string }[]>`
          SELECT p.proname
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN (
              'validate_credit_lot_source',
              'prevent_credit_lot_source_mutation',
              'validate_allocation_restoration_commit_state',
              'validate_ledger_entry_commit_state',
              'prevent_adjustment_evidence_mutation'
            )
          ORDER BY p.proname
        `;
        const triggers = await restorePrisma.$queryRaw<
          { tgname: string; tgenabled: string; tgdeferrable: boolean; tginitdeferred: boolean }[]
        >`
          SELECT tgname, tgenabled, tgdeferrable, tginitdeferred
          FROM pg_trigger
          WHERE tgname IN (
            'validate_credit_lot_source_insert',
            'validate_credit_lot_source_update',
            'prevent_credit_lot_source_update',
            'validate_allocation_restoration_commit_state_insert',
            'validate_ledger_entry_commit_state_insert',
            'prevent_adjustment_evidence_update'
          )
          ORDER BY tgname
        `;
        const constraints = await restorePrisma.$queryRaw<{ conname: string }[]>`
          SELECT conname
          FROM pg_constraint
          WHERE conname = 'RedemptionAllocation_target_xor_check'
        `;
        const indexes = await restorePrisma.$queryRaw<{ indexname: string }[]>`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'Adjustment_tenantId_ledgerEntryId_key',
              'Adjustment_tenantId_customerId_effectiveAt_idx',
              'RedemptionAllocation_tenantId_adjustmentId_idx'
            )
          ORDER BY indexname
        `;

        expect(functions.map((row) => row.proname)).toEqual(
          expect.arrayContaining([
            'prevent_adjustment_evidence_mutation',
            'prevent_credit_lot_source_mutation',
            'validate_allocation_restoration_commit_state',
            'validate_credit_lot_source',
            'validate_ledger_entry_commit_state',
          ]),
        );
        expect(triggers.map((row) => row.tgname)).toEqual(
          expect.arrayContaining([
            'prevent_adjustment_evidence_update',
            'prevent_credit_lot_source_update',
            'validate_allocation_restoration_commit_state_insert',
            'validate_credit_lot_source_insert',
            'validate_credit_lot_source_update',
            'validate_ledger_entry_commit_state_insert',
          ]),
        );
        expect(triggers.find((row) => row.tgname === 'validate_ledger_entry_commit_state_insert')).toMatchObject({
          tgenabled: 'O',
          tgdeferrable: true,
          tginitdeferred: true,
        });
        expect(
          triggers.find((row) => row.tgname === 'validate_allocation_restoration_commit_state_insert'),
        ).toMatchObject({
          tgenabled: 'O',
          tgdeferrable: true,
          tginitdeferred: true,
        });
        expect(constraints.map((row) => row.conname)).toContain(
          'RedemptionAllocation_target_xor_check',
        );
        expect(indexes.map((row) => row.indexname)).toEqual(
          expect.arrayContaining([
            'Adjustment_tenantId_ledgerEntryId_key',
            'Adjustment_tenantId_customerId_effectiveAt_idx',
            'RedemptionAllocation_tenantId_adjustmentId_idx',
          ]),
        );

        const restoredAdjustment = await restorePrisma.adjustment.findUnique({
          where: {
            tenantId_id: {
              tenantId: restoredFixture.tenantId,
              id: restoredFixture.adjustment.id,
            },
          },
        });
        const restoredLedger = await restorePrisma.loyaltyLedgerEntry.findUnique({
          where: {
            tenantId_id: {
              tenantId: restoredFixture.tenantId,
              id: restoredFixture.ledgerEntry.id,
            },
          },
        });
        const restoredCreditLot = await restorePrisma.creditLot.findUnique({
          where: {
            tenantId_id: {
              tenantId: restoredFixture.tenantId,
              id: restoredFixture.creditLot.id,
            },
          },
        });

        expect(restoredAdjustment).toMatchObject({
          kind: AdjustmentKind.CREDIT,
          amountKobo: 4_000n,
          effectiveAt: restoredFixture.effectiveAt,
          ledgerEntryId: restoredFixture.ledgerEntry.id,
        });
        expect(restoredLedger).toMatchObject({
          type: LedgerEntryType.ADJUSTMENT,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 4_000n,
          effectiveAt: restoredFixture.effectiveAt,
        });
        expect(restoredCreditLot).toMatchObject({
          originalAmountKobo: 4_000n,
          remainingAmountKobo: 4_000n,
          earnedAt: restoredFixture.effectiveAt,
        });
      } finally {
        await restorePrisma.$disconnect();
        await restore.stop();
      }
    } finally {
      await sourcePrisma.$disconnect();
      await source.stop();
    }
  }, 180000);

  it('rejects adjustment evidence mismatches and immutable-field updates', async () => {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      await migrateDeploy(databaseUrl);
      await prisma.$connect();
      const fixture = await seedAdjustmentFixture(prisma);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.loyaltyLedgerEntry.create({
            data: {
              id: fixture.mismatchKindLedgerId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: 4_000n,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: `adjustment-kind-mismatch-${fixture.mismatchKindLedgerId}`,
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.adjustment.create({
            data: {
              id: fixture.mismatchKindAdjustmentId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              kind: AdjustmentKind.DEBIT,
              amountKobo: 4_000n,
              reason: 'Kind mismatch',
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              ledgerEntryId: fixture.mismatchKindLedgerId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.creditLot.create({
            data: {
              id: '00000000-0000-4000-8000-000000000116',
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              earnLedgerEntryId: fixture.mismatchKindLedgerId,
              originalAmountKobo: 4_000n,
              remainingAmountKobo: 4_000n,
              earnedAt: fixture.effectiveAt,
              expiresAt: addMonthsUtc(fixture.effectiveAt, 12),
            },
          });
        }),
      ).rejects.toThrow(/adjustment evidence must match its ledger entry/i);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.loyaltyLedgerEntry.create({
            data: {
              id: fixture.mismatchAmountLedgerId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: 4_000n,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: `adjustment-amount-mismatch-${fixture.mismatchAmountLedgerId}`,
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.adjustment.create({
            data: {
              id: fixture.mismatchAmountAdjustmentId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              kind: AdjustmentKind.CREDIT,
              amountKobo: 4_001n,
              reason: 'Amount mismatch',
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              ledgerEntryId: fixture.mismatchAmountLedgerId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.creditLot.create({
            data: {
              id: '00000000-0000-4000-8000-000000000117',
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              earnLedgerEntryId: fixture.mismatchAmountLedgerId,
              originalAmountKobo: 4_000n,
              remainingAmountKobo: 4_000n,
              earnedAt: fixture.effectiveAt,
              expiresAt: addMonthsUtc(fixture.effectiveAt, 12),
            },
          });
        }),
      ).rejects.toThrow(/adjustment evidence must match its ledger entry/i);

      const adjustment = await prisma.adjustment.create({
        data: {
          id: fixture.mutableAdjustmentId,
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          kind: AdjustmentKind.CREDIT,
          amountKobo: 4_000n,
          reason: 'Immutable adjustment',
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          ledgerEntryId: null,
          effectiveAt: fixture.effectiveAt,
        },
      });

      await expect(
        prisma.adjustment.update({
          where: {
            tenantId_id: { tenantId: fixture.tenantId, id: adjustment.id },
          },
          data: {
            amountKobo: 4_500n,
          },
        }),
      ).rejects.toThrow(/adjustment evidence fields are immutable/i);
    } finally {
      await prisma.$disconnect();
      await container.stop();
    }
  }, 180000);
});

async function migrateDeploy(databaseUrl: string) {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function readMigrationInventory(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<{ migration_name: string; checksum: string }[]>`
    SELECT migration_name, checksum
    FROM "_prisma_migrations"
    ORDER BY migration_name
  `;
  return rows;
}

function readCommittedMigrationFolders() {
  return readdirSync(join(process.cwd(), 'prisma', 'migrations'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function seedAdjustmentFixture(prisma: PrismaClient) {
  const tenantId = '00000000-0000-4000-8000-000000000101';
  const branchId = '00000000-0000-4000-8000-000000000102';
  const userId = '00000000-0000-4000-8000-000000000103';
  const customerId = '00000000-0000-4000-8000-000000000104';
  const cardId = '00000000-0000-4000-8000-000000000105';
  const deviceId = '00000000-0000-4000-8000-000000000106';
  const receiptId = '00000000-0000-4000-8000-000000000107';
  const adjustmentId = '00000000-0000-4000-8000-000000000108';
  const ledgerEntryId = '00000000-0000-4000-8000-000000000109';
  const creditLotId = '00000000-0000-4000-8000-000000000110';
  const effectiveAt = new Date('2026-07-26T12:00:00.000Z');

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Repair Fixture Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Repair Fixture Branch',
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
      username: 'repair.fixture@example.com',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Repair Fixture Customer',
      phoneE164: '+2348000000101',
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
      barcodeValue: 'CARD-REPAIR-FIXTURE',
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
      name: 'Repair Fixture Device',
      fingerprintHash: 'repair-fixture-device',
      status: 'ACTIVE',
    },
  });
  await prisma.receipt.create({
    data: {
      id: receiptId,
      tenantId,
      branchId,
      customerId,
      cardId,
      deviceId,
      posReceiptNumber: 'POS-REPAIR-FIXTURE',
      normalizedPosReceiptNumber: 'POS-REPAIR-FIXTURE',
      receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
      purchaseAmountKobo: 30_000n,
      occurredAt: effectiveAt,
      capturedByTenantId: tenantId,
      capturedBy: userId,
      capturedAt: effectiveAt,
      captureStatus: ReceiptCaptureStatus.PENDING_APPROVAL,
      reviewStatus: ReceiptReviewStatus.PENDING,
    },
  });

  await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        id: ledgerEntryId,
        tenantId,
        customerId,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 4_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `repair-fixture-${ledgerEntryId}`,
        createdByTenantId: tenantId,
        createdBy: userId,
        effectiveAt,
      },
    });

    await tx.adjustment.create({
      data: {
        id: adjustmentId,
        tenantId,
        customerId,
        kind: AdjustmentKind.CREDIT,
        amountKobo: 4_000n,
        reason: 'Repair fixture adjustment',
        createdByTenantId: tenantId,
        createdBy: userId,
        ledgerEntryId,
        effectiveAt,
      },
    });

    await tx.creditLot.create({
      data: {
        id: creditLotId,
        tenantId,
        customerId,
        earnLedgerEntryId: ledgerEntry.id,
        originalAmountKobo: 4_000n,
        remainingAmountKobo: 4_000n,
        earnedAt: effectiveAt,
        expiresAt: addMonthsUtc(effectiveAt, 12),
      },
    });
  });

  return {
    tenantId,
    customerId,
    userId,
    effectiveAt,
    adjustment: {
      id: adjustmentId,
    },
    ledgerEntry: {
      id: ledgerEntryId,
    },
    creditLot: {
      id: creditLotId,
    },
    mismatchKindAdjustmentId: '00000000-0000-4000-8000-000000000111',
    mismatchKindLedgerId: '00000000-0000-4000-8000-000000000112',
    mismatchAmountAdjustmentId: '00000000-0000-4000-8000-000000000113',
    mismatchAmountLedgerId: '00000000-0000-4000-8000-000000000114',
    mutableAdjustmentId: '00000000-0000-4000-8000-000000000115',
  };
}

function addMonthsUtc(date: Date, months: number) {
  const copy = new Date(date.getTime());
  const originalDay = copy.getUTCDate();
  copy.setUTCMonth(copy.getUTCMonth() + months, 1);
  const lastDay = new Date(Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth() + 1, 0)).getUTCDate();
  copy.setUTCDate(Math.min(originalDay, lastDay));
  return copy;
}
