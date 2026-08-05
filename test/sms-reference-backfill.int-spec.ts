import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { PrismaClient, SmsMessageStatus, UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createAttestedDeviceData } from './support/device-attestation';

describe('sms reference backfill (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('derives historical sms references from outbox payloads where possible', async () => {
    const fixture = await createFixture(prisma);

    await backfillSmsReferences(prisma);

    const sms = await prisma.smsMessage.findUnique({
      where: {
        tenantId_outboxEventId: {
          tenantId: fixture.tenantId,
          outboxEventId: fixture.outboxEventId,
        },
      },
    });

    expect(sms).toMatchObject({
      receiptId: fixture.receiptId,
      ledgerEntryId: fixture.ledgerEntryId,
      redemptionId: fixture.redemptionId,
      adjustmentId: null,
    });

    const untouched = await prisma.smsMessage.findUnique({
      where: {
        tenantId_outboxEventId: {
          tenantId: fixture.tenantId,
          outboxEventId: fixture.unrelatedOutboxEventId,
        },
      },
    });

    expect(untouched).toMatchObject({
      receiptId: fixture.receiptId,
      ledgerEntryId: null,
      redemptionId: null,
      adjustmentId: null,
    });
  }, 120000);
});

async function createFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();
  const receiptId = randomUUID();
  const earnReceiptId = randomUUID();
  const earnLedgerEntryId = randomUUID();
  const creditLotId = randomUUID();
  const ledgerEntryId = randomUUID();
  const redemptionId = randomUUID();
  const allocationId = randomUUID();
  const outboxEventId = randomUUID();
  const smsId = randomUUID();
  const unrelatedOutboxEventId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Backfill Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Backfill Branch',
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
      username: 'backfill@example.test',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Backfill Customer',
      phoneE164: '+2348000000999',
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
      barcodeValue: 'CARD-BACKFILL',
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
      name: 'Backfill Device',
      fingerprintHash: 'backfill-device-fingerprint',
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
      posReceiptNumber: 'POS-BACKFILL',
      normalizedPosReceiptNumber: 'POS-BACKFILL',
      receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
      purchaseAmountKobo: 30_000n,
      occurredAt: new Date('2026-07-26T12:00:00.000Z'),
      capturedByTenantId: tenantId,
      capturedBy: userId,
      capturedAt: new Date('2026-07-26T12:00:00.000Z'),
      captureStatus: 'CAPTURED',
      reviewStatus: 'APPROVED',
      reviewedAt: new Date('2026-07-26T12:00:00.000Z'),
      reviewedByTenantId: tenantId,
      reviewedBy: userId,
      approvedAt: new Date('2026-07-26T12:00:00.000Z'),
      approvedByTenantId: tenantId,
      approvedBy: userId,
    },
  });

  await prisma.receipt.create({
    data: {
      id: earnReceiptId,
      tenantId,
      branchId,
      customerId,
      cardId,
      deviceId,
      posReceiptNumber: 'POS-BACKFILL-EARN',
      normalizedPosReceiptNumber: 'POS-BACKFILL-EARN',
      receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
      purchaseAmountKobo: 30_000n,
      occurredAt: new Date('2026-07-25T12:00:00.000Z'),
      capturedByTenantId: tenantId,
      capturedBy: userId,
      capturedAt: new Date('2026-07-25T12:00:00.000Z'),
      captureStatus: 'CAPTURED',
      reviewStatus: 'APPROVED',
      reviewedAt: new Date('2026-07-25T12:00:00.000Z'),
      reviewedByTenantId: tenantId,
      reviewedBy: userId,
      approvedAt: new Date('2026-07-25T12:00:00.000Z'),
      approvedByTenantId: tenantId,
      approvedBy: userId,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyLedgerEntry.create({
      data: {
        id: earnLedgerEntryId,
        tenantId,
        customerId,
        receiptId: earnReceiptId,
        type: 'EARN',
        direction: 'CREDIT',
        amountKobo: 6_000n,
        status: 'CONFIRMED',
        correlationId: `earn-${randomUUID()}`,
        createdByTenantId: tenantId,
        createdBy: userId,
        effectiveAt: new Date('2026-07-25T12:00:00.000Z'),
      },
    });

    await tx.creditLot.create({
      data: {
        id: creditLotId,
        tenantId,
        customerId,
        earnLedgerEntryId,
        originalAmountKobo: 6_000n,
        remainingAmountKobo: 0n,
        earnedAt: new Date('2026-07-25T12:00:00.000Z'),
        expiresAt: new Date('2027-07-25T12:00:00.000Z'),
      },
    });
  });

  await prisma.redemption.create({
    data: {
      id: redemptionId,
      tenantId,
      branchId,
      customerId,
      cardId,
      deviceId,
      receiptId,
      requestedByTenantId: tenantId,
      requestedBy: userId,
      requestedAmountKobo: 6_000n,
      basketAmountKobo: 30_000n,
      maximumAllowedKobo: 6_000n,
      confirmedAmountKobo: null,
      status: 'PENDING_APPROVAL',
      policyVersion: 'policy-v1',
      requestedAt: new Date('2026-07-26T12:00:00.000Z'),
      confirmedAt: null,
      ledgerEntryId: null,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyLedgerEntry.create({
      data: {
        id: ledgerEntryId,
        tenantId,
        customerId,
        receiptId,
        type: 'REDEEM',
        direction: 'DEBIT',
        amountKobo: 6_000n,
        status: 'CONFIRMED',
        correlationId: `ledger-${randomUUID()}`,
        createdByTenantId: tenantId,
        createdBy: userId,
        effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      },
    });

    await tx.redemption.update({
      where: { tenantId_id: { tenantId, id: redemptionId } },
      data: {
        confirmedAmountKobo: 6_000n,
        status: 'CONFIRMED',
        confirmedAt: new Date('2026-07-26T12:00:00.000Z'),
        ledgerEntryId,
      },
    });

    await tx.redemptionAllocation.create({
      data: {
        id: allocationId,
        tenantId,
        redemptionId,
        redemptionLedgerEntryId: ledgerEntryId,
        creditLotId,
        amountKobo: 6_000n,
        allocationOrder: 1,
      },
    });
  });

  await prisma.outboxEvent.create({
    data: {
      id: outboxEventId,
      tenantId,
      aggregateType: 'redemption',
      aggregateId: redemptionId,
      eventType: 'sms.send',
      payload: {
        version: 1,
        receiptId,
        transactionId: ledgerEntryId,
        redemptionId,
        customerId,
        phoneE164: '+2348000000999',
        template: 'redemption-confirmed',
        redeemedAmountKobo: '6000',
      },
      status: 'PENDING',
      nextAttemptAt: new Date('2026-07-26T12:00:00.000Z'),
    },
  });
  await prisma.smsMessage.create({
    data: {
      id: smsId,
      tenantId,
      outboxEventId,
      receiptId,
      phoneE164: '+2348000000999',
      template: 'redemption-confirmed',
      payload: {
        version: 1,
        receiptId,
        transactionId: ledgerEntryId,
        redemptionId,
        customerId,
        phoneE164: '+2348000000999',
        template: 'redemption-confirmed',
        redeemedAmountKobo: '6000',
      },
      status: SmsMessageStatus.QUEUED,
      queuedAt: new Date('2026-07-26T12:00:00.000Z'),
    },
  });

  await prisma.outboxEvent.create({
    data: {
      id: unrelatedOutboxEventId,
      tenantId,
      aggregateType: 'manual',
      aggregateId: receiptId,
      eventType: 'sms.send',
      payload: {
        version: 1,
        phoneE164: '+2348000000998',
        template: 'earn-confirmed',
      },
      status: 'PENDING',
      nextAttemptAt: new Date('2026-07-26T12:00:00.000Z'),
    },
  });
  await prisma.smsMessage.create({
    data: {
      id: randomUUID(),
      tenantId,
      outboxEventId: unrelatedOutboxEventId,
      receiptId,
      phoneE164: '+2348000000998',
      template: 'earn-confirmed',
      payload: {
        version: 1,
        phoneE164: '+2348000000998',
        template: 'earn-confirmed',
      },
      status: SmsMessageStatus.QUEUED,
      queuedAt: new Date('2026-07-26T12:00:00.000Z'),
    },
  });

  return {
    tenantId,
    outboxEventId,
    receiptId,
    ledgerEntryId,
    earnLedgerEntryId,
    creditLotId,
    redemptionId,
    unrelatedOutboxEventId,
  };
}

async function backfillSmsReferences(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "SmsMessage" sm
    SET "receiptId" = COALESCE(sm."receiptId", NULLIF(oe."payload"->>'receiptId', ''))
    FROM "OutboxEvent" oe
    WHERE sm."tenantId" = oe."tenantId"
      AND sm."outboxEventId" = oe."id"
      AND sm."receiptId" IS NULL
      AND NULLIF(oe."payload"->>'receiptId', '') IS NOT NULL;
  `;

  await prisma.$executeRaw`
    UPDATE "SmsMessage" sm
    SET "ledgerEntryId" = COALESCE(sm."ledgerEntryId", NULLIF(oe."payload"->>'transactionId', ''))
    FROM "OutboxEvent" oe
    WHERE sm."tenantId" = oe."tenantId"
      AND sm."outboxEventId" = oe."id"
      AND sm."ledgerEntryId" IS NULL
      AND NULLIF(oe."payload"->>'transactionId', '') IS NOT NULL;
  `;

  await prisma.$executeRaw`
    UPDATE "SmsMessage" sm
    SET "redemptionId" = COALESCE(sm."redemptionId", NULLIF(oe."payload"->>'redemptionId', ''))
    FROM "OutboxEvent" oe
    WHERE sm."tenantId" = oe."tenantId"
      AND sm."outboxEventId" = oe."id"
      AND sm."redemptionId" IS NULL
      AND NULLIF(oe."payload"->>'redemptionId', '') IS NOT NULL;
  `;

  await prisma.$executeRaw`
    UPDATE "SmsMessage" sm
    SET "adjustmentId" = COALESCE(sm."adjustmentId", NULLIF(oe."payload"->>'adjustmentId', ''))
    FROM "OutboxEvent" oe
    WHERE sm."tenantId" = oe."tenantId"
      AND sm."outboxEventId" = oe."id"
      AND sm."adjustmentId" IS NULL
      AND NULLIF(oe."payload"->>'adjustmentId', '') IS NOT NULL;
  `;
}
