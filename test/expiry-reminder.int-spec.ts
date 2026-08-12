import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  SmsMessageStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { ExpiryReminderService } from '../src/modules/credit-expiry/expiry-reminder.service';
import { createAttestedDeviceData } from './support/device-attestation';

describe('expiry reminders (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let reminderService: ExpiryReminderService;
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
    reminderService = new ExpiryReminderService(prisma as never);
    fixture = await createBaseFixture(prisma);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('aggregates multiple qualifying lots into one customer-day reminder and dedupes on repeat sweep', async () => {
    await createEarnCreditLot(
      prisma,
      fixture,
      5_000n,
      'REM-A',
      new Date('2027-08-01T08:00:00.000Z'),
    );
    await createEarnCreditLot(
      prisma,
      fixture,
      7_000n,
      'REM-B',
      new Date('2027-08-01T10:00:00.000Z'),
    );

    await expect(
      reminderService.enqueueDueReminders({
        now: new Date('2027-07-02T00:00:00.000Z'),
        reminderDays: 30,
        batchSize: 10,
      }),
    ).resolves.toEqual({ customers: 1, amountKobo: 12_000n });

    await expect(
      reminderService.enqueueDueReminders({
        now: new Date('2027-07-02T00:00:00.000Z'),
        reminderDays: 30,
        batchSize: 10,
      }),
    ).resolves.toEqual({ customers: 0, amountKobo: 0n });

    const reminders = await prisma.creditExpiryReminder.findMany({
      where: { tenantId: fixture.tenantId, customerId: fixture.customerId },
    });
    const smsMessages = await prisma.smsMessage.findMany({
      where: {
        tenantId: fixture.tenantId,
        template: 'credit-expiry-reminder-v1',
      },
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].totalExpiringKobo).toBe(12_000n);
    expect(smsMessages).toHaveLength(1);
  }, 120000);

  it('excludes fully consumed lots and SMS failure does not alter lot validity', async () => {
    const lot = await createEarnCreditLot(
      prisma,
      fixture,
      9_000n,
      'REM-CONSUMED',
      new Date('2027-08-01T12:00:00.000Z'),
    );

    await consumeCreditLot(prisma, fixture, lot.id, 9_000n, 'REM-CONSUMED-RED');

    await expect(
      reminderService.enqueueDueReminders({
        now: new Date('2027-07-02T00:00:00.000Z'),
        reminderDays: 30,
        batchSize: 10,
      }),
    ).resolves.toEqual({ customers: 0, amountKobo: 0n });

    const validLot = await createEarnCreditLot(
      prisma,
      fixture,
      6_000n,
      'REM-FAIL',
      new Date('2027-08-01T14:00:00.000Z'),
    );

    await reminderService.enqueueDueReminders({
      now: new Date('2027-07-02T00:00:00.000Z'),
      reminderDays: 30,
      batchSize: 10,
    });

    const smsMessage = await prisma.smsMessage.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        template: 'credit-expiry-reminder-v1',
      },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.smsMessage.update({
      where: { id: smsMessage.id },
      data: {
        status: SmsMessageStatus.FAILED,
        failedAt: new Date('2027-07-02T01:00:00.000Z'),
      },
    });

    const refreshedLot = await prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: validLot.id } },
    });

    expect(refreshedLot.remainingAmountKobo).toBe(6_000n);
    expect(refreshedLot.expiresAt.toISOString()).toBe(
      '2027-08-01T14:00:00.000Z',
    );
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const cashierUserId = randomUUID();
  const deviceId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Reminder Tenant' },
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
  await prisma.user.create({
    data: {
      id: cashierUserId,
      tenantId,
      branchId,
      username: `cashier-${tenantId}@shopcity.local`,
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.device.create({
    data: createAttestedDeviceData({
      id: deviceId,
      tenantId,
      branchId,
      name: 'Reminder Device',
      fingerprintHash: `reminder-device-${tenantId}`,
      status: 'ACTIVE',
    }),
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Reminder Customer',
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

  return { tenantId, branchId, cashierUserId, deviceId, customerId, cardId };
}

async function createEarnCreditLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  amountKobo: bigint,
  prefix: string,
  expiresAt: Date,
) {
  const receiptId = randomUUID();
  const ledgerEntryId = randomUUID();
  const lotId = randomUUID();
  const earnedAt = new Date(expiresAt.getTime() - 365 * 24 * 60 * 60 * 1000);
  const receiptNumber = `${prefix}-${receiptId.slice(0, 8)}`;

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
        type: 'EARN',
        direction: 'CREDIT',
        amountKobo,
        status: 'CONFIRMED',
        correlationId: `earn-${prefix}-${randomUUID()}`,
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

  return { id: lotId };
}

async function consumeCreditLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  creditLotId: string,
  amountKobo: bigint,
  prefix: string,
) {
  const receiptId = randomUUID();
  const redemptionId = randomUUID();
  const ledgerEntryId = randomUUID();
  const occurredAt = new Date('2027-01-02T10:00:00.000Z');
  const receiptNumber = `${prefix}-${receiptId.slice(0, 8)}`;

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
        receiptWeekStart: new Date('2026-12-28T00:00:00.000Z'),
        purchaseAmountKobo: 30_000n,
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
        correlationId: `redeem-${prefix}-${randomUUID()}`,
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
        basketAmountKobo: 30_000n,
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
        creditLotId,
        amountKobo,
        allocationOrder: 1,
      },
    });

    await tx.creditLot.update({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: creditLotId } },
      data: { remainingAmountKobo: { decrement: amountKobo } },
    });
  });
}
