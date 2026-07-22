import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { ApprovalStatus, UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
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
    const configService = {
      get: (key: string) => {
        const values: Record<string, number> = {
          DEFAULT_EARN_RATE_BPS: 200,
          PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
          PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
          PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
        };

        return values[key];
      },
    } as never;

    loyaltyService = new LoyaltyService(prisma, auditService, configService);
    approvalsService = new ApprovalsService(
      loyaltyService,
      prisma,
      auditService,
    );
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

    await expect(
      loyaltyService.earn(tenant.id, fixture.actor, 'earn-confirmed-key', {
        posReceiptNumber: fixture.posReceiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_001,
        occurredAt,
      }),
    ).rejects.toThrow('Idempotency key reused with different payload');

    const counts = await Promise.all([
      prisma.receipt.count({ where: { id: first.receiptId } }),
      prisma.loyaltyLedgerEntry.count({
        where: { receiptId: first.receiptId },
      }),
      prisma.creditLot.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.outboxEvent.count({
        where: { tenantId: tenant.id, aggregateId: first.receiptId },
      }),
    ]);

    expect(counts).toEqual([1, 1, 1, 1]);

    const transaction = await loyaltyService.getTransaction(
      tenant.id,
      first.receiptId,
    );
    expect(transaction.state).toBe('CONFIRMED');
    expect(transaction.captureStatus).toBe('CAPTURED');
    expect(transaction.availableBalanceKobo).toBe(20_000);
    expect(transaction.ledgerEntryId).toBe(first.ledgerEntryId);
    expect(transaction.ledger?.creditLot?.remainingAmountKobo).toBe(20_000);

    const ledger = await loyaltyService.listCustomerLedger(
      tenant.id,
      fixture.customer.id,
    );
    expect(ledger.items).toHaveLength(1);
    expect(ledger.items[0]?.amountKobo).toBe(20_000);
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

    const approvalsBefore = await approvalsService.listApprovals(tenant.id);
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

    expect([ledgerCount, lotCount, outboxCount]).toEqual([1, 1, 1]);

    const approvalRecord = await prisma.approval.findUnique({
      where: { receiptId: pending.receiptId },
    });

    expect(approvalRecord?.status).toBe(ApprovalStatus.EXECUTED);

    const transaction = await loyaltyService.getTransaction(
      tenant.id,
      pending.receiptId,
    );
    expect(transaction.state).toBe('CONFIRMED');
    expect(transaction.ledgerEntryId).toBeDefined();
    expect(transaction.availableBalanceKobo).toBeGreaterThan(0);
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
        where: { tenantId: tenant.id, aggregateId: fulfilled!.value.receiptId },
      }),
    ]);

    expect([receipts, ledgers, lots, outbox]).toEqual([1, 1, 1, 1]);
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
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      name: `Device-${receiptNumber}`,
      fingerprintHash: `fingerprint-${receiptNumber}`,
      status: 'ACTIVE',
    },
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
