import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  AdjustmentKind,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  PrismaClient,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  RedemptionStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { LotAllocationService } from '../src/common/balance/lot-allocation.service';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from '../src/jobs/outbox-worker.runtime';
import { ScriptedSmsProvider } from '../src/jobs/sms.provider';
import { ReversalsService } from '../src/modules/reversals/reversals.service';

describe('reversal lot isolation (int)', () => {
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

  it('reverses an earn by consuming only its own credit lot', async () => {
    const fixture = await createBaseFixture(prisma);
    const original = await createEarnSource(prisma, fixture);
    const service = createReversalsService(prisma);

    const response = await service.reverse(
      fixture.tenantId,
      actor(fixture),
      original.ledgerEntryId,
      'idem-earn-reversal',
      {
        reason: 'Earn correction',
      },
    );

    expect(response.originalTransactionId).toBe(original.ledgerEntryId);
    expect(response.allocations).toEqual([
      {
        creditLotId: original.creditLotId,
        amountKobo: Number(original.amountKobo),
        allocationOrder: 1,
        expiresAt: original.expiresAt.toISOString(),
      },
    ]);

    const lots = await prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [original.olderLotId, original.creditLotId] },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(lots).toEqual(
      expect.arrayContaining([
        {
          id: original.olderLotId,
          remainingAmountKobo: 50n,
        },
        {
          id: original.creditLotId,
          remainingAmountKobo: 0n,
        },
      ]),
    );

    const allocation = await prisma.redemptionAllocation.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        redemptionLedgerEntryId: response.id,
      },
      select: {
        creditLotId: true,
        amountKobo: true,
        allocationOrder: true,
      },
    });

    expect(allocation).toEqual({
      creditLotId: original.creditLotId,
      amountKobo: 40n,
      allocationOrder: 1,
    });

    const reversalLedger = await prisma.loyaltyLedgerEntry.findUniqueOrThrow({
      where: {
        tenantId_id: {
          tenantId: fixture.tenantId,
          id: response.id,
        },
      },
      select: { reversesEntryId: true },
    });

    expect(reversalLedger.reversesEntryId).toBe(original.ledgerEntryId);
  }, 120000);

  it('reverses a credit adjustment by consuming only its own credit lot', async () => {
    const fixture = await createBaseFixture(prisma);
    const original = await createCreditAdjustmentSource(prisma, fixture);
    const service = createReversalsService(prisma);

    const response = await service.reverse(
      fixture.tenantId,
      actor(fixture),
      original.ledgerEntryId,
      'idem-adjustment-reversal',
      {
        reason: 'Adjustment correction',
      },
    );

    expect(response.originalTransactionId).toBe(original.ledgerEntryId);
    expect(response.allocations).toEqual([
      {
        creditLotId: original.creditLotId,
        amountKobo: Number(original.amountKobo),
        allocationOrder: 1,
        expiresAt: original.expiresAt.toISOString(),
      },
    ]);

    const lots = await prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [original.olderLotId, original.creditLotId] },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true },
    });

    expect(lots).toHaveLength(2);
    expect(lots).toEqual(
      expect.arrayContaining([
        {
          id: original.olderLotId,
          remainingAmountKobo: 50n,
        },
        {
          id: original.creditLotId,
          remainingAmountKobo: 0n,
        },
      ]),
    );

    const allocation = await prisma.redemptionAllocation.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        redemptionLedgerEntryId: response.id,
      },
      select: {
        creditLotId: true,
        amountKobo: true,
        allocationOrder: true,
      },
    });

    expect(allocation).toEqual({
      creditLotId: original.creditLotId,
      amountKobo: 40n,
      allocationOrder: 1,
    });

    const reversalLedger = await prisma.loyaltyLedgerEntry.findUniqueOrThrow({
      where: {
        tenantId_id: {
          tenantId: fixture.tenantId,
          id: response.id,
        },
      },
      select: { reversesEntryId: true },
    });

    expect(reversalLedger.reversesEntryId).toBe(original.ledgerEntryId);
  }, 120000);

  it('serializes concurrent same-key requests through either settlement leg', async () => {
    const fixture = await createBaseFixture(prisma);
    const pair = await createPairedSettlementSource(prisma, fixture);
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };
    const service = createReversalsService(prisma, auditService);

    const responses = await Promise.all([
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.earnLedgerEntryId,
        'same-group-key',
        { reason: 'Receipt settlement correction' },
      ),
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.redemptionLedgerEntryId,
        'same-group-key',
        { reason: 'Receipt settlement correction' },
      ),
    ]);

    expect(responses[0]).toEqual(responses[1]);
    expect(responses[0].newActiveBalanceKobo).toBe(5_000);
    expect(auditService.recordWithClient).toHaveBeenCalledTimes(1);
    await expectSingleGroupedReversal(prisma, fixture, pair);
  }, 120000);

  it('blocks missing Earn-lot and allocation-corruption states at the database boundary', async () => {
    const fixture = await createBaseFixture(prisma);
    const pair = await createPairedSettlementSource(prisma, fixture);
    const before = await groupedSettlementSnapshot(
      prisma,
      fixture,
      pair,
      'database-invariant-probe',
    );

    await expect(
      prisma.creditLot.deleteMany({
        where: { tenantId: fixture.tenantId, id: pair.earnLotId },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.redemptionAllocation.updateMany({
        where: { tenantId: fixture.tenantId, id: pair.allocationId },
        data: { amountKobo: 2_999n },
      }),
    ).rejects.toThrow();

    expect(
      await groupedSettlementSnapshot(
        prisma,
        fixture,
        pair,
        'database-invariant-probe',
      ),
    ).toEqual(before);
  }, 120000);

  it('rejects cross-tenant settlement links at the database boundary', async () => {
    const fixture = await createBaseFixture(prisma);
    const foreignFixture = await createBaseFixture(prisma);
    const receiptCount = await prisma.receipt.count({
      where: { tenantId: fixture.tenantId },
    });

    await expect(
      createPairedSettlementSource(prisma, fixture, {
        earnCustomerId: foreignFixture.customerId,
      }),
    ).rejects.toThrow();

    expect(
      await prisma.receipt.count({ where: { tenantId: fixture.tenantId } }),
    ).toBe(receiptCount);
  }, 120000);

  it('fails closed for a database-persisted customer mismatch', async () => {
    const fixture = await createBaseFixture(prisma);
    const otherCustomer = await prisma.customer.create({
      data: {
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        fullName: 'Other Settlement Customer',
        phoneE164: '+2348000000998',
        isStaff: false,
        status: 'ACTIVE',
        registeredByTenantId: fixture.tenantId,
        registeredBy: fixture.userId,
      },
    });
    const pair = await createPairedSettlementSource(prisma, fixture, {
      earnCustomerId: otherCustomer.id,
    });
    const idempotencyKey = 'customer-mismatch-key';
    const before = await groupedSettlementSnapshot(
      prisma,
      fixture,
      pair,
      idempotencyKey,
    );
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };
    const service = createReversalsService(prisma, auditService);

    await expect(
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.earnLedgerEntryId,
        idempotencyKey,
        { reason: 'Review customer mismatch' },
      ),
    ).rejects.toMatchObject({
      response: { code: 'REVERSAL_REVIEW_REQUIRED' },
    });
    expect(
      await groupedSettlementSnapshot(prisma, fixture, pair, idempotencyKey),
    ).toEqual(before);
    expect(auditService.recordWithClient).not.toHaveBeenCalled();
  }, 120000);

  it('rejects a changed payload for a completed grouped idempotency key', async () => {
    const fixture = await createBaseFixture(prisma);
    const pair = await createPairedSettlementSource(prisma, fixture);
    const service = createReversalsService(prisma);
    const idempotencyKey = 'changed-group-payload-key';

    await service.reverse(
      fixture.tenantId,
      actor(fixture),
      pair.earnLedgerEntryId,
      idempotencyKey,
      { reason: 'Original settlement correction' },
    );
    const beforeReplay = await groupedSettlementSnapshot(
      prisma,
      fixture,
      pair,
      idempotencyKey,
    );

    await expect(
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.redemptionLedgerEntryId,
        idempotencyKey,
        { reason: 'Changed settlement correction' },
      ),
    ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_CONFLICT' } });

    expect(
      await groupedSettlementSnapshot(prisma, fixture, pair, idempotencyKey),
    ).toEqual(beforeReplay);
    await expectSingleGroupedReversal(prisma, fixture, pair);
  }, 120000);

  it('fails closed for database-backed grouped settlement corruption', async () => {
    type Fixture = Awaited<ReturnType<typeof createBaseFixture>>;
    type Pair = Awaited<ReturnType<typeof createPairedSettlementSource>>;
    type Scenario = {
      name: string;
      pairOptions?: {
        earnCorrelationId?: string;
        earnEffectiveAt?: Date;
        sourceEffectiveAt?: Date;
      };
      prepare: (fixture: Fixture, pair: Pair) => Promise<void>;
    };
    const scenarios: Scenario[] = [
      {
        name: 'partly consumed Earn lot',
        prepare: async (fixture, pair) => {
          await consumeEarnLot(prisma, fixture, pair.earnLotId, 20n);
        },
      },
      {
        name: 'expired Earn lot',
        pairOptions: {
          earnEffectiveAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        },
        prepare: () => Promise.resolve(),
      },
      {
        name: 'expired redemption allocation source lot',
        pairOptions: {
          sourceEffectiveAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        },
        prepare: () => Promise.resolve(),
      },
      {
        name: 'partial reversal history on one settlement leg',
        prepare: async (fixture, pair) => {
          await createPartialEarnReversal(prisma, fixture, pair, 20n);
        },
      },
      {
        name: 'partial redemption restoration evidence',
        prepare: async (fixture, pair) => {
          await createPartialRedemptionReversal(prisma, fixture, pair, 1_000n);
        },
      },
      {
        name: 'mismatched Earn correlation',
        pairOptions: { earnCorrelationId: 'unrelated-correlation' },
        prepare: () => Promise.resolve(),
      },
      {
        name: 'extra receipt ledger effect',
        prepare: async (fixture, pair) => {
          await addCreditAdjustmentEffectOnReceipt(prisma, fixture, pair);
        },
      },
    ];

    for (const scenario of scenarios) {
      const fixture = await createBaseFixture(prisma);
      const pair = await createPairedSettlementSource(
        prisma,
        fixture,
        scenario.pairOptions,
      );
      await scenario.prepare(fixture, pair);
      const idempotencyKey = `review-${randomUUID()}`;
      const before = await groupedSettlementSnapshot(
        prisma,
        fixture,
        pair,
        idempotencyKey,
      );
      const auditService = {
        recordWithClient: jest.fn().mockResolvedValue(undefined),
      };
      const service = createReversalsService(prisma, auditService);

      await expect(
        service.reverse(
          fixture.tenantId,
          actor(fixture),
          pair.earnLedgerEntryId,
          idempotencyKey,
          { reason: 'Review malformed settlement' },
        ),
      ).rejects.toMatchObject({
        response: { code: 'REVERSAL_REVIEW_REQUIRED' },
      });
      expect(
        await groupedSettlementSnapshot(prisma, fixture, pair, idempotencyKey),
      ).toEqual(before);
      expect(auditService.recordWithClient).not.toHaveBeenCalled();
    }
  }, 120000);

  it('keeps grouped financial history after asynchronous SMS delivery failure', async () => {
    const fixture = await createBaseFixture(prisma);
    const pair = await createPairedSettlementSource(prisma, fixture);
    const service = createReversalsService(prisma);
    const response = await service.reverse(
      fixture.tenantId,
      actor(fixture),
      pair.redemptionLedgerEntryId,
      'group-sms-failure-key',
      { reason: 'Receipt settlement correction' },
    );
    const reversalIds = [
      response.earnReversalTransactionId!,
      response.redemptionReversalTransactionId!,
    ];
    const beforeDelivery = await prisma.loyaltyLedgerEntry.findMany({
      where: {
        tenantId: fixture.tenantId,
        reversesEntryId: { in: reversalIds },
      },
      orderBy: { id: 'asc' },
      select: { id: true, reversesEntryId: true, amountKobo: true, type: true },
    });
    const smsEvent = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        tenantId: fixture.tenantId,
        aggregateId: response.earnReversalTransactionId!,
        eventType: 'sms.send',
      },
    });
    const providerEventIds: string[] = [];
    const runtime = new OutboxWorkerRuntime(
      prisma as never,
      loadWorkerConfig({ ...process.env, REDIS_URL: 'redis://127.0.0.1:6379' }),
      new ScriptedSmsProvider((input) => {
        providerEventIds.push(input.outboxEventId);
        return {
          status: 'FAILED',
          errorMessage: 'simulated async provider failure',
        };
      }),
    );
    const handleJob = (
      runtime as unknown as {
        handleJob: (job: {
          data: { id: string; tenantId: string };
          discard: () => void;
        }) => Promise<void>;
      }
    ).handleJob.bind(runtime);

    const retryJob = {
      data: { id: smsEvent.id, tenantId: fixture.tenantId },
      discard: jest.fn(),
    };
    await handleJob(retryJob);
    await handleJob(retryJob);

    const afterDelivery = await prisma.loyaltyLedgerEntry.findMany({
      where: {
        tenantId: fixture.tenantId,
        reversesEntryId: { in: reversalIds },
      },
      orderBy: { id: 'asc' },
      select: { id: true, reversesEntryId: true, amountKobo: true, type: true },
    });
    const message = await prisma.smsMessage.findUniqueOrThrow({
      where: {
        tenantId_outboxEventId: {
          tenantId: fixture.tenantId,
          outboxEventId: smsEvent.id,
        },
      },
      select: { status: true, attempts: true, lastError: true },
    });

    expect(afterDelivery).toEqual(beforeDelivery);
    expect(providerEventIds).toEqual([smsEvent.id, smsEvent.id]);
    expect(message).toMatchObject({
      status: 'FAILED',
      attempts: 2,
      lastError: 'simulated async provider failure',
    });
    await expectSingleGroupedReversal(prisma, fixture, pair);
  }, 120000);

  it('commits at most one grouped reversal when distinct keys race', async () => {
    const fixture = await createBaseFixture(prisma);
    const pair = await createPairedSettlementSource(prisma, fixture);
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };
    const service = createReversalsService(prisma, auditService);

    const attempts = await Promise.allSettled([
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.earnLedgerEntryId,
        'group-race-earn-key',
        { reason: 'Receipt settlement correction' },
      ),
      service.reverse(
        fixture.tenantId,
        actor(fixture),
        pair.redemptionLedgerEntryId,
        'group-race-redeem-key',
        { reason: 'Receipt settlement correction' },
      ),
    ]);

    expect(
      attempts.filter((attempt) => attempt.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejection = attempts.find(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );
    expect(rejection?.reason).toMatchObject({
      response: { code: 'TRANSACTION_ALREADY_REVERSED' },
    });
    expect(auditService.recordWithClient).toHaveBeenCalledTimes(1);
    await expectSingleGroupedReversal(prisma, fixture, pair);
  }, 120000);
});

