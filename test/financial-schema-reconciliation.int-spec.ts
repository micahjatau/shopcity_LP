import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
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
import { AuditService } from '../src/modules/audit/audit.service';
import { CreditExpiryService } from '../src/modules/credit-expiry/credit-expiry.service';
import {
  SystemActorService,
  SYSTEM_USERNAME,
} from '../src/common/system/system-actor.service';

const repositoryRoot = resolve(__dirname, '..');
const reconciliationMigration =
  '20261126120000_preview_financial_schema_reconciliation';
const dueAt = new Date('2027-08-01T10:00:00.000Z');
const amountKobo = 10_000n;

const missingTriggers = [
  ['AllocationRestoration', 'prevent_allocation_restoration_delete'],
  ['AllocationRestoration', 'prevent_allocation_restoration_update'],
  ['AllocationRestoration', 'validate_allocation_restoration_total_insert'],
  ['CreditExpiry', 'prevent_credit_expiry_delete'],
  ['CreditExpiry', 'prevent_credit_expiry_update'],
  ['CreditExpiry', 'validate_credit_expiry_commit_state_insert'],
  ['CreditLot', 'prevent_credit_lot_delete'],
  ['CreditLot', 'validate_credit_lot_balance_evidence_update'],
  ['CreditLot', 'validate_credit_lot_lifecycle_insert'],
  ['CreditLot', 'validate_credit_lot_lifecycle_update'],
  ['LoyaltyLedgerEntry', 'prevent_confirmed_ledger_delete'],
  ['LoyaltyLedgerEntry', 'prevent_confirmed_ledger_update'],
  ['Receipt', 'prevent_receipt_evidence_update'],
  ['Redemption', 'prevent_redemption_evidence_update'],
  ['RedemptionAllocation', 'prevent_redemption_allocation_delete'],
  ['RedemptionAllocation', 'prevent_redemption_allocation_update'],
  [
    'RedemptionAllocation',
    'validate_redemption_allocation_commit_state_insert',
  ],
] as const;

const missingChecks = [
  ['Adjustment', 'Adjustment_amountKobo_positive_check'],
  ['Adjustment', 'Adjustment_reason_nonempty_check'],
  ['AllocationRestoration', 'AllocationRestoration_amountKobo_positive_check'],
  ['Approval', 'Approval_financial_state_machine_check'],
  ['Approval', 'Approval_target_xor_check'],
  ['AuditLog', 'AuditLog_actor_pair_check'],
  ['AuditLog', 'AuditLog_actor_tenant_match_check'],
  ['CreditExpiry', 'CreditExpiry_amountKobo_positive_check'],
  ['CreditLot', 'CreditLot_originalAmountKobo_positive_check'],
  ['CreditLot', 'CreditLot_remainingAmountKobo_nonnegative_check'],
  ['CreditLot', 'CreditLot_remainingAmountKobo_not_exceed_original_check'],
  ['LoyaltyLedgerEntry', 'LoyaltyLedgerEntry_amountKobo_positive_check'],
  ['Receipt', 'Receipt_purchaseAmountKobo_positive_check'],
  ['Redemption', 'Redemption_basketAmountKobo_positive_check'],
  ['Redemption', 'Redemption_confirmedAmountKobo_positive_check'],
  ['Redemption', 'Redemption_financial_state_machine_check'],
  ['Redemption', 'Redemption_maximumAllowedKobo_nonnegative_check'],
  ['Redemption', 'Redemption_requestedAmountKobo_positive_check'],
  ['RedemptionAllocation', 'RedemptionAllocation_amountKobo_positive_check'],
] as const;

const missingFunctions = [
  'prevent_allocation_restoration_mutation()',
  'prevent_confirmed_ledger_mutation()',
  'prevent_credit_expiry_mutation()',
  'prevent_credit_lot_delete()',
  'prevent_receipt_evidence_mutation()',
  'prevent_redemption_allocation_mutation()',
  'prevent_redemption_evidence_mutation()',
  'validate_allocation_restoration_total()',
  'validate_credit_expiry_commit_state()',
  'validate_credit_lot_balance_evidence()',
  'validate_credit_lot_lifecycle()',
  'validate_debit_allocation_invariants_for_ledger(text, text)',
  'validate_redemption_allocation_commit_state()',
] as const;

const previewTables = [
  'AuditLog',
  'Receipt',
  'Approval',
  'CreditExpiry',
  'CreditLot',
  'LoyaltyLedgerEntry',
  'RedemptionAllocation',
  'AllocationRestoration',
  'Adjustment',
  'Redemption',
] as const;

