import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  ApprovalStatus,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('financial state invariants (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
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
    fixture = await createBaseFixture(prisma);
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('rejects incoherent redemption lifecycle rows', async () => {
    await expect(
      prisma.redemption.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          branchId: fixture.branchId,
          customerId: fixture.customerId,
          cardId: fixture.cardId,
          deviceId: fixture.deviceId,
          receiptId: fixture.receiptId,
          requestedByTenantId: fixture.tenantId,
          requestedBy: fixture.userId,
          requestedAmountKobo: 6_000n,
          basketAmountKobo: 30_000n,
          maximumAllowedKobo: 6_000n,
          confirmedAmountKobo: 6_000n,
          status: 'CONFIRMED',
          policyVersion: 'policy-v1',
          confirmedAt: null,
        },
      }),
    ).rejects.toThrow(/Redemption_financial_state_machine_check/i);
  }, 120000);

  it('rejects incoherent approval lifecycle rows', async () => {
    const redemption = await prisma.redemption.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId: fixture.receiptId,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: 6_000n,
        basketAmountKobo: 30_000n,
        maximumAllowedKobo: 6_000n,
        status: 'PENDING_APPROVAL',
        policyVersion: 'policy-v1',
      },
    });

    await expect(
      prisma.approval.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          redemptionId: redemption.id,
          targetType: 'REDEEM',
          status: ApprovalStatus.PENDING,
          requestedByTenantId: fixture.tenantId,
          requestedBy: fixture.userId,
          policyVersion: 'policy-v1',
          expiresAt: new Date('2026-07-30T12:00:00.000Z'),
          decisionByTenantId: fixture.tenantId,
          decisionBy: fixture.userId,
          decisionReason: 'should not be here',
          decidedAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(/Approval_financial_state_machine_check/i);
  }, 120000);

  it('rejects ledger rows without required evidence', async () => {
    await expect(
      prisma.loyaltyLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: fixture.tenantId,
          customerId: fixture.customerId,
          receiptId: fixture.receiptId,
          type: LedgerEntryType.REDEEM,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: 6_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: `ledger-${randomUUID()}`,
          createdByTenantId: fixture.tenantId,
          createdBy: fixture.userId,
          effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(
      /redeem ledger entry must reference a confirmed redemption/i,
    );
  }, 120000);

  it('prevents redemption evidence mutation', async () => {
    const receiptId = randomUUID();
    await prisma.receipt.create({
      data: {
        id: receiptId,
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        posReceiptNumber: 'POS-MUTATION',
        normalizedPosReceiptNumber: 'POS-MUTATION',
        receiptWeekStart: new Date('2026-07-20T00:00:00.000Z'),
        purchaseAmountKobo: 30_000n,
        occurredAt: new Date('2026-07-26T12:00:00.000Z'),
        capturedByTenantId: fixture.tenantId,
        capturedBy: fixture.userId,
        capturedAt: new Date('2026-07-26T12:00:00.000Z'),
        captureStatus: ReceiptCaptureStatus.PENDING_APPROVAL,
        reviewStatus: ReceiptReviewStatus.PENDING,
      },
    });

    const redemption = await prisma.redemption.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: 6_000n,
        basketAmountKobo: 30_000n,
        maximumAllowedKobo: 6_000n,
        status: 'PENDING_APPROVAL',
        policyVersion: 'policy-v1',
      },
    });

    await expect(
      prisma.redemption.update({
        where: {
          tenantId_id: { tenantId: fixture.tenantId, id: redemption.id },
        },
        data: { requestedAmountKobo: 7_000n },
      }),
    ).rejects.toThrow(/redemption evidence fields are immutable/i);
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();
  const receiptId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Invariant Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Invariant Branch',
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
      username: 'cashier@invariant.local',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Invariant Customer',
      phoneE164: '+2348000000001',
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
      barcodeValue: 'CARD-INVARIANT',
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
      name: 'Invariant Device',
      fingerprintHash: 'invariant-device-fingerprint',
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
      posReceiptNumber: 'POS-INVARIANT',
      normalizedPosReceiptNumber: 'POS-INVARIANT',
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