async function createBaseFixture(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const customerId = randomUUID();
  const cardId = randomUUID();
  const deviceId = randomUUID();

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Reversal Isolation Tenant' },
  });
  await prisma.branch.create({
    data: {
      id: branchId,
      tenantId,
      name: 'Reversal Isolation Branch',
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
      username: 'reverse-user@example.test',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      tenantId,
      branchId,
      fullName: 'Reversal Isolation Customer',
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
      barcodeValue: `CARD-${randomUUID()}`,
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
      name: 'Reversal Isolation Device',
      fingerprintHash: `device-${randomUUID()}`,
      attestationSecretCiphertext: 'ciphertext',
      attestationSecretVersion: 1,
      attestationSecretRotatedAt: new Date('2026-07-26T12:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  return { tenantId, branchId, userId, customerId, cardId, deviceId };
}

async function createEarnSource(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const olderAt = new Date('2026-07-26T11:50:00.000Z');
  const targetAt = new Date('2026-07-26T12:00:00.000Z');

  return prisma.$transaction(async (tx) => {
    const olderEarnReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-OLD-1',
      olderAt,
    );
    const olderLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: olderEarnReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 50n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `older-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: olderAt,
      },
    });

    const olderLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: olderLedger.id,
        originalAmountKobo: 50n,
        remainingAmountKobo: 50n,
        earnedAt: olderAt,
        expiresAt: addMonthsUtc(olderAt, 12),
      },
    });

    const targetEarnReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-TARGET-1',
      targetAt,
    );
    const targetLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: targetEarnReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 40n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `target-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: targetAt,
      },
    });

    const targetLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: targetLedger.id,
        originalAmountKobo: 40n,
        remainingAmountKobo: 40n,
        earnedAt: targetAt,
        expiresAt: addMonthsUtc(targetAt, 12),
      },
    });

    return {
      olderLotId: olderLot.id,
      creditLotId: targetLot.id,
      ledgerEntryId: targetLedger.id,
      amountKobo: 40n,
      expiresAt: targetLot.expiresAt,
    };
  });
}

