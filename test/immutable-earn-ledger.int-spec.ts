import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  ApprovalStatus,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createAttestedDeviceData } from './support/device-attestation';
import { AuditService } from '../src/modules/audit/audit.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';
import type { AuthContext } from '../src/common/auth/session.types';
import { PrismaService } from '../src/database/prisma.service';

describe('immutable earn ledger (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let loyaltyService: LoyaltyService;
  let approvalsService: ApprovalsService;
  let auditService: AuditService;
  let tenant: { id: string };
  let branch: { id: string };
  let cashier: Awaited<ReturnType<typeof createStaffUser>>;
  let approver: Awaited<ReturnType<typeof createStaffUser>>;
  let configValues: Record<string, number>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    process.env.DATABASE_URL = databaseUrl;

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    prisma = new PrismaService();
    await prisma.$connect();

    tenant = await prisma.tenant.create({
      data: { id: randomUUID(), name: 'Ledger Tenant', status: 'ACTIVE' },
    });

    branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: 'Main Branch',
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
      'cashier@ledger.local',
    );
    approver = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.SUPERVISOR,
      'approver@ledger.local',
    );

    auditService = new AuditService(prisma);
    configValues = {
      DEFAULT_EARN_RATE_BPS: 200,
      PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
      PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
      PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
    };
    const configService = {
      get: (key: string) => configValues[key],
    } as never;

    loyaltyService = new LoyaltyService(prisma, auditService, configService);
    approvalsService = new ApprovalsService(loyaltyService);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('records a confirmed earn atomically and replays idempotently', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-0001',
    );
    const occurredAt = recentOccurredAt();

    const first = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-confirmed-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      },
    );

    const replay = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-confirmed-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      },
    );

    expect(replay).toEqual(first);
    expect(first.state).toBe('CONFIRMED');
    expect(first.captureStatus).toBe('CAPTURED');
    expect(first.creditKobo).toBe(20_000);
    expect(first.availableBalanceKobo).toBe(20_000);
    expect(first.smsStatus).toBe('QUEUED');
    expect(first.expiresAt).toBeTruthy();
    expect(first.transactionId).toBeDefined();

    await expect(
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-confirmed-key', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_001,
        occurredAt,
      }),
    ).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_CONFLICT' },
    });

    const counts = await Promise.all([
      prisma.receipt.count({ where: { id: first.receiptId } }),
      prisma.loyaltyLedgerEntry.count({
        where: { receiptId: first.receiptId },
      }),
      prisma.creditLot.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.outboxEvent.count({
        where: {
          tenantId: tenant.id,
          aggregateId: first.receiptId,
          eventType: 'sms.send',
        },
      }),
    ]);

    expect(counts).toEqual([1, 1, 1, 1]);

    const transaction = await loyaltyService.getTransaction(
      tenant.id,
      fixture.actor,
      first.transactionId!,
    );
    expect(transaction.state).toBe('CONFIRMED');
    expect(transaction.captureStatus).toBe('CAPTURED');
    expect(transaction.availableBalanceKobo).toBe(20_000);
    expect(transaction.ledgerEntryId).toBe(first.ledgerEntryId);
    expect(transaction.ledger?.creditLot?.remainingAmountKobo).toBe(20_000);

    const ledger = await loyaltyService.listCustomerLedger(
      tenant.id,
      fixture.actor,
      fixture.customer.id,
    );
    expect(ledger.items).toHaveLength(1);
    expect(ledger.items[0]?.amountKobo).toBe(20_000);
  }, 120000);

  it('clamps leap-day expiry to the last valid day of the target month', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-0001B',
    );

    const response = await loyaltyService.earn(
      tenant.id,
      makeContext(
        {
          id: approver.id,
          tenantId: tenant.id,
          branchId: branch.id,
          role: UserRole.SUPERVISOR,
        },
        fixture.device.id,
      ),
      'earn-leap-day-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt: '2024-02-29T10:15:00.000Z',
        overrideReason: 'leap-day regression',
      },
    );

    expect(response.expiresAt).toBe('2025-02-28T10:15:00.000Z');
  }, 120000);

  it('creates approval records and executes them exactly once', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-0002',
    );
    const occurredAt = recentOccurredAt();

    const pending = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-pending-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 21_000_000,
        occurredAt,
      },
    );

    expect(pending.state).toBe('PENDING_APPROVAL');
    expect(pending.approvalId).toBeDefined();
    expect(pending.captureStatus).toBe('PENDING_APPROVAL');
    expect(pending.availableBalanceKobo).toBeNull();
    expect(pending.smsStatus).toBeNull();

    const approvalsBefore = await approvalsService.listApprovals(
      tenant.id,
      makeContext(approver),
    );
    expect(approvalsBefore.items).toHaveLength(1);
    expect(approvalsBefore.items[0]?.status).toBe(ApprovalStatus.PENDING);

    const settled = await Promise.allSettled([
      approvalsService.decideApproval(
        tenant.id,
        makeContext(approver),
        pending.approvalId!,
        'APPROVED',
        'verified by supervisor',
      ),
      approvalsService.decideApproval(
        tenant.id,
        makeContext(approver),
        pending.approvalId!,
        'APPROVED',
        'verified by supervisor',
      ),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      settled.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const decision = settled.find(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<typeof approvalsService.decideApproval>>
      > => result.status === 'fulfilled',
    );

    const [ledgerCount, lotCount, outboxCount] = await Promise.all([
      prisma.loyaltyLedgerEntry.count({
        where: { receiptId: pending.receiptId },
      }),
      prisma.creditLot.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.outboxEvent.count({
        where: { tenantId: tenant.id, aggregateId: pending.receiptId },
      }),
    ]);

    expect([ledgerCount, lotCount, outboxCount]).toEqual([1, 1, 2]);

    const approvalRecord = await prisma.approval.findUnique({
      where: { receiptId: pending.receiptId },
    });

    expect(approvalRecord?.status).toBe(ApprovalStatus.EXECUTED);

    const transaction = await loyaltyService.getTransaction(
      tenant.id,
      fixture.actor,
      decision?.value.ledgerEntryId ?? pending.transactionId!,
    );
    expect(transaction.state).toBe('CONFIRMED');
    expect(transaction.ledgerEntryId).toBeDefined();
    expect(transaction.availableBalanceKobo).toBeGreaterThan(0);
  }, 120000);

  it('persists expired approvals without financial side effects', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-EXPIRY',
    );
    const pending = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-expired-approval-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 21_000_000,
        occurredAt: recentOccurredAt(),
      },
    );

    await prisma.approval.update({
      where: { id: pending.approvalId! },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await expect(
      approvalsService.decideApproval(
        tenant.id,
        makeContext(approver),
        pending.approvalId!,
        'APPROVED',
        'approval reviewed too late',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_EXPIRED' },
    });

    const [approvalRecord, ledgerCount, lotCount, outboxCount] =
      await Promise.all([
        prisma.approval.findUnique({ where: { id: pending.approvalId! } }),
        prisma.loyaltyLedgerEntry.count({
          where: { receiptId: pending.receiptId },
        }),
        prisma.creditLot.count({
          where: { tenantId: tenant.id, customerId: fixture.customer.id },
        }),
        prisma.outboxEvent.count({
          where: { tenantId: tenant.id, aggregateId: pending.receiptId },
        }),
      ]);

    expect(approvalRecord?.status).toBe(ApprovalStatus.EXPIRED);
    expect(approvalRecord?.decidedAt).toBeInstanceOf(Date);
    expect([ledgerCount, lotCount, outboxCount]).toEqual([0, 0, 1]);
  }, 120000);

  it('rejects receipt evidence mutation but allows workflow metadata updates', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-IMMUTABLE-RECEIPT',
    );
    const pending = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-immutable-receipt-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 21_000_000,
        occurredAt: recentOccurredAt(),
      },
    );

    await expect(
      prisma.receipt.update({
        where: { id: pending.receiptId },
        data: { purchaseAmountKobo: 22_000_000 },
      }),
    ).rejects.toThrow(/receipt purchase evidence is immutable/i);

    await expect(
      prisma.receipt.update({
        where: { id: pending.receiptId },
        data: {
          reviewStatus: ReceiptReviewStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedByTenantId: approver.tenantId,
          reviewedBy: approver.id,
          approvedAt: null,
          approvedByTenantId: null,
          approvedBy: null,
        },
      }),
    ).resolves.toMatchObject({ reviewStatus: ReceiptReviewStatus.REJECTED });
  }, 120000);

  it('rejects credit lot source mismatches and immutable source updates', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-LOT-INTEGRITY',
    );
    const confirmed = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-lot-integrity-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt: recentOccurredAt(),
      },
    );
    const creditLot = await prisma.creditLot.findFirstOrThrow({
      where: { earnLedgerEntryId: confirmed.ledgerEntryId! },
    });

    await expect(
      prisma.creditLot.update({
        where: { id: creditLot.id },
        data: { originalAmountKobo: creditLot.originalAmountKobo + 1n },
      }),
    ).rejects.toThrow(/credit lot source fields are immutable/i);

    await expect(
      prisma.creditLot.update({
        where: { id: creditLot.id },
        data: { expiresAt: addMonthsUtc(creditLot.earnedAt, 13) },
      }),
    ).rejects.toThrow(
      /credit lot expiry must be derived|credit lot expiry is immutable/i,
    );

    await expect(
      prisma.creditLot.update({
        where: { id: creditLot.id },
        data: { remainingAmountKobo: creditLot.remainingAmountKobo - 1n },
      }),
    ).rejects.toThrow(
      /credit lot remaining balance (is temporarily immutable|must match immutable allocation and restoration evidence)/i,
    );

    await expect(
      prisma.creditLot.delete({ where: { id: creditLot.id } }),
    ).rejects.toThrow(/credit lots cannot be deleted/i);

    await expect(
      prisma.creditLot.findUniqueOrThrow({ where: { id: creditLot.id } }),
    ).resolves.toMatchObject({
      expiresAt: creditLot.expiresAt,
      remainingAmountKobo: creditLot.remainingAmountKobo,
    });

    const direct = await createDirectEarnLedgerFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      fixture.device.id,
      fixture.customer.id,
      fixture.card.id,
      'POS-LEDGER-LOT-MISMATCH',
    );

    await expect(
      createDirectEarnLedgerFixture(
        prisma,
        tenant.id,
        branch.id,
        cashier.id,
        fixture.device.id,
        fixture.customer.id,
        fixture.card.id,
        'POS-LEDGER-LOT-MISMATCH-2',
        direct.ledgerEntry.effectiveAt,
        {
          originalAmountKobo: direct.ledgerEntry.amountKobo + 1n,
          remainingAmountKobo: direct.ledgerEntry.amountKobo + 1n,
        },
      ),
    ).rejects.toThrow(/credit lot must match its credit ledger entry/i);
  }, 120000);

  it('accepts adjustment credit lots and rejects unsupported source pairs', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-LOT-ADJUSTMENT',
    );
    const occurredAt = recentOccurredAt();

    await expect(
      prisma.$transaction(async (tx) => {
        const ledgerEntry = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            customerId: fixture.customer.id,
            type: LedgerEntryType.ADJUSTMENT,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: 4_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `adjustment-credit-${randomUUID()}`,
            createdByTenantId: tenant.id,
            createdBy: cashier.id,
            effectiveAt: new Date(occurredAt),
          },
        });

        await tx.adjustment.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            customerId: fixture.customer.id,
            kind: 'CREDIT',
            amountKobo: 4_000n,
            reason: 'Adjustment credit lot',
            createdByTenantId: tenant.id,
            createdBy: cashier.id,
            ledgerEntryId: ledgerEntry.id,
            effectiveAt: new Date(occurredAt),
          },
        });

        await tx.creditLot.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            customerId: fixture.customer.id,
            earnLedgerEntryId: ledgerEntry.id,
            originalAmountKobo: 4_000n,
            remainingAmountKobo: 4_000n,
            earnedAt: new Date(occurredAt),
            expiresAt: addMonthsUtc(new Date(occurredAt), 12),
          },
        });
      }),
    ).resolves.toBeUndefined();

    await expect(
      prisma.$transaction(async (tx) => {
        const ledgerEntry = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            customerId: fixture.customer.id,
            type: LedgerEntryType.REDEEM,
            direction: LedgerEntryDirection.DEBIT,
            amountKobo: 4_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `unsupported-source-${randomUUID()}`,
            createdByTenantId: tenant.id,
            createdBy: cashier.id,
            effectiveAt: new Date(occurredAt),
          },
        });

        await tx.creditLot.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            customerId: fixture.customer.id,
            earnLedgerEntryId: ledgerEntry.id,
            originalAmountKobo: 4_000n,
            remainingAmountKobo: 4_000n,
            earnedAt: new Date(occurredAt),
            expiresAt: addMonthsUtc(new Date(occurredAt), 12),
          },
        });
      }),
    ).rejects.toThrow(
      /credit lot must match its credit ledger entry|credit lot must reference an existing earn ledger entry/i,
    );
  }, 120000);

  it('enforces derived credit lot expiry on insert', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-LOT-EXPIRY',
    );
    const expiryCases = [
      new Date('2024-01-15T10:30:45.123Z'),
      new Date('2024-01-31T10:30:45.123Z'),
      new Date('2024-02-29T10:30:45.123Z'),
    ];

    for (const [index, earnedAt] of expiryCases.entries()) {
      const direct = await createDirectEarnLedgerFixture(
        prisma,
        tenant.id,
        branch.id,
        cashier.id,
        fixture.device.id,
        fixture.customer.id,
        fixture.card.id,
        `POS-LEDGER-LOT-EXPIRY-${index}`,
        earnedAt,
      );

      expect(direct.creditLot.expiresAt).toEqual(addMonthsUtc(earnedAt, 12));
    }

    await expect(
      createDirectEarnLedgerFixture(
        prisma,
        tenant.id,
        branch.id,
        cashier.id,
        fixture.device.id,
        fixture.customer.id,
        fixture.card.id,
        'POS-LEDGER-LOT-EXPIRY-BAD',
        new Date('2024-02-29T10:30:45.123Z'),
        {
          expiresAt: new Date('2025-03-01T10:30:45.123Z'),
        },
      ),
    ).rejects.toThrow(
      /credit lot expiry must be derived from earned timestamp/i,
    );
  }, 120000);

  it('rejects stale approval policies without financial side effects', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-STALE-POLICY',
    );
    const pending = await loyaltyService.earn(
      tenant.id,
      fixture.actor,
      'earn-stale-policy-key',
      {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 21_000_000,
        occurredAt: recentOccurredAt(),
      },
    );

    configValues.DEFAULT_EARN_RATE_BPS = 250;

    try {
      await expect(
        approvalsService.decideApproval(
          tenant.id,
          makeContext(approver),
          pending.approvalId!,
          'APPROVED',
          'approval policy changed',
        ),
      ).rejects.toMatchObject({
        response: { code: 'APPROVAL_POLICY_CHANGED' },
      });
    } finally {
      configValues.DEFAULT_EARN_RATE_BPS = 200;
    }

    const [approvalRecord, ledgerCount, lotCount, outboxCount] =
      await Promise.all([
        prisma.approval.findUnique({ where: { id: pending.approvalId! } }),
        prisma.loyaltyLedgerEntry.count({
          where: { receiptId: pending.receiptId },
        }),
        prisma.creditLot.count({
          where: { tenantId: tenant.id, customerId: fixture.customer.id },
        }),
        prisma.outboxEvent.count({
          where: { tenantId: tenant.id, aggregateId: pending.receiptId },
        }),
      ]);

    expect(approvalRecord?.status).toBe(ApprovalStatus.PENDING);
    expect([ledgerCount, lotCount, outboxCount]).toEqual([0, 0, 1]);
  }, 120000);

  it('serializes concurrent captures of the same receipt', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-0003',
    );
    const occurredAt = recentOccurredAt();

    const settled = await Promise.allSettled([
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-concurrent-a', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-concurrent-b', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      settled.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const fulfilled = settled.find(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<typeof loyaltyService.earn>>
      > => result.status === 'fulfilled',
    );

    expect(fulfilled).toBeDefined();

    const [receipts, ledgers, lots, outbox] = await Promise.all([
      prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          branchId: branch.id,
          posReceiptNumber: fixture.posReceiptNumber,
        },
      }),
      prisma.loyaltyLedgerEntry.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.creditLot.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.outboxEvent.count({
        where: {
          tenantId: tenant.id,
          aggregateId: fulfilled!.value.receiptId,
          eventType: 'sms.send',
        },
      }),
    ]);

    expect([receipts, ledgers, lots, outbox]).toEqual([1, 1, 1, 1]);
  }, 120000);

  it('returns the same response for concurrent same-key earn requests', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-0004',
    );
    const occurredAt = recentOccurredAt();

    const [first, second] = await Promise.all([
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-same-key', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-same-key', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
    ]);

    expect(first).toEqual(second);
    expect(first.transactionId).toBeDefined();
  }, 120000);

  it('records duplicate receipt evidence when concurrent earns race the unique receipt constraint', async () => {
    const fixture = await createEarnFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-LEDGER-DUPLICATE',
    );
    const occurredAt = recentOccurredAt();

    const settled = await Promise.allSettled([
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-duplicate-a', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-duplicate-b', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt,
      }),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      response: { code: 'RECEIPT_ALREADY_USED' },
    });

    expect(
      await prisma.auditLog.count({
        where: {
          tenantId: tenant.id,
          action: 'RECEIPT_DUPLICATE_ATTEMPT_RECORDED',
          entityType: 'RECEIPT',
        },
      }),
    ).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId: tenant.id,
          aggregateType: 'receipt',
          eventType: 'fraud.evaluate',
        },
      }),
    ).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          posReceiptNumber: fixture.posReceiptNumber,
        },
      }),
    ).toBe(1);
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
    actor: makeContext(
      {
        id: cashierId,
        tenantId,
        branchId,
        role: UserRole.CASHIER,
      },
      device.id,
    ),
  };
}