describe('financial schema reconciliation (PostgreSQL 17.6 integration)', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let service: CreditExpiryService;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17.6-alpine')
      .withDatabase('shopcity_reconciliation')
      .withUsername('shopcity_test')
      .withPassword('local_only')
      .start();
    databaseUrl = container.getConnectionUri();
    execSync('npx prisma migrate deploy', {
      cwd: repositoryRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  }, 120_000);

  it('repairs Preview-shaped drift atomically and preserves F1 financial invariants', async () => {
    const version = await prisma.$queryRaw<{ version: string }[]>`
      SELECT current_setting('server_version') AS version
    `;
    expect(version[0]?.version).toBe('17.6');

    await simulatePreviewDrift(prisma);
    const fixture = await createFixture(prisma);
    service = new CreditExpiryService(
      prisma as never,
      new AuditService(prisma as never),
      new SystemActorService(),
    );
    const beforeFailure = await readFixtureState(prisma, fixture);

    let observedError: unknown;
    try {
      await service.expireDueCredit({ now: dueAt, batchSize: 10 });
    } catch (error) {
      observedError = error;
    }
    expect(observedError).toBeInstanceOf(Error);
    expect((observedError as Error).constructor.name).toBe(
      'PrismaClientUnknownRequestError',
    );
    const databaseError = observedError as Error & {
      meta?: { message?: string };
      cause?: { message?: string };
    };
    expect(
      [
        databaseError.message,
        databaseError.meta?.message,
        databaseError.cause?.message,
      ].join(' '),
    ).toMatch(/unsupported ledger type\/direction combination/i);
    expect(await readFixtureState(prisma, fixture)).toEqual(beforeFailure);

    await applyReconciliationSql(container);
    await applyReconciliationSql(container);
    service = new CreditExpiryService(
      prisma as never,
      new AuditService(prisma as never),
      new SystemActorService(),
    );

    const inventory = await readGuardInventory(prisma);
    expect(inventory.triggerCount).toBe(25);
    expect(inventory.checkCount).toBe(20);
    expect(inventory.reconciledFunctionCount).toBe(15);
    expect(inventory.rlsTableCount).toBe(previewTables.length);
    expect(inventory.policyCount).toBe(0);
    expect(inventory.preservedPreviewForeignKeys).toBe(2);
    expect(inventory.preservedPreviewIndex).toBe(1);
    expect(inventory.preservedRls).toBe(true);
    expect(inventory.reconciliationHistoryRows).toBe(1);

    await expect(
      service.expireDueCredit({ now: dueAt, batchSize: 10 }),
    ).resolves.toEqual({
      examined: 1,
      expiredLots: 1,
      expiredAmountKobo: amountKobo,
    });
    const afterExpiry = await readFixtureState(prisma, fixture);
    expect(afterExpiry).toMatchObject({
      remainingAmountKobo: '0',
      expiryCount: 1,
      expiryLedgerCount: 1,
      auditCount: 1,
      confirmedCreditKobo: '10000',
      confirmedDebitKobo: '10000',
    });

    await expect(
      service.expireDueCredit({ now: dueAt, batchSize: 10 }),
    ).resolves.toEqual({
      examined: 0,
      expiredLots: 0,
      expiredAmountKobo: 0n,
    });
    expect(await readFixtureState(prisma, fixture)).toEqual(afterExpiry);

    const expiry = await prisma.creditExpiry.findFirstOrThrow({
      where: { tenantId: fixture.tenantId, creditLotId: fixture.lotId },
    });
    await expect(
      prisma.creditExpiry.update({
        where: { tenantId_id: { tenantId: fixture.tenantId, id: expiry.id } },
        data: { amountKobo: 9_000n },
      }),
    ).rejects.toThrow(/credit expiry evidence is immutable/i);
    await expect(
      prisma.creditLot.update({
        where: {
          tenantId_id: { tenantId: fixture.tenantId, id: fixture.lotId },
        },
        data: { remainingAmountKobo: 9_999n },
      }),
    ).rejects.toThrow(
      /credit lot remaining balance must match allocation, restoration, and expiry evidence/i,
    );
    expect(await readFixtureState(prisma, fixture)).toEqual(afterExpiry);
  }, 180_000);
});