async function createCreditAdjustmentSource(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
) {
  const olderAt = new Date('2026-07-26T11:50:00.000Z');
  const targetAt = new Date('2026-07-26T12:00:00.000Z');

  return prisma.$transaction(async (tx) => {
    const olderReceipt = await createReceipt(
      tx,
      fixture,
      'EARN-OLD-2',
      olderAt,
    );
    const olderLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: olderReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 50n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `older-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: olderAt,
      },
    });

    const olderLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: olderLedger.id,
        originalAmountKobo: 50n,
        remainingAmountKobo: 50n,
        earnedAt: olderAt,
        expiresAt: addMonthsUtc(olderAt, 12),
      },
    });

    const targetLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: null,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 40n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `credit-adjustment-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: targetAt,
      },
    });

    const targetAdjustment = await tx.adjustment.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        kind: AdjustmentKind.CREDIT,
        amountKobo: 40n,
        reason: 'Credit adjustment source',
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        ledgerEntryId: targetLedger.id,
        effectiveAt: targetAt,
      },
    });

    const targetLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: targetLedger.id,
        originalAmountKobo: 40n,
        remainingAmountKobo: 40n,
        earnedAt: targetAt,
        expiresAt: addMonthsUtc(targetAt, 12),
      },
    });

    return {
      olderLotId: olderLot.id,
      creditLotId: targetLot.id,
      ledgerEntryId: targetLedger.id,
      adjustmentId: targetAdjustment.id,
      amountKobo: 40n,
      expiresAt: targetLot.expiresAt,
    };
  });
}

