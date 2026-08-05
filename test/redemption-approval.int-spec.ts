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
import { ActiveBalanceService } from '../src/common/balance/active-balance.service';
import { LotAllocationService } from '../src/common/balance/lot-allocation.service';
import type { AuthContext } from '../src/common/auth/session.types';
import { PrismaService } from '../src/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import { RedemptionPolicyService } from '../src/modules/redemptions/redemption-policy.service';
import { RedemptionsService } from '../src/modules/redemptions/redemptions.service';
import { renderSmsMessage } from '../src/jobs/sms.templates';

describe('redemption approval lifecycle (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let redemptionsService: RedemptionsService;
  let approvalsService: ApprovalsService;
  let loyaltyService: LoyaltyService;
  let fixture: Awaited<ReturnType<typeof createFixture>>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaService();
    await prisma.$connect();

    const configService = redemptionConfigService();
    const auditService = new AuditService(prisma);
    const activeBalanceService = new ActiveBalanceService(prisma);
    const lotAllocationService = new LotAllocationService();
    redemptionsService = new RedemptionsService(
      prisma,
      activeBalanceService,
      lotAllocationService,
      new RedemptionPolicyService(configService),
      auditService,
    );
    loyaltyService = new LoyaltyService(
      prisma,
      auditService,
      configService,
      activeBalanceService,
      lotAllocationService,
    );
    approvalsService = new ApprovalsService(loyaltyService);
    fixture = await createFixture(prisma);
  }, 240000);

  afterAll(async () => {
    await prisma?.$disconnect();
    try {
      await pgContainer?.stop();
    } catch {
      // Testcontainers can race teardown under the longer full-suite run.
    }
  }, 240000);

  it('creates, lists, and executes a real high-value redemption approval', async () => {
    const pending = await redemptionsService.redeem(
      fixture.tenantId,
      makeContext(fixture.cashier, fixture.deviceId),
      'redeem-approval-key',
      {
        cardSerialNumber: fixture.cardSerial,
        posReceiptNumber: 'POS-REDEEM-APPROVAL',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
      },
    );

    expect(pending.state).toBe('PENDING_APPROVAL');
    expect(pending.approvalId).toBeDefined();

    const approvalRecord = await prisma.approval.findUniqueOrThrow({
      where: { id: pending.approvalId! },
    });
    expect(approvalRecord).toMatchObject({
      targetType: 'REDEEM',
      receiptId: null,
      redemptionId: pending.redemptionId,
      status: ApprovalStatus.PENDING,
    });

    const approvals = await approvalsService.listApprovals(
      fixture.tenantId,
      makeContext(fixture.supervisor, fixture.deviceId),
    );
    expect(approvals.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: pending.approvalId,
          receiptId: pending.receiptId,
          redemptionId: pending.redemptionId,
          targetType: 'REDEEM',
          receipt: expect.objectContaining({
            posReceiptNumber: 'POS-REDEEM-APPROVAL',
          }) as Record<string, unknown>,
        }),
      ]),
    );

    const decision = await approvalsService.decideApproval(
      fixture.tenantId,
      makeContext(fixture.supervisor, fixture.deviceId),
      pending.approvalId!,
      'APPROVED',
      'verified high-value redemption',
    );

    expect(decision).toMatchObject({
      status: ApprovalStatus.EXECUTED,
      receiptId: pending.receiptId,
      redemptionId: pending.redemptionId,
      redeemedAmountKobo: 6_000,
    });

    const [redemption, allocationCount, smsCount, remainingBalance] =
      await Promise.all([
        prisma.redemption.findUniqueOrThrow({
          where: { id: pending.redemptionId },
        }),
        prisma.redemptionAllocation.count({
          where: {
            tenantId: fixture.tenantId,
            redemptionId: pending.redemptionId,
          },
        }),
        prisma.smsMessage.count({
          where: {
            tenantId: fixture.tenantId,
            redemptionId: pending.redemptionId,
          },
        }),
        prisma.creditLot.aggregate({
          where: { tenantId: fixture.tenantId, customerId: fixture.customerId },
          _sum: { remainingAmountKobo: true },
        }),
      ]);

    expect(redemption.ledgerEntryId).toBe(decision.ledgerEntryId);
    expect(redemption.confirmedAmountKobo).toBe(6_000n);
    expect(allocationCount).toBe(1);
    expect(smsCount).toBe(1);
    expect(remainingBalance._sum.remainingAmountKobo).toBe(14_000n);

    const smsMessage = await prisma.smsMessage.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        redemptionId: pending.redemptionId,
      },
      orderBy: { createdAt: 'desc' },
    });
    const renderedSms = renderSmsMessage({
      receiptId: pending.receiptId,
      template: smsMessage.template as 'redemption-confirmed',
      payload: smsMessage.payload as Record<string, unknown>,
    });

    expect(renderedSms).toContain('Redeemed NGN 60.00');
    expect(renderedSms).toContain('Remaining balance NGN 140.00');

    const transaction = await loyaltyService.getTransaction(
      fixture.tenantId,
      makeContext(fixture.supervisor, fixture.deviceId),
      decision.ledgerEntryId!,
    );
    expect(transaction.transactionId).toBe(decision.ledgerEntryId);
    expect(transaction.redemptionId).toBe(pending.redemptionId);
    expect(transaction.redeemedAmountKobo).toBe(6_000);
    const allocation = transaction.ledger?.allocations?.[0];
    expect(allocation?.creditLotId).toEqual(expect.any(String));
    expect(allocation?.amountKobo).toBe(6_000);
    expect(allocation?.restorations).toEqual([]);

    const ledger = await loyaltyService.listCustomerLedger(
      fixture.tenantId,
      makeContext(fixture.supervisor, fixture.deviceId),
      fixture.customerId,
    );
    expect(ledger.items[0]).toMatchObject({
      redemptionId: pending.redemptionId,
      allocations: [
        expect.objectContaining({
          amountKobo: 6_000,
          restorations: [],
        }),
      ],
    });
  }, 120000);

  it('returns the same response for concurrent same-key redemption requests', async () => {
    const localFixture = await createFixture(prisma);
    const occurredAt = new Date(Date.now() - 60_000).toISOString();

    const [first, second] = await Promise.all([
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-same-key',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-SAME-KEY',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 1_000,
          occurredAt,
        },
      ),
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-same-key',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-SAME-KEY',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 1_000,
          occurredAt,
        },
      ),
    ]);

    expect(second).toEqual(first);
    expect(first.state).toBe('CONFIRMED');
  }, 120000);

  it('returns RECEIPT_ALREADY_USED for concurrent different-key duplicate receipts', async () => {
    const localFixture = await createFixture(prisma);
    const occurredAt = new Date(Date.now() - 60_000).toISOString();

    const settled = await Promise.allSettled([
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-duplicate-a',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-DUPLICATE',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 1_000,
          occurredAt,
        },
      ),
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-duplicate-b',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-DUPLICATE',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 1_000,
          occurredAt,
        },
      ),
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
  }, 120000);

  it('prevents concurrent immediate redemptions from overdrawing lots', async () => {
    const localFixture = await createFixture(prisma, 6_000n);

    const settled = await Promise.allSettled([
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-overlap-a',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-OVERLAP-A',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 4_000,
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
        },
      ),
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-overlap-b',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-OVERLAP-B',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 4_000,
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
        },
      ),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const remaining = await prisma.creditLot.aggregate({
      where: {
        tenantId: localFixture.tenantId,
        customerId: localFixture.customerId,
      },
      _sum: { remainingAmountKobo: true },
    });
    expect(remaining._sum.remainingAmountKobo).toBe(2_000n);
  }, 120000);

  it('allows only one supervisor to execute a redemption approval', async () => {
    const localFixture = await createFixture(prisma);
    const backupSupervisor = {
      id: randomUUID(),
      tenantId: localFixture.tenantId,
      branchId: localFixture.branchId,
      role: UserRole.SUPERVISOR,
    };
    await prisma.user.create({
      data: {
        id: backupSupervisor.id,
        tenantId: backupSupervisor.tenantId,
        branchId: backupSupervisor.branchId,
        username: 'supervisor-2@redemption.local',
        role: backupSupervisor.role,
        status: 'ACTIVE',
      },
    });
    const pending = await redemptionsService.redeem(
      localFixture.tenantId,
      makeContext(localFixture.cashier, localFixture.deviceId),
      'redeem-approval-race-key',
      {
        cardSerialNumber: localFixture.cardSerial,
        posReceiptNumber: 'POS-REDEEM-APPROVAL-RACE',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
      },
    );

    const settled = await Promise.allSettled([
      approvalsService.decideApproval(
        localFixture.tenantId,
        makeContext(localFixture.supervisor, localFixture.deviceId),
        pending.approvalId!,
        'APPROVED',
        'first supervisor approval',
      ),
      approvalsService.decideApproval(
        localFixture.tenantId,
        makeContext(backupSupervisor, localFixture.deviceId),
        pending.approvalId!,
        'APPROVED',
        'second supervisor approval',
      ),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      response: { code: 'APPROVAL_ALREADY_DECIDED' },
    });
    expect(
      await prisma.redemptionAllocation.count({
        where: {
          tenantId: localFixture.tenantId,
          redemptionId: pending.redemptionId,
        },
      }),
    ).toBe(1);
  }, 120000);

  it('prevents approval execution racing another redemption from overdrawing balance', async () => {
    const localFixture = await createFixture(prisma, 20_000n);
    const pending = await redemptionsService.redeem(
      localFixture.tenantId,
      makeContext(localFixture.cashier, localFixture.deviceId),
      'redeem-approval-balance-race-key',
      {
        cardSerialNumber: localFixture.cardSerial,
        posReceiptNumber: 'POS-REDEEM-APPROVAL-BALANCE-RACE',
        basketAmountKobo: 60_000,
        requestedRedemptionKobo: 17_000,
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
      },
    );

    const settled = await Promise.allSettled([
      approvalsService.decideApproval(
        localFixture.tenantId,
        makeContext(localFixture.supervisor, localFixture.deviceId),
        pending.approvalId!,
        'APPROVED',
        'approval racing redemption',
      ),
      redemptionsService.redeem(
        localFixture.tenantId,
        makeContext(localFixture.cashier, localFixture.deviceId),
        'redeem-racing-approval-key',
        {
          cardSerialNumber: localFixture.cardSerial,
          posReceiptNumber: 'POS-REDEEM-RACING-APPROVAL',
          basketAmountKobo: 20_000,
          requestedRedemptionKobo: 4_000,
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
        },
      ),
    ]);

    expect(
      settled.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const remaining = await prisma.creditLot.aggregate({
      where: {
        tenantId: localFixture.tenantId,
        customerId: localFixture.customerId,
      },
      _sum: { remainingAmountKobo: true },
    });
    expect(
      remaining._sum.remainingAmountKobo === 3_000n ||
        remaining._sum.remainingAmountKobo === 16_000n,
    ).toBe(true);
  }, 120000);
});

