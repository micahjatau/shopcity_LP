import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  RedemptionStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { FraudBehaviorService } from '../src/modules/fraud/fraud-behavior.service';
import { FraudRulesService } from '../src/modules/fraud/fraud-rules.service';
import { PrismaService } from '../src/database/prisma.service';
import { createAttestedDeviceData } from './support/device-attestation';
import type { ConfigService } from '@nestjs/config';

describe('fraud behavioral rules (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let behaviorService: FraudBehaviorService;
  let tenant: { id: string };
  let branch: { id: string };
  let cashierA: Awaited<ReturnType<typeof createStaffUser>>;
  let cashierB: Awaited<ReturnType<typeof createStaffUser>>;
  let loginUser: Awaited<ReturnType<typeof createStaffUser>>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    process.env.DATABASE_URL = databaseUrl;

    prisma = new PrismaService();
    await prisma.$connect();

    tenant = await prisma.tenant.create({
      data: { id: randomUUID(), name: 'Fraud Tenant', status: 'ACTIVE' },
    });
    branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: 'Fraud Branch',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });

    cashierA = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.CASHIER,
      'cashier-a@fraud.local',
    );
    cashierB = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.CASHIER,
      'cashier-b@fraud.local',
    );
    loginUser = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.SUPERVISOR,
      'supervisor@fraud.local',
    );

    behaviorService = new FraudBehaviorService(
      prisma,
      new FraudRulesService(configService()),
      configService(),
    );
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('produces all six behavioral rule codes from PostgreSQL source rows', async () => {
    const customer = await prisma.customer.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        fullName: 'Fraud Customer',
        phoneE164: `+23480123${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        isStaff: false,
        status: 'ACTIVE',
        registeredByTenantId: tenant.id,
        registeredBy: cashierA.id,
      },
    });

    const card = await prisma.card.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        customerId: customer.id,
        barcodeValue: `CARD-${randomUUID()}`,
        status: 'ACTIVE',
        issuedByTenantId: tenant.id,
        issuedBy: cashierA.id,
      },
    });

    const receiptWeekStart = new Date('2026-08-10T00:00:00.000Z');
    const targetOccurredAt = new Date('2026-08-10T10:00:00.000Z');
    const targetReceipt = await prisma.receipt.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: customer.id,
        cardId: card.id,
        posReceiptNumber: 'POS-FRAUD-0001',
        normalizedPosReceiptNumber: 'POS-FRAUD-0001',
        receiptWeekStart,
        purchaseAmountKobo: 25_000_000n,
        occurredAt: targetOccurredAt,
        capturedByTenantId: tenant.id,
        capturedBy: cashierA.id,
      },
    });

    await prisma.receipt.createMany({
      data: [
        ...Array.from({ length: 5 }, (_, index) => ({
          id: randomUUID(),
          tenantId: tenant.id,
          branchId: branch.id,
          customerId: customer.id,
          cardId: card.id,
          posReceiptNumber: `POS-FRAUD-A-${index + 2}`,
          normalizedPosReceiptNumber: `POS-FRAUD-A-${index + 2}`,
          receiptWeekStart,
          purchaseAmountKobo: 25_000_000n,
          occurredAt: targetOccurredAt,
          capturedByTenantId: tenant.id,
          capturedBy: cashierA.id,
        })),
        ...Array.from({ length: 6 }, (_, index) => ({
          id: randomUUID(),
          tenantId: tenant.id,
          branchId: branch.id,
          customerId: customer.id,
          cardId: card.id,
          posReceiptNumber: `POS-FRAUD-B-${index + 1}`,
          normalizedPosReceiptNumber: `POS-FRAUD-B-${index + 1}`,
          receiptWeekStart,
          purchaseAmountKobo: 1_000_000n,
          occurredAt: targetOccurredAt,
          capturedByTenantId: tenant.id,
          capturedBy: cashierB.id,
        })),
      ],
    });

    const replacementWindowStart = new Date('2026-08-01T00:00:00.000Z');
    const replacementWindowEnd = new Date('2026-08-31T00:00:00.000Z');
    await prisma.card.createMany({
      data: [
        {
          id: randomUUID(),
          tenantId: tenant.id,
          customerId: customer.id,
          barcodeValue: `CARD-REPL-${randomUUID()}`,
          status: 'BLOCKED',
          replacedAt: new Date('2026-08-10T12:00:00.000Z'),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          customerId: customer.id,
          barcodeValue: `CARD-REPL-${randomUUID()}`,
          status: 'BLOCKED',
          replacedAt: new Date('2026-08-11T12:00:00.000Z'),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          customerId: customer.id,
          barcodeValue: `CARD-REPL-${randomUUID()}`,
          status: 'BLOCKED',
          replacedAt: new Date('2026-08-12T12:00:00.000Z'),
        },
      ],
    });

    const reversalFixture = await createBaseFixture(prisma, 'reversal');
    const originalRedemptions = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        createConfirmedRedemption(
          prisma,
          reversalFixture,
          `REDEEM-REV-${index + 1}`,
          6_000n,
        ),
      ),
    );

    await prisma.$transaction(async (tx) => {
      for (const [index, redemption] of originalRedemptions.entries()) {
        const reversalLedger = await tx.loyaltyLedgerEntry.create({
          data: {
            id: randomUUID(),
            tenantId: reversalFixture.tenantId,
            customerId: reversalFixture.customerId,
            receiptId: null,
            type: LedgerEntryType.REVERSAL,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: 6_000n,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `corr-reversal-${index + 1}-${randomUUID()}`,
            reversesEntryId: redemption.debitLedgerEntryId,
            createdByTenantId: reversalFixture.tenantId,
            createdBy: reversalFixture.userId,
            effectiveAt: new Date('2026-08-10T09:30:00.000Z'),
            createdAt: new Date('2026-08-10T09:30:00.000Z'),
          },
        });

        await tx.allocationRestoration.create({
          data: {
            id: randomUUID(),
            tenantId: reversalFixture.tenantId,
            allocationId: redemption.allocationId,
            reversalLedgerEntryId: reversalLedger.id,
            amountKobo: 6_000n,
          },
        });

        await tx.creditLot.update({
          where: {
            tenantId_id: {
              tenantId: reversalFixture.tenantId,
              id: redemption.creditLotId,
            },
          },
          data: { remainingAmountKobo: { increment: 6_000n } },
        });
      }
    });

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        prisma.auditLog.create({
          data: {
            id: randomUUID(),
            tenantId: tenant.id,
            actorId: loginUser.id,
            actorTenantId: tenant.id,
            action: 'auth.login.failed',
            entityType: 'user',
            entityId: loginUser.id,
            metadata: {
              attempt: index + 1,
            },
            createdAt: new Date('2026-08-10T00:05:00.000Z'),
          },
        }),
      ),
    );

    const [
      receiptFindings,
      replacementFindings,
      reversalFindings,
      authFindings,
    ] = await Promise.all([
      behaviorService.evaluateReceiptBehavior({
        tenantId: tenant.id,
        receiptId: targetReceipt.id,
        branchId: branch.id,
        customerId: customer.id,
        cashierId: cashierA.id,
        cardId: card.id,
        normalizedPosReceiptNumber: targetReceipt.normalizedPosReceiptNumber,
        receiptWeekStart,
        purchaseAmountKobo: 25_000_000n,
        occurredAt: targetOccurredAt,
      }),
      behaviorService.evaluateCardReplacementBehavior({
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: customer.id,
        cardId: card.id,
        replacementCount: 0,
        windowStart: replacementWindowStart,
        windowEnd: replacementWindowEnd,
      }),
      behaviorService.evaluateReversalBehavior({
        tenantId: reversalFixture.tenantId,
        branchId: reversalFixture.branchId,
        cashierId: reversalFixture.userId,
        reversalCount: 0,
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        windowEnd: new Date('2026-08-11T00:00:00.000Z'),
      }),
      behaviorService.evaluateAuthFailures({
        tenantId: tenant.id,
        userId: loginUser.id,
        failureCount: 0,
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        windowEnd: new Date('2026-08-10T00:15:00.000Z'),
      }),
    ]);

    expect(
      [
        ...receiptFindings.map((finding) => finding.ruleCode),
        ...replacementFindings.map((finding) => finding.ruleCode),
        ...reversalFindings.map((finding) => finding.ruleCode),
        ...authFindings.map((finding) => finding.ruleCode),
      ].sort(),
    ).toEqual(
      [
        'FR-AUTH-001',
        'FR-CARD-001',
        'FR-CASH-001',
        'FR-REPL-001',
        'FR-REV-001',
        'FR-ROUND-001',
      ].sort(),
    );
  }, 120000);

  it('suppresses below-threshold behavioral findings', async () => {
    const quietCustomer = await prisma.customer.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        fullName: 'Quiet Customer',
        phoneE164: `+23480999${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        isStaff: false,
        status: 'ACTIVE',
        registeredByTenantId: tenant.id,
        registeredBy: cashierA.id,
      },
    });

    const quietCard = await prisma.card.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        customerId: quietCustomer.id,
        barcodeValue: `CARD-QUIET-${randomUUID()}`,
        status: 'ACTIVE',
      },
    });

    const quietReceiptWeekStart = new Date('2026-08-17T00:00:00.000Z');
    const quietReceipt = await prisma.receipt.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: quietCustomer.id,
        cardId: quietCard.id,
        posReceiptNumber: 'POS-QUIET-0001',
        normalizedPosReceiptNumber: 'POS-QUIET-0001',
        receiptWeekStart: quietReceiptWeekStart,
        purchaseAmountKobo: 9_000n,
        occurredAt: new Date('2026-08-17T10:00:00.000Z'),
        capturedByTenantId: tenant.id,
        capturedBy: cashierB.id,
      },
    });

    const receiptFindings = await behaviorService.evaluateReceiptBehavior({
      tenantId: tenant.id,
      receiptId: quietReceipt.id,
      branchId: branch.id,
      customerId: quietCustomer.id,
      cashierId: cashierB.id,
      cardId: quietCard.id,
      normalizedPosReceiptNumber: quietReceipt.normalizedPosReceiptNumber,
      receiptWeekStart: quietReceiptWeekStart,
      purchaseAmountKobo: 9_000n,
      occurredAt: new Date('2026-08-17T10:00:00.000Z'),
    });

    const replacementFindings =
      await behaviorService.evaluateCardReplacementBehavior({
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: quietCustomer.id,
        cardId: quietCard.id,
        replacementCount: 1,
        windowStart: new Date('2026-08-17T00:00:00.000Z'),
        windowEnd: new Date('2026-08-18T00:00:00.000Z'),
      });

    const reversalFindings = await behaviorService.evaluateReversalBehavior({
      tenantId: tenant.id,
      branchId: branch.id,
      cashierId: cashierB.id,
      reversalCount: 1,
      windowStart: new Date('2026-08-17T00:00:00.000Z'),
      windowEnd: new Date('2026-08-18T00:00:00.000Z'),
    });

    const authFindings = await behaviorService.evaluateAuthFailures({
      tenantId: tenant.id,
      userId: loginUser.id,
      failureCount: 4,
      windowStart: new Date('2026-08-17T00:00:00.000Z'),
      windowEnd: new Date('2026-08-17T00:15:00.000Z'),
    });

    expect(receiptFindings).toEqual([]);
    expect(replacementFindings).toEqual([]);
    expect(reversalFindings).toEqual([]);
    expect(authFindings).toEqual([]);
  }, 120000);
});