async function consumeEarnLot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  creditLotId: string,
  amountKobo: bigint,
) {
  const occurredAt = new Date();
  await prisma.$transaction(async (tx) => {
    const receipt = await createReceipt(
      tx,
      fixture,
      `CONSUME-${randomUUID()}`,
      occurredAt,
      10_000n,
    );
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: receipt.id,
        type: LedgerEntryType.REDEEM,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `consume-earned-lot-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: occurredAt,
      },
    });
    const redemption = await tx.redemption.create({
      data: {
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId: receipt.id,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: amountKobo,
        basketAmountKobo: 10_000n,
        maximumAllowedKobo: 10_000n,
        confirmedAmountKobo: amountKobo,
        status: RedemptionStatus.CONFIRMED,
        policyVersion: 'grouped-reversal-integration-v1',
        ledgerEntryId: ledgerEntry.id,
        requestedAt: occurredAt,
        confirmedAt: occurredAt,
      },
    });

    await new LotAllocationService().allocateDebitFromExactLot(tx, {
      tenantId: fixture.tenantId,
      customerId: fixture.customerId,
      creditLotId,
      debitLedgerEntryId: ledgerEntry.id,
      redemptionId: redemption.id,
      amountKobo,
      now: occurredAt,
    });
  });
}

async function createPartialEarnReversal(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  pair: Awaited<ReturnType<typeof createPairedSettlementSource>>,
  amountKobo: bigint,
) {
  const effectiveAt = new Date();
  await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `partial-earn-reversal-${randomUUID()}`,
        reversesEntryId: pair.earnLedgerEntryId,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt,
      },
    });
    const adjustment = await tx.adjustment.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        kind: AdjustmentKind.DEBIT,
        amountKobo,
        reason: 'Partial Earn reversal test evidence',
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        ledgerEntryId: ledgerEntry.id,
        effectiveAt,
      },
    });
    await new LotAllocationService().allocateDebitFromExactLot(tx, {
      tenantId: fixture.tenantId,
      customerId: fixture.customerId,
      creditLotId: pair.earnLotId,
      debitLedgerEntryId: ledgerEntry.id,
      adjustmentId: adjustment.id,
      amountKobo,
      now: effectiveAt,
    });
  });
}

async function createPartialRedemptionReversal(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  pair: Awaited<ReturnType<typeof createPairedSettlementSource>>,
  amountKobo: bigint,
) {
  await prisma.$transaction(async (tx) => {
    const reversal = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        type: LedgerEntryType.REVERSAL,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `partial-redeem-reversal-${randomUUID()}`,
        reversesEntryId: pair.redemptionLedgerEntryId,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: new Date(),
      },
    });
    await tx.creditLot.updateMany({
      where: { tenantId: fixture.tenantId, id: pair.sourceLotId },
      data: { remainingAmountKobo: { increment: amountKobo } },
    });
    await tx.allocationRestoration.create({
      data: {
        tenantId: fixture.tenantId,
        allocationId: pair.allocationId,
        reversalLedgerEntryId: reversal.id,
        amountKobo,
      },
    });
  });
}

async function addCreditAdjustmentEffectOnReceipt(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  pair: Awaited<ReturnType<typeof createPairedSettlementSource>>,
) {
  const effectiveAt = new Date();
  await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: pair.receiptId,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 1n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `extra-receipt-effect-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt,
      },
    });
    await tx.adjustment.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        kind: AdjustmentKind.CREDIT,
        amountKobo: 1n,
        reason: 'Additional receipt effect test evidence',
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        ledgerEntryId: ledgerEntry.id,
        effectiveAt,
      },
    });
    await tx.creditLot.create({
      data: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: ledgerEntry.id,
        originalAmountKobo: 1n,
        remainingAmountKobo: 1n,
        earnedAt: effectiveAt,
        expiresAt: addMonthsUtc(effectiveAt, 12),
      },
    });
  });
}