async function applyReconciliationSql(
  container: Awaited<ReturnType<PostgreSqlContainer['start']>>,
): Promise<void> {
  const migrationPath = resolve(
    repositoryRoot,
    'prisma/migrations',
    reconciliationMigration,
    'migration.sql',
  );
  await container.copyContentToContainer([
    {
      content: readFileSync(migrationPath, 'utf8'),
      target: '/tmp/reconciliation.sql',
    },
  ]);
  const result = await container.exec(
    [
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-f',
      '/tmp/reconciliation.sql',
    ],
    { env: { PGPASSWORD: container.getPassword() } },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Reconciliation SQL failed in disposable PostgreSQL: ${result.output}`,
    );
  }
}

async function simulatePreviewDrift(prisma: PrismaClient): Promise<void> {
  for (const [table, trigger] of missingTriggers) {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${trigger}" ON public."${table}"`,
    );
  }
  for (const [table, constraint] of missingChecks) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public."${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`,
    );
  }
  for (const signature of missingFunctions) {
    const separator = signature.indexOf('(');
    const name = signature.slice(0, separator);
    const types = signature.slice(separator + 1, -1);
    await prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS public.${name}(${types})`,
    );
  }

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.validate_credit_lot_balance_evidence_for_lot(
      p_tenant_id text, p_credit_lot_id text
    ) RETURNS void LANGUAGE plpgsql AS $$
    DECLARE
      lot_record RECORD;
      allocated_amount BIGINT;
      restored_amount BIGINT;
      expected_remaining BIGINT;
    BEGIN
      SELECT "originalAmountKobo", "remainingAmountKobo"
      INTO lot_record FROM "CreditLot"
      WHERE "tenantId" = p_tenant_id AND "id" = p_credit_lot_id;
      SELECT COALESCE(SUM("amountKobo"), 0) INTO allocated_amount
      FROM "RedemptionAllocation"
      WHERE "tenantId" = p_tenant_id AND "creditLotId" = p_credit_lot_id;
      SELECT COALESCE(SUM(ar."amountKobo"), 0) INTO restored_amount
      FROM "AllocationRestoration" ar
      JOIN "RedemptionAllocation" ra
        ON ra."tenantId" = ar."tenantId" AND ra."id" = ar."allocationId"
      WHERE ra."tenantId" = p_tenant_id AND ra."creditLotId" = p_credit_lot_id;
      expected_remaining := lot_record."originalAmountKobo" - allocated_amount + restored_amount;
      IF lot_record."remainingAmountKobo" IS DISTINCT FROM expected_remaining THEN
        RAISE EXCEPTION 'credit lot remaining balance must match allocation and restoration evidence';
      END IF;
    END;
    $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.validate_ledger_entry_commit_state()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW."type"::text = 'EXPIRY' AND NEW."direction"::text = 'DEBIT' THEN
        RAISE EXCEPTION 'unsupported ledger type/direction combination';
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  for (const table of previewTables) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
    );
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."AuditLog"
      ADD CONSTRAINT "Preview_preserved_audit_actor_fk"
      FOREIGN KEY ("actorTenantId", "actorId")
      REFERENCES public."User"("tenantId", "id")
      ON DELETE SET NULL ON UPDATE CASCADE
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."Receipt"
      ADD CONSTRAINT "Preview_preserved_receipt_tenant_branch_fk"
      FOREIGN KEY ("tenantId", "branchId")
      REFERENCES public."Branch"("tenantId", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX "Preview_preserved_expiry_index"
      ON public."CreditExpiry" ("tenantId", "expiredAt")
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public."Receipt" ALTER COLUMN "updatedAt" DROP DEFAULT`,
  );
}

async function createFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const cashierId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const receiptId = randomUUID();
  const earnId = randomUUID();
  const lotId = randomUUID();
  const earnedAt = new Date('2026-08-01T10:00:00.000Z');
  const receiptNumber = `F1-RECONCILE-${tenantId}`;

  await prisma.tenant.create({
    data: { id: tenantId, name: 'F1 Reconciliation Test' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Test Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      id: cashierId,
      tenantId,
      branchId,
      username: `cashier-${tenantId}@shopcity.local`,
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Synthetic F1 Customer',
      phoneE164: `+2348${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`,
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: cashierId,
    },
  });
  await prisma.card.create({
    data: {
      id: cardId,
      tenantId,
      customerId,
      barcodeValue: `F1-${tenantId}`,
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: cashierId,
    },
  });
  await prisma.$transaction(async (tx) => {
    await tx.receipt.create({
      data: {
        id: receiptId,
        tenantId,
        branchId,
        customerId,
        cardId,
        deviceId: null,
        posReceiptNumber: receiptNumber,
        normalizedPosReceiptNumber: receiptNumber,
        receiptWeekStart: new Date('2026-07-27T00:00:00.000Z'),
        purchaseAmountKobo: amountKobo,
        occurredAt: earnedAt,
        capturedByTenantId: tenantId,
        capturedBy: cashierId,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        capturedAt: earnedAt,
        approvedByTenantId: tenantId,
        approvedBy: cashierId,
        approvedAt: earnedAt,
      },
    });
    await tx.loyaltyLedgerEntry.create({
      data: {
        id: earnId,
        tenantId,
        customerId,
        receiptId,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `f1-reconciliation-${tenantId}`,
        createdByTenantId: tenantId,
        createdBy: cashierId,
        effectiveAt: earnedAt,
      },
    });
    await tx.creditLot.create({
      data: {
        id: lotId,
        tenantId,
        customerId,
        earnLedgerEntryId: earnId,
        originalAmountKobo: amountKobo,
        remainingAmountKobo: amountKobo,
        earnedAt,
        expiresAt: dueAt,
      },
    });
  });
  return { tenantId, customerId, lotId };
}