function configService(): ConfigService {
  return {
    get: (key: string) => {
      switch (key) {
        case 'PURCHASE_FLAG_THRESHOLD_KOBO':
          return 10_000_000;
        case 'PURCHASE_APPROVAL_THRESHOLD_KOBO':
          return 20_000_000;
        case 'REDEMPTION_APPROVAL_THRESHOLD_KOBO':
          return 500_000;
        case 'FRAUD_CARD_DAILY_COUNT_THRESHOLD':
          return 5;
        case 'FRAUD_CASHIER_MIN_SAMPLE_SIZE':
          return 5;
        case 'FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS':
          return 15000;
        case 'FRAUD_ROUNDED_VALUE_MIN_SAMPLE':
          return 5;
        case 'FRAUD_ROUNDED_VALUE_UNIT_KOBO':
          return 1000;
        case 'FRAUD_REVERSAL_COUNT_THRESHOLD':
          return 3;
        case 'FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD':
          return 3;
        case 'FRAUD_AUTH_FAILURE_COUNT_THRESHOLD':
          return 5;
        default:
          return undefined;
      }
    },
  } as unknown as ConfigService;
}

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

async function createBaseFixture(prisma: PrismaService, label: string) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();
  const receiptId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: `${label}-tenant`, status: 'ACTIVE' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: `${label}-branch`,
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
      username: `${label}-cashier@fraud.local`,
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: `${label} customer`,
      phoneE164: `+23480${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(7, '0')}`,
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
      barcodeValue: `${label}-CARD-${randomUUID()}`,
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
      name: `${label} device`,
      fingerprintHash: `${label}-device-fingerprint`,
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
      posReceiptNumber: `${label}-POS`,
      normalizedPosReceiptNumber: `${label}-POS`,
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
  prisma: PrismaService,
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

    return {
      receiptId,
      redemptionId,
      debitLedgerEntryId,
      allocationId,
      creditLotId: scenario.creditLotId,
    };
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
      receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
      purchaseAmountKobo: 30_000n,
      occurredAt,
      capturedByTenantId: fixture.tenantId,
      capturedBy: fixture.userId,
      capturedAt: occurredAt,
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