async function createPairedSettlementSource(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  options: {
    earnCustomerId?: string;
    earnCorrelationId?: string;
    earnEffectiveAt?: Date;
    sourceEffectiveAt?: Date;
  } = {},
) {
  const correlationId = `grouped-settlement-${randomUUID()}`;
  const earnCustomerId = options.earnCustomerId ?? fixture.customerId;
  const occurredAt = new Date();
  const earnEffectiveAt = options.earnEffectiveAt ?? occurredAt;
  const sourceEffectiveAt =
    options.sourceEffectiveAt ??
    new Date(occurredAt.getTime() - 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const receipt = await createReceipt(
      tx,
      fixture,
      `GROUP-${randomUUID()}`,
      occurredAt,
      10_000n,
    );
    const redemptionLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: receipt.id,
        type: LedgerEntryType.REDEEM,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo: 3_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: occurredAt,
      },
    });
    const redemption = await tx.redemption.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        branchId: fixture.branchId,
        customerId: fixture.customerId,
        cardId: fixture.cardId,
        deviceId: fixture.deviceId,
        receiptId: receipt.id,
        requestedByTenantId: fixture.tenantId,
        requestedBy: fixture.userId,
        requestedAmountKobo: 3_000n,
        basketAmountKobo: 10_000n,
        maximumAllowedKobo: 10_000n,
        confirmedAmountKobo: 3_000n,
        status: RedemptionStatus.CONFIRMED,
        policyVersion: 'grouped-reversal-integration-v1',
        ledgerEntryId: redemptionLedger.id,
        requestedAt: occurredAt,
        confirmedAt: occurredAt,
      },
    });
    const earnLedger = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: earnCustomerId,
        receiptId: receipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 140n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: options.earnCorrelationId ?? `${correlationId}:earn`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: earnEffectiveAt,
      },
    });
    const earnLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: earnCustomerId,
        earnLedgerEntryId: earnLedger.id,
        originalAmountKobo: 140n,
        remainingAmountKobo: 140n,
        earnedAt: earnEffectiveAt,
        expiresAt: addMonthsUtc(earnEffectiveAt, 12),
      },
    });
    const sourceReceipt = await createReceipt(
      tx,
      fixture,
      `SOURCE-${randomUUID()}`,
      sourceEffectiveAt,
      5_000n,
    );
    const sourceEarn = await tx.loyaltyLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        receiptId: sourceReceipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 5_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `source-earn-${randomUUID()}`,
        createdByTenantId: fixture.tenantId,
        createdBy: fixture.userId,
        effectiveAt: sourceEffectiveAt,
      },
    });
    const sourceLot = await tx.creditLot.create({
      data: {
        id: randomUUID(),
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        earnLedgerEntryId: sourceEarn.id,
        originalAmountKobo: 5_000n,
        remainingAmountKobo: 2_000n,
        earnedAt: sourceEffectiveAt,
        expiresAt: addMonthsUtc(sourceEffectiveAt, 12),
      },
    });
    const allocation = await tx.redemptionAllocation.create({
      data: {
        tenantId: fixture.tenantId,
        redemptionId: redemption.id,
        redemptionLedgerEntryId: redemptionLedger.id,
        creditLotId: sourceLot.id,
        amountKobo: 3_000n,
        allocationOrder: 1,
      },
    });

    return {
      receiptId: receipt.id,
      earnLedgerEntryId: earnLedger.id,
      earnLotId: earnLot.id,
      redemptionLedgerEntryId: redemptionLedger.id,
      redemptionId: redemption.id,
      sourceLotId: sourceLot.id,
      allocationId: allocation.id,
    };
  });
}