async function readFixtureState(
  prisma: PrismaClient,
  fixture: { tenantId: string; customerId: string; lotId: string },
) {
  const [
    lot,
    expiryCount,
    expiryLedgerCount,
    auditCount,
    systemActorCount,
    credits,
    debits,
  ] = await Promise.all([
    prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: fixture.lotId } },
      select: { remainingAmountKobo: true },
    }),
    prisma.creditExpiry.count({
      where: { tenantId: fixture.tenantId, creditLotId: fixture.lotId },
    }),
    prisma.loyaltyLedgerEntry.count({
      where: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        type: LedgerEntryType.EXPIRY,
      },
    }),
    prisma.auditLog.count({
      where: {
        tenantId: fixture.tenantId,
        action: 'credit.expire',
        entityId: fixture.lotId,
      },
    }),
    prisma.user.count({
      where: { tenantId: fixture.tenantId, username: SYSTEM_USERNAME },
    }),
    prisma.loyaltyLedgerEntry.aggregate({
      where: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        direction: LedgerEntryDirection.CREDIT,
        status: LedgerEntryStatus.CONFIRMED,
      },
      _sum: { amountKobo: true },
    }),
    prisma.loyaltyLedgerEntry.aggregate({
      where: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        direction: LedgerEntryDirection.DEBIT,
        status: LedgerEntryStatus.CONFIRMED,
      },
      _sum: { amountKobo: true },
    }),
  ]);
  return {
    remainingAmountKobo: lot.remainingAmountKobo.toString(),
    expiryCount,
    expiryLedgerCount,
    auditCount,
    systemActorCount,
    confirmedCreditKobo: String(credits._sum.amountKobo ?? 0n),
    confirmedDebitKobo: String(debits._sum.amountKobo ?? 0n),
  };
}

async function readGuardInventory(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const [
      triggers,
      checks,
      functions,
      rls,
      policies,
      foreignKeys,
      index,
      receiptDefault,
      migrationHistory,
    ] = await Promise.all([
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(ARRAY['AuditLog','Receipt','Approval','CreditExpiry','CreditLot','LoyaltyLedgerEntry','RedemptionAllocation','AllocationRestoration','Adjustment','Redemption']::text[]) AND NOT t.tgisinternal`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(ARRAY['AuditLog','Receipt','Approval','CreditExpiry','CreditLot','LoyaltyLedgerEntry','RedemptionAllocation','AllocationRestoration','Adjustment','Redemption']::text[]) AND x.contype='c'`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY['prevent_allocation_restoration_mutation','prevent_confirmed_ledger_mutation','prevent_credit_expiry_mutation','prevent_credit_lot_delete','prevent_receipt_evidence_mutation','prevent_redemption_allocation_mutation','prevent_redemption_evidence_mutation','validate_allocation_restoration_total','validate_credit_expiry_commit_state','validate_credit_lot_balance_evidence','validate_credit_lot_balance_evidence_for_lot','validate_credit_lot_lifecycle','validate_debit_allocation_invariants_for_ledger','validate_ledger_entry_commit_state','validate_redemption_allocation_commit_state']::text[])`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(ARRAY['AuditLog','Receipt','Approval','CreditExpiry','CreditLot','LoyaltyLedgerEntry','RedemptionAllocation','AllocationRestoration','Adjustment','Redemption']::text[]) AND c.relrowsecurity`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public' AND tablename=ANY(ARRAY['AuditLog','Receipt','Approval','CreditExpiry','CreditLot','LoyaltyLedgerEntry','RedemptionAllocation','AllocationRestoration','Adjustment','Redemption']::text[])`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_constraint WHERE conname IN ('Preview_preserved_audit_actor_fk','Preview_preserved_receipt_tenant_branch_fk')`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_indexes WHERE schemaname='public' AND indexname='Preview_preserved_expiry_index'`,
      tx.$queryRaw<
        { expression: string | null }[]
      >`SELECT pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum WHERE n.nspname='public' AND c.relname='Receipt' AND a.attname='updatedAt'`,
      tx.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM public."_prisma_migrations" WHERE migration_name=${reconciliationMigration}`,
    ]);
    return {
      triggerCount: triggers[0].count,
      checkCount: checks[0].count,
      reconciledFunctionCount: functions[0].count,
      rlsTableCount: rls[0].count,
      policyCount: policies[0].count,
      preservedPreviewForeignKeys: foreignKeys[0].count,
      preservedPreviewIndex: index[0].count,
      preservedRls: rls[0].count === previewTables.length,
      receiptUpdatedAtDefault: receiptDefault[0]?.expression ?? null,
      reconciliationHistoryRows: migrationHistory[0].count,
    };
  });
}
