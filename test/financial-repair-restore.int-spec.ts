import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

type ExecablePostgresContainer = Awaited<
  ReturnType<PostgreSqlContainer['start']>
> & {
  startedTestContainer: {
    getId(): string;
  };
};

const restoreBackupCutoffMigration =
  '20260803_adjustment_linkage_and_repair_followup';

describe('financial repair restore verification (int)', () => {
  it('reconciles restored migration objects and historical adjustment evidence', async () => {
    const restore = await new PostgreSqlContainer('postgres:16-alpine').start();
    const restorePrisma = new PrismaClient({
      datasources: { db: { url: restore.getConnectionUri() } },
    });

    try {
      restoreDatabase(
        restore as ExecablePostgresContainer,
        await loadRestoreBackupDump(),
      );
      restoreDatabase(
        restore as ExecablePostgresContainer,
        readFileSync(
          join(
            process.cwd(),
            'prisma',
            'migrations',
            '20260803_adjustment_linkage_and_repair_followup',
            'migration.sql',
          ),
        ),
      );

      await restorePrisma.$connect();

      const committedMigrations = readCommittedMigrationInventory();
      for (const migration of committedMigrations) {
        execSync(
          `npx prisma migrate resolve --applied "${migration.migration_name}"`,
          {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: restore.getConnectionUri() },
          },
        );
      }

      const restoredMigrations = await readMigrationInventory(restorePrisma);
      expect(restoredMigrations).toEqual(committedMigrations);

      const functions = await restorePrisma.$queryRaw<{ proname: string }[]>`
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'validate_credit_lot_source',
            'prevent_credit_lot_source_mutation',
            'validate_credit_lot_balance_evidence_for_lot',
            'validate_allocation_restoration_commit_state',
            'validate_ledger_entry_commit_state',
            'prevent_adjustment_evidence_mutation',
            'prevent_adjustment_orphan_mutation',
            'validate_adjustment_ledger_source'
          )
        ORDER BY p.proname
      `;
      const triggers = await restorePrisma.$queryRaw<
        {
          tgname: string;
          tgenabled: string;
          tgdeferrable: boolean;
          tginitdeferred: boolean;
        }[]
      >`
        SELECT tgname, tgenabled, tgdeferrable, tginitdeferred
        FROM pg_trigger
        WHERE tgname IN (
          'validate_credit_lot_source_insert',
          'validate_credit_lot_source_update',
          'prevent_credit_lot_source_update',
          'validate_allocation_restoration_commit_state_insert',
          'validate_ledger_entry_commit_state_insert',
          'prevent_adjustment_evidence_update',
          'prevent_adjustment_orphan_insert_update',
          'validate_adjustment_ledger_source_insert_update'
        )
        ORDER BY tgname
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
          'prevent_adjustment_orphan_mutation',
          'prevent_credit_lot_source_mutation',
          'validate_adjustment_ledger_source',
          'validate_credit_lot_balance_evidence_for_lot',
        ]),
      );
      expect(triggers.map((row) => row.tgname)).toEqual(
        expect.arrayContaining([
          'prevent_adjustment_orphan_insert_update',
          'validate_adjustment_ledger_source_insert_update',
        ]),
      );
      expect(
        triggers.find(
          (row) =>
            row.tgname === 'validate_adjustment_ledger_source_insert_update',
        ),
      ).toMatchObject({
        tgenabled: 'O',
        tgdeferrable: false,
        tginitdeferred: false,
      });
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
            tenantId: '00000000-0000-4000-8000-000000000101',
            id: '00000000-0000-4000-8000-000000000108',
          },
        },
      });
      const restoredLedger = await restorePrisma.loyaltyLedgerEntry.findUnique({
        where: {
          tenantId_id: {
            tenantId: '00000000-0000-4000-8000-000000000101',
            id: '00000000-0000-4000-8000-000000000109',
          },
        },
      });
      const restoredCreditLot = await restorePrisma.creditLot.findUnique({
        where: {
          tenantId_id: {
            tenantId: '00000000-0000-4000-8000-000000000101',
            id: '00000000-0000-4000-8000-000000000110',
          },
        },
      });

      expect(restoredAdjustment).toMatchObject({
        kind: AdjustmentKind.CREDIT,
        amountKobo: 4_000n,
        effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        ledgerEntryId: '00000000-0000-4000-8000-000000000109',
      });
      expect(restoredLedger).toMatchObject({
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 4_000n,
        effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      });
      expect(restoredCreditLot).toMatchObject({
        originalAmountKobo: 4_000n,
        remainingAmountKobo: 4_000n,
        earnedAt: new Date('2026-07-26T12:00:00.000Z'),
      });
    } finally {
      await restorePrisma.$disconnect();
      await restore.stop();
    }
  }, 180000);

  it('rejects adjustment evidence mismatches and immutable-field updates', async () => {
    const container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();
    const databaseUrl = container.getConnectionUri();
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      migrateDeploy(databaseUrl);
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
      ).rejects.toThrow(/adjustment must match its adjustment ledger entry/i);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.loyaltyLedgerEntry.create({
            data: {
              id: fixture.mismatchCustomerLedgerId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: 4_000n,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: `adjustment-customer-mismatch-${fixture.mismatchCustomerLedgerId}`,
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.adjustment.create({
            data: {
              id: fixture.mismatchCustomerAdjustmentId,
              tenantId: fixture.tenantId,
              customerId: fixture.otherCustomerId,
              kind: AdjustmentKind.CREDIT,
              amountKobo: 4_000n,
              reason: 'Customer mismatch',
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              ledgerEntryId: fixture.mismatchCustomerLedgerId,
              effectiveAt: fixture.effectiveAt,
            },
          });
        }),
      ).rejects.toThrow(/adjustment must match its adjustment ledger entry/i);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.loyaltyLedgerEntry.create({
            data: {
              id: fixture.mismatchEffectiveAtLedgerId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: 4_000n,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: `adjustment-effective-at-mismatch-${fixture.mismatchEffectiveAtLedgerId}`,
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.adjustment.create({
            data: {
              id: fixture.mismatchEffectiveAtAdjustmentId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              kind: AdjustmentKind.CREDIT,
              amountKobo: 4_000n,
              reason: 'Effective-at mismatch',
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              ledgerEntryId: fixture.mismatchEffectiveAtLedgerId,
              effectiveAt: new Date('2026-07-26T12:15:00.000Z'),
            },
          });
        }),
      ).rejects.toThrow(/adjustment must match its adjustment ledger entry/i);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.loyaltyLedgerEntry.create({
            data: {
              id: fixture.mismatchLedgerKindId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              type: LedgerEntryType.EARN,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: 4_000n,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: `adjustment-kind-source-${fixture.mismatchLedgerKindId}`,
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              effectiveAt: fixture.effectiveAt,
            },
          });

          await tx.adjustment.create({
            data: {
              id: fixture.mismatchLedgerKindAdjustmentId,
              tenantId: fixture.tenantId,
              customerId: fixture.customerId,
              kind: AdjustmentKind.CREDIT,
              amountKobo: 4_000n,
              reason: 'Unsupported ledger kind',
              createdByTenantId: fixture.tenantId,
              createdBy: fixture.userId,
              ledgerEntryId: fixture.mismatchLedgerKindId,
              effectiveAt: fixture.effectiveAt,
            },
          });
        }),
      ).rejects.toThrow(/adjustment must match its adjustment ledger entry/i);

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
      ).rejects.toThrow(/adjustment must match its adjustment ledger entry/i);

      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO "Adjustment" (
            "id",
            "tenantId",
            "customerId",
            "kind",
            "amountKobo",
            "reason",
            "createdByTenantId",
            "createdBy",
            "ledgerEntryId",
            "effectiveAt"
          ) VALUES (
            '${fixture.mutableAdjustmentId}',
            '${fixture.tenantId}',
            '${fixture.customerId}',
            'CREDIT',
            4000,
            'Orphan adjustment',
            '${fixture.tenantId}',
            '${fixture.userId}',
            NULL,
            '${fixture.effectiveAt.toISOString()}'
          )`,
        ),
      ).rejects.toThrow(/adjustment must reference a ledger entry/i);

      const mutableLedgerId = '00000000-0000-4000-8000-000000000116';

      const adjustment = await prisma.$transaction(async (tx) => {
        await tx.loyaltyLedgerEntry.create({
          data: {
            id: mutableLedgerId,
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            type: LedgerEntryType.ADJUSTMENT,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: 4_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `adjustment-mutable-${mutableLedgerId}`,
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.userId,
            effectiveAt: fixture.effectiveAt,
          },
        });

        const createdAdjustment = await tx.adjustment.create({
          data: {
            id: fixture.mutableAdjustmentId,
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            kind: AdjustmentKind.CREDIT,
            amountKobo: 4_000n,
            reason: 'Immutable adjustment',
            createdByTenantId: fixture.tenantId,
            createdBy: fixture.userId,
            ledgerEntryId: mutableLedgerId,
            effectiveAt: fixture.effectiveAt,
          },
        });

        await tx.creditLot.create({
          data: {
            id: '00000000-0000-4000-8000-000000000117',
            tenantId: fixture.tenantId,
            customerId: fixture.customerId,
            earnLedgerEntryId: mutableLedgerId,
            originalAmountKobo: 4_000n,
            remainingAmountKobo: 4_000n,
            earnedAt: fixture.effectiveAt,
            expiresAt: addMonthsUtc(fixture.effectiveAt, 12),
          },
        });

        return createdAdjustment;
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

function migrateDeploy(databaseUrl: string) {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function readMigrationInventory(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<
    { migration_name: string; checksum: string }[]
  >`
    SELECT migration_name, checksum
    FROM "_prisma_migrations"
    ORDER BY migration_name
  `;
  return rows;
}

async function loadRestoreBackupDump(): Promise<Buffer> {
  return buildLocalRestoreBackupDump();
}

async function buildLocalRestoreBackupDump(): Promise<Buffer> {
  const source = await new PostgreSqlContainer('postgres:16-alpine').start();
  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: source.getConnectionUri() } },
  });

  const tempRoot = mkdtempSync(join(tmpdir(), 'financial-repair-restore-'));
  const tempPrismaRoot = join(tempRoot, 'prisma');
  const tempMigrationsRoot = join(tempPrismaRoot, 'migrations');
  const tempSchemaPath = join(tempPrismaRoot, 'schema.prisma');

  try {
    mkdirSync(tempMigrationsRoot, { recursive: true });
    cpSync(join(process.cwd(), 'prisma', 'schema.prisma'), tempSchemaPath);

    for (const entry of readdirSync(
      join(process.cwd(), 'prisma', 'migrations'),
    ).sort()) {
      if (entry === restoreBackupCutoffMigration) {
        break;
      }

      const sourcePath = join(process.cwd(), 'prisma', 'migrations', entry);
      if (!statSync(sourcePath).isDirectory()) {
        continue;
      }

      cpSync(sourcePath, join(tempMigrationsRoot, entry), { recursive: true });
    }

    await sourcePrisma.$connect();
    execSync(`npx prisma migrate deploy --schema "${tempSchemaPath}"`, {
      env: { ...process.env, DATABASE_URL: source.getConnectionUri() },
      stdio: 'inherit',
    });

    await seedAdjustmentFixture(sourcePrisma);

    const sourceId = (
      source as ExecablePostgresContainer
    ).startedTestContainer.getId();
    const dumpEnv = {
      ...process.env,
      PGPASSWORD: source.getPassword(),
    };

    const schemaDump = execFileSync(
      'docker',
      [
        'exec',
        '-i',
        '-e',
        `PGPASSWORD=${source.getPassword()}`,
        sourceId,
        'pg_dump',
        '--schema-only',
        '--no-owner',
        '--no-privileges',
        '--exclude-table=_prisma_migrations',
        '-h',
        '127.0.0.1',
        '-U',
        source.getUsername(),
        '-d',
        source.getDatabase(),
      ],
      { env: dumpEnv, maxBuffer: 50 * 1024 * 1024 },
    );

    const dataDump = execFileSync(
      'docker',
      [
        'exec',
        '-i',
        '-e',
        `PGPASSWORD=${source.getPassword()}`,
        sourceId,
        'pg_dump',
        '--data-only',
        '--column-inserts',
        '--no-owner',
        '--no-privileges',
        '--exclude-table=_prisma_migrations',
        '-h',
        '127.0.0.1',
        '-U',
        source.getUsername(),
        '-d',
        source.getDatabase(),
      ],
      { env: dumpEnv, maxBuffer: 50 * 1024 * 1024 },
    );

    return Buffer.concat([schemaDump, Buffer.from('\n'), dataDump]);
  } finally {
    await sourcePrisma.$disconnect();
    await source.stop();
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

function readCommittedMigrationInventory() {
  return readdirSync(join(process.cwd(), 'prisma', 'migrations'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      migration_name: entry.name,
      checksum: createHash('sha256')
        .update(
          readFileSync(
            join(
              process.cwd(),
              'prisma',
              'migrations',
              entry.name,
              'migration.sql',
            ),
          ),
        )
        .digest('hex'),
    }))
    .sort((left, right) =>
      left.migration_name.localeCompare(right.migration_name),
    );
}

function restoreDatabase(container: ExecablePostgresContainer, backup: Buffer) {
  const schemaBootstrap = Buffer.from(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres SUPERUSER LOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE SCHEMA IF NOT EXISTS "vault";
`,
  );
  const sanitizedBackup = Buffer.from(
    Buffer.concat([schemaBootstrap, backup])
      .toString('utf8')
      .replace(
        /^CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";\s*$/gm,
        '',
      ),
  );
  const replayBackup = Buffer.from(
    sanitizedBackup
      .toString('utf8')
      .replace(
        /^ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";\s*$/gm,
        '',
      ),
  );
  const replayableBackup = Buffer.from(
    replayBackup
      .toString('utf8')
      .replace(/^SET transaction_timeout = 0;\s*$/gm, ''),
  );
  const trustedRestoreBackup = Buffer.concat([
    Buffer.from('SET session_replication_role = replica;\n'),
    replayableBackup,
    Buffer.from('\nSET session_replication_role = origin;\n'),
  ]);

  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${container.getPassword()}`,
      container.startedTestContainer.getId(),
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: trustedRestoreBackup, maxBuffer: 50 * 1024 * 1024 },
  );
}

async function seedAdjustmentFixture(prisma: PrismaClient) {
  const tenantId = '00000000-0000-4000-8000-000000000101';
  const branchId = '00000000-0000-4000-8000-000000000102';
  const userId = '00000000-0000-4000-8000-000000000103';
  const customerId = '00000000-0000-4000-8000-000000000104';
  const otherCustomerId = '00000000-0000-4000-8000-00000000010a';
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
  await prisma.customer.create({
    data: {
      id: otherCustomerId,
      tenantId,
      branchId,
      fullName: 'Repair Fixture Alternate Customer',
      phoneE164: '+2348000000102',
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
    mismatchCustomerAdjustmentId: '00000000-0000-4000-8000-000000000116',
    mismatchCustomerLedgerId: '00000000-0000-4000-8000-000000000117',
    mismatchEffectiveAtAdjustmentId: '00000000-0000-4000-8000-000000000118',
    mismatchEffectiveAtLedgerId: '00000000-0000-4000-8000-000000000119',
    mismatchLedgerKindAdjustmentId: '00000000-0000-4000-8000-000000000120',
    mismatchLedgerKindId: '00000000-0000-4000-8000-000000000121',
    otherCustomerId,
  };
}

function addMonthsUtc(date: Date, months: number) {
  const copy = new Date(date.getTime());
  const originalDay = copy.getUTCDate();
  copy.setUTCMonth(copy.getUTCMonth() + months, 1);
  const lastDay = new Date(
    Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth() + 1, 0),
  ).getUTCDate();
  copy.setUTCDate(Math.min(originalDay, lastDay));
  return copy;
}