async function expectSingleGroupedReversal(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  pair: Awaited<ReturnType<typeof createPairedSettlementSource>>,
) {
  const compensations = await prisma.loyaltyLedgerEntry.findMany({
    where: {
      tenantId: fixture.tenantId,
      reversesEntryId: {
        in: [pair.earnLedgerEntryId, pair.redemptionLedgerEntryId],
      },
    },
    select: { id: true, reversesEntryId: true },
  });
  expect(compensations).toHaveLength(2);
  expect(new Set(compensations.map((row) => row.reversesEntryId))).toEqual(
    new Set([pair.earnLedgerEntryId, pair.redemptionLedgerEntryId]),
  );
  const earnReversal = compensations.find(
    (row) => row.reversesEntryId === pair.earnLedgerEntryId,
  );
  if (!earnReversal) {
    throw new Error('Expected the grouped Earn compensation');
  }

  const [
    earnLot,
    sourceLot,
    restorations,
    messages,
    redemption,
    originalEntries,
    activeLots,
    smsOutboxEvents,
    fraudOutboxEvents,
  ] = await Promise.all([
    prisma.creditLot.findUniqueOrThrow({
      where: {
        tenantId_id: { tenantId: fixture.tenantId, id: pair.earnLotId },
      },
      select: { remainingAmountKobo: true },
    }),
    prisma.creditLot.findUniqueOrThrow({
      where: {
        tenantId_id: { tenantId: fixture.tenantId, id: pair.sourceLotId },
      },
      select: { remainingAmountKobo: true },
    }),
    prisma.allocationRestoration.findMany({
      where: { tenantId: fixture.tenantId, allocationId: pair.allocationId },
      select: { amountKobo: true },
    }),
    prisma.smsMessage.findMany({
      where: {
        tenantId: fixture.tenantId,
        receiptId: pair.receiptId,
        template: 'transaction-reversed',
      },
      select: { id: true, status: true },
    }),
    prisma.redemption.findUniqueOrThrow({
      where: {
        tenantId_id: { tenantId: fixture.tenantId, id: pair.redemptionId },
      },
      select: { status: true },
    }),
    prisma.loyaltyLedgerEntry.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [pair.earnLedgerEntryId, pair.redemptionLedgerEntryId] },
      },
      select: { status: true },
    }),
    prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        customerId: fixture.customerId,
        remainingAmountKobo: { gt: 0n },
        expiresAt: { gt: new Date() },
      },
      select: { remainingAmountKobo: true },
    }),
    prisma.outboxEvent.findMany({
      where: {
        tenantId: fixture.tenantId,
        eventType: 'sms.send',
        aggregateId: earnReversal.id,
      },
      select: { id: true },
    }),
    prisma.outboxEvent.findMany({
      where: {
        tenantId: fixture.tenantId,
        eventType: 'fraud.evaluate',
        aggregateId: earnReversal.id,
      },
      select: { id: true },
    }),
  ]);

  expect(earnLot.remainingAmountKobo).toBe(0n);
  expect(sourceLot.remainingAmountKobo).toBe(5_000n);
  expect(restorations).toEqual([{ amountKobo: 3_000n }]);
  expect(messages).toHaveLength(1);
  expect(originalEntries).toHaveLength(2);
  expect(
    originalEntries.every(
      (entry) => entry.status === LedgerEntryStatus.CONFIRMED,
    ),
  ).toBe(true);
  expect(
    activeLots.reduce((sum, lot) => sum + lot.remainingAmountKobo, 0n),
  ).toBe(5_000n);
  expect(smsOutboxEvents).toHaveLength(1);
  expect(fraudOutboxEvents).toHaveLength(1);
  expect(redemption.status).toBe(RedemptionStatus.REVERSED);
}