async function createFixture(prisma: PrismaService, lotAmountKobo = 20_000n) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const deviceId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const cashier = {
    id: randomUUID(),
    tenantId,
    branchId,
    role: UserRole.CASHIER,
  };
  const supervisor = {
    id: randomUUID(),
    tenantId,
    branchId,
    role: UserRole.SUPERVISOR,
  };

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Redemption Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Redemption Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });
  await prisma.device.create({
    data: createAttestedDeviceData({
      id: deviceId,
      tenantId,
      branchId,
      name: 'Redemption Device',
      fingerprintHash: `redemption-device-fingerprint-${deviceId}`,
      status: 'ACTIVE',
    }),
  });
  await prisma.user.createMany({
    data: [
      {
        id: cashier.id,
        tenantId,
        branchId,
        username: 'cashier@redemption.local',
        role: cashier.role,
        status: 'ACTIVE',
      },
      {
        id: supervisor.id,
        tenantId,
        branchId,
        username: 'supervisor@redemption.local',
        role: supervisor.role,
        status: 'ACTIVE',
      },
    ],
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Redemption Customer',
      phoneE164: '+2348000000002',
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: cashier.id,
    },
  });
  await prisma.card.create({
    data: {
      id: cardId,
      tenantId,
      customerId,
      barcodeValue: 'CARD-REDEEM-APPROVAL',
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: cashier.id,
    },
  });
  await createEarnLot(prisma, {
    tenantId,
    branchId,
    deviceId,
    customerId,
    cardId,
    userId: cashier.id,
    amountKobo: lotAmountKobo,
  });

  return {
    tenantId,
    branchId,
    deviceId,
    customerId,
    cashier,
    supervisor,
    cardSerial: 'CARD-REDEEM-APPROVAL',
  };
}

