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
import { AuditService } from '../src/modules/audit/audit.service';
import { CreditExpiryService } from '../src/modules/credit-expiry/credit-expiry.service';
import { SystemActorService } from '../src/common/system/system-actor.service';
import { createAttestedDeviceData } from './support/device-attestation';

describe('credit expiry service (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let fixture: Awaited<ReturnType<typeof createBaseFixture>>;
  let service: CreditExpiryService;

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
    service = new CreditExpiryService(
      prisma as never,
      new AuditService(prisma as never),
      new SystemActorService(),
    );
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('expires a full remaining lot exactly once', async () => {
    const lot = await createEarnCreditLot(
      prisma,
      fixture,
      20_000n,
      'FULL-EXPIRY',
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({
      examined: 1,
      expiredLots: 1,
      expiredAmountKobo: 20_000n,
    });

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({ examined: 0, expiredLots: 0, expiredAmountKobo: 0n });

    const refreshedLot = await prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
    });
    const expiry = await prisma.creditExpiry.findFirstOrThrow({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });

    expect(refreshedLot.remainingAmountKobo).toBe(0n);
    expect(expiry.amountKobo).toBe(20_000n);
  }, 120000);

  it('expires only the remaining amount on a partially consumed lot', async () => {
    const lot = await createEarnCreditLot(
      prisma,
      fixture,
      20_000n,
      'PARTIAL-EXPIRY',
    );
    await createConfirmedRedemptionAgainstLot(
      prisma,
      fixture,
      lot,
      5_000n,
      'PARTIAL-RED',
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({
      examined: 1,
      expiredLots: 1,
      expiredAmountKobo: 15_000n,
    });

    const refreshedLot = await prisma.creditLot.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
    });
    const expiry = await prisma.creditExpiry.findFirstOrThrow({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });

    expect(refreshedLot.remainingAmountKobo).toBe(0n);
    expect(expiry.amountKobo).toBe(15_000n);
  }, 120000);

  it('skips fully consumed and future lots', async () => {
    const consumedLot = await createEarnCreditLot(
      prisma,
      fixture,
      9_000n,
      'CONSUMED-LOT',
    );
    await createConfirmedRedemptionAgainstLot(
      prisma,
      fixture,
      consumedLot,
      9_000n,
      'FULL-RED',
    );
    await createEarnCreditLot(
      prisma,
      fixture,
      7_000n,
      'FUTURE-LOT',
      new Date('2028-01-01T10:00:00.000Z'),
      new Date('2027-01-01T10:00:00.000Z'),
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({ examined: 0, expiredLots: 0, expiredAmountKobo: 0n });
  }, 120000);

  it('is safe under concurrent sweeps for the same due lot', async () => {
    const lot = await createEarnCreditLot(
      prisma,
      fixture,
      11_000n,
      'CONCURRENT-EXPIRY',
    );

    const [first, second] = await Promise.all([
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ]);

    expect([first, second]).toEqual(
      expect.arrayContaining([
        { examined: 1, expiredLots: 1, expiredAmountKobo: 11_000n },
        { examined: 0, expiredLots: 0, expiredAmountKobo: 0n },
      ]),
    );

    const expiryRows = await prisma.creditExpiry.findMany({
      where: { tenantId: fixture.tenantId, creditLotId: lot.id },
    });
    expect(expiryRows).toHaveLength(1);
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
    data: { id: tenantId, name: 'Credit Expiry Tenant' },
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
      fullName: 'Credit Expiry Customer',
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
  expiresAt = new Date('2027-08-01T10:00:00.000Z'),
  earnedAt = new Date('2026-08-01T10:00:00.000Z'),
) {
  const receiptId = randomUUID();
  const ledgerEntryId = randomUUID();
  const lotId = randomUUID();

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
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
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

  return { id: lotId, receiptId, ledgerEntryId, expiresAt };
}

async function createConfirmedRedemptionAgainstLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  lot: Awaited<ReturnType<typeof createEarnCreditLot>>,
  amountKobo: bigint,
  prefix: string,
) {
  const receiptId = randomUUID();
  const redemptionId = randomUUID();
  const ledgerEntryId = randomUUID();
  const occurredAt = new Date('2026-09-01T10:00:00.000Z');
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
        receiptWeekStart: new Date('2026-08-31T00:00:00.000Z'),
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
        creditLotId: lot.id,
        amountKobo,
        allocationOrder: 1,
      },
    });

    await tx.creditLot.update({
      where: { tenantId_id: { tenantId: fixture.tenantId, id: lot.id } },
      data: { remainingAmountKobo: { decrement: amountKobo } },
    });
  });
}