async function groupedSettlementSnapshot(
  prisma: PrismaClient,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  pair: Awaited<ReturnType<typeof createPairedSettlementSource>>,
  idempotencyKey: string,
) {
  const [
    ledgerEntries,
    allocations,
    restorations,
    messages,
    smsOutboxEvents,
    fraudOutboxEvents,
    redemption,
    lots,
    idempotencyRecords,
  ] = await Promise.all([
    prisma.loyaltyLedgerEntry.findMany({
      where: {
        tenantId: fixture.tenantId,
        OR: [
          {
            id: { in: [pair.earnLedgerEntryId, pair.redemptionLedgerEntryId] },
          },
          {
            reversesEntryId: {
              in: [pair.earnLedgerEntryId, pair.redemptionLedgerEntryId],
            },
          },
        ],
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        type: true,
        direction: true,
        amountKobo: true,
        status: true,
        reversesEntryId: true,
      },
    }),
    prisma.redemptionAllocation.findMany({
      where: {
        tenantId: fixture.tenantId,
        redemptionLedgerEntryId: pair.redemptionLedgerEntryId,
      },
      select: { id: true, creditLotId: true, amountKobo: true },
    }),
    prisma.allocationRestoration.findMany({
      where: { tenantId: fixture.tenantId, allocationId: pair.allocationId },
      select: { id: true, reversalLedgerEntryId: true, amountKobo: true },
    }),
    prisma.smsMessage.findMany({
      where: {
        tenantId: fixture.tenantId,
        receiptId: pair.receiptId,
        template: 'transaction-reversed',
      },
      select: { id: true, status: true, attempts: true },
    }),
    prisma.outboxEvent.findMany({
      where: { tenantId: fixture.tenantId, eventType: 'sms.send' },
      select: { id: true, aggregateId: true },
    }),
    prisma.outboxEvent.findMany({
      where: { tenantId: fixture.tenantId, eventType: 'fraud.evaluate' },
      select: { id: true, aggregateId: true },
    }),
    prisma.redemption.findUniqueOrThrow({
      where: {
        tenantId_id: { tenantId: fixture.tenantId, id: pair.redemptionId },
      },
      select: { status: true },
    }),
    prisma.creditLot.findMany({
      where: {
        tenantId: fixture.tenantId,
        id: { in: [pair.earnLotId, pair.sourceLotId] },
      },
      orderBy: { id: 'asc' },
      select: { id: true, remainingAmountKobo: true, expiresAt: true },
    }),
    prisma.idempotencyRecord.findMany({
      where: {
        tenantId: fixture.tenantId,
        actorId: fixture.userId,
        idempotencyKey,
      },
      select: { id: true, requestHash: true, responseJson: true, status: true },
    }),
  ]);

  return {
    ledgerEntries,
    allocations,
    restorations,
    messages,
    smsOutboxEvents,
    fraudOutboxEvents,
    redemption,
    lots,
    idempotencyRecords,
  };
}