async function createEarnLot(
  prisma: PrismaService,
  input: {
    tenantId: string;
    branchId: string;
    deviceId: string;
    customerId: string;
    cardId: string;
    userId: string;
    amountKobo: bigint;
  },
) {
  const now = new Date(Date.now() - 120_000);
  await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        branchId: input.branchId,
        customerId: input.customerId,
        cardId: input.cardId,
        deviceId: input.deviceId,
        posReceiptNumber: 'POS-EARN-SEED',
        normalizedPosReceiptNumber: 'POS-EARN-SEED',
        receiptWeekStart: new Date(Date.UTC(2026, 6, 20)),
        purchaseAmountKobo: 1_000_000n,
        occurredAt: now,
        capturedByTenantId: input.tenantId,
        capturedBy: input.userId,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        reviewedAt: now,
        reviewedByTenantId: input.tenantId,
        reviewedBy: input.userId,
        approvedAt: now,
        approvedByTenantId: input.tenantId,
        approvedBy: input.userId,
      },
    });
    const ledger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        customerId: input.customerId,
        receiptId: receipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: input.amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `earn-seed-${randomUUID()}`,
        createdByTenantId: input.tenantId,
        createdBy: input.userId,
        effectiveAt: now,
      },
    });

    await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        customerId: input.customerId,
        earnLedgerEntryId: ledger.id,
        originalAmountKobo: input.amountKobo,
        remainingAmountKobo: input.amountKobo,
        earnedAt: now,
        expiresAt: addMonthsUtc(now, 12),
      },
    });
  });
}

function makeContext(
  user: { id: string; tenantId: string; branchId: string; role: UserRole },
  deviceId: string,
): AuthContext {
  const now = new Date();

  return {
    session: {
      id: randomUUID(),
      userId: user.id,
      deviceId,
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
      username: `${user.role.toLowerCase()}@redemption.local`,
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

function redemptionConfigService() {
  return {
    get: (key: string) =>
      ({
        DEFAULT_EARN_RATE_BPS: 200,
        MIN_REDEMPTION_KOBO: 500,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 5_000,
        PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
        PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
        PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
      })[key],
  } as never;
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