async function createDirectEarnLedgerFixture(
  prisma: PrismaService,
  tenantId: string,
  branchId: string,
  cashierId: string,
  deviceId: string,
  customerId: string,
  cardId: string,
  receiptNumber: string,
  occurredAt = new Date(),
  creditLotOverrides: {
    originalAmountKobo?: bigint;
    remainingAmountKobo?: bigint;
    expiresAt?: Date;
  } = {},
) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        id: randomUUID(),
        tenantId,
        branchId,
        customerId,
        cardId,
        deviceId,
        posReceiptNumber: receiptNumber,
        normalizedPosReceiptNumber: receiptNumber,
        receiptWeekStart: new Date(
          Date.UTC(
            occurredAt.getUTCFullYear(),
            occurredAt.getUTCMonth(),
            occurredAt.getUTCDate(),
          ),
        ),
        purchaseAmountKobo: 1_000_000,
        occurredAt,
        capturedByTenantId: tenantId,
        capturedBy: cashierId,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        reviewedAt: occurredAt,
        reviewedByTenantId: tenantId,
        reviewedBy: cashierId,
        approvedAt: occurredAt,
        approvedByTenantId: tenantId,
        approvedBy: cashierId,
      },
    });
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId,
        customerId,
        receiptId: receipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 20_000,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `direct-${receiptNumber}`,
        createdByTenantId: tenantId,
        createdBy: cashierId,
        effectiveAt: occurredAt,
      },
    });

    const originalAmountKobo =
      creditLotOverrides.originalAmountKobo ?? ledgerEntry.amountKobo;
    const remainingAmountKobo =
      creditLotOverrides.remainingAmountKobo ?? ledgerEntry.amountKobo;
    const expiresAt =
      creditLotOverrides.expiresAt ?? addMonthsUtc(ledgerEntry.effectiveAt, 12);

    const creditLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId,
        customerId,
        earnLedgerEntryId: ledgerEntry.id,
        originalAmountKobo,
        remainingAmountKobo,
        earnedAt: occurredAt,
        expiresAt,
      },
    });

    return { receipt, ledgerEntry, creditLot };
  });
}

function makeContext(
  user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    role: UserRole;
  },
  deviceId?: string,
): AuthContext {
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
      username: `${user.role.toLowerCase()}@ledger.local`,
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

function recentOccurredAt(): string {
  return new Date(Date.now() - 60_000).toISOString();
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