function createReversalsService(
  prisma: PrismaClient,
  auditService = { recordWithClient: jest.fn().mockResolvedValue(undefined) },
) {
  const activeBalanceService = {
    getActiveBalanceKobo: jest
      .fn()
      .mockImplementation(
        async (
          tenantId: string,
          customerId: string,
          now: Date,
          tx: PrismaClient,
        ) => {
          const lots = await tx.creditLot.findMany({
            where: {
              tenantId,
              customerId,
              remainingAmountKobo: { gt: 0n },
              expiresAt: { gt: now },
            },
            select: { remainingAmountKobo: true },
          });

          return lots.reduce((sum, lot) => sum + lot.remainingAmountKobo, 0n);
        },
      ),
  };
  return new ReversalsService(
    prisma as never,
    activeBalanceService as never,
    new LotAllocationService(),
    auditService as never,
  );
}

function actor(fixture: Awaited<ReturnType<typeof createBaseFixture>>) {
  return {
    user: {
      id: fixture.userId,
      tenantId: fixture.tenantId,
      branchId: fixture.branchId,
      username: 'reverse-user@example.test',
      supabaseAuthId: null,
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date('2026-07-26T12:00:00.000Z'),
      updatedAt: new Date('2026-07-26T12:00:00.000Z'),
    },
    session: {
      id: 'session-1',
      userId: fixture.userId,
      deviceId: null,
      deviceCredentialId: null,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date('2026-08-04T00:00:00.000Z'),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    },
  };
}

async function createReceipt(
  prisma: Pick<PrismaClient, 'receipt'>,
  fixture: Awaited<ReturnType<typeof createBaseFixture>>,
  receiptNumber: string,
  occurredAt: Date,
  purchaseAmountKobo = 30_000n,
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
      receiptWeekStart: new Date(Date.UTC(2026, 6, 20)),
      purchaseAmountKobo,
      occurredAt,
      capturedByTenantId: fixture.tenantId,
      capturedBy: fixture.userId,
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
