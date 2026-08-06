import { Prisma, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthContext } from '../../common/auth/session.types';
import { RedemptionPolicyService } from './redemption-policy.service';
import { RedemptionsService } from './redemptions.service';

const REQUEST_OCCURRED_AT = '2026-07-26T12:00:00.000Z';

describe('RedemptionsService', () => {
  beforeEach(() => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-07-26T12:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates pending REDEEM approvals with redemptionId only', async () => {
    const tx = transactionClient();
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = serviceWith({ transaction });

    const response = await service.redeem('tenant-1', authContext(), 'idem-1', {
      cardSerialNumber: 'CARD-1',
      posReceiptNumber: 'POS-REDEEM-1',
      basketAmountKobo: 30_000,
      requestedRedemptionKobo: 6_000,
      occurredAt: REQUEST_OCCURRED_AT,
    });

    expect(response.state).toBe('PENDING_APPROVAL');
    const approvalCreate = tx.approval.create;

    expect(approvalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetType: 'REDEEM',
        redemptionId: 'redemption-1',
      }) as Record<string, unknown>,
    });
    const firstCall = approvalCreate.mock.calls[0]?.[0];
    expect(firstCall.data).not.toHaveProperty('receiptId');
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });

  it('rejects invalid high-value requests before reserving receipt identity', async () => {
    const tx = transactionClient();
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = serviceWith({ transaction });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-2', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-2',
        basketAmountKobo: 10_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'REDEMPTION_BASKET_CAP_EXCEEDED' },
    });

    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
    expect(tx.idempotencyRecord.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });

  it('rejects high-value requests with insufficient active balance before writes', async () => {
    const tx = transactionClient();
    const service = serviceWith({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      activeBalanceKobo: 5_000n,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-balance', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-BALANCE',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_BALANCE' } });

    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
  });

  it('rejects high-value requests with zero maximum allowed before writes', async () => {
    const tx = transactionClient();
    const service = serviceWith({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      activeBalanceKobo: 0n,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-zero', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-ZERO',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({ response: { code: 'REDEMPTION_NOT_ALLOWED' } });

    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
  });

  it('replays completed redemption responses before mutable validation', async () => {
    const transaction = jest.fn();
    const replay = { state: 'CONFIRMED', redemptionId: 'redemption-1' };
    const service = serviceWith({ transaction, replay });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-3', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-3',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).resolves.toBe(replay);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects stale or future redemption timestamps before writes', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-07-26T12:00:00.000Z').getTime());

    const tx = transactionClient();
    const service = serviceWith({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-stale', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-STALE',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: '2026-07-25T23:59:59.000Z',
      }),
    ).rejects.toMatchObject({
      response: { code: 'OFFLINE_REDEMPTION_NOT_ALLOWED' },
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-future', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-FUTURE',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: '2026-07-26T12:10:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: { code: 'OFFLINE_REDEMPTION_NOT_ALLOWED' },
    });

    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
  });

  it('replays completed response after idempotency P2002', async () => {
    const replay = { state: 'CONFIRMED', redemptionId: 'redemption-1' };
    const service = serviceWith({
      transaction: jest
        .fn()
        .mockRejectedValue(p2002(['actorId', 'endpoint', 'idempotencyKey'])),
      replay,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-3', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-3',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).resolves.toBe(replay);
  });

  it('replays completed responses even after the timestamp window closes', async () => {
    const staleOccurredAt = '2026-07-25T23:59:59.000Z';
    const replay = { state: 'CONFIRMED', redemptionId: 'redemption-1' };
    const transaction = jest.fn();
    const service = serviceWith({
      transaction,
      replay,
      replayRequestHash: expectedHash('idem-stale', staleOccurredAt),
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-stale', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-stale',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: staleOccurredAt,
      }),
    ).resolves.toBe(replay);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('maps idempotency P2002 without matching replay to IDEMPOTENCY_CONFLICT', async () => {
    const service = serviceWith({
      transaction: jest
        .fn()
        .mockRejectedValue(p2002(['actorId', 'endpoint', 'idempotencyKey'])),
      replay: null,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-4', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-4',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_CONFLICT' },
    });
  });

  it('retries redemption serialization conflicts within the bounded budget', async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(serializationConflict())
      .mockImplementationOnce(
        (callback: (client: ReturnType<typeof transactionClient>) => unknown) =>
          callback(transactionClient()),
      );
    const service = serviceWith({ transaction });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-9', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-9',
        basketAmountKobo: 20_000,
        requestedRedemptionKobo: 1_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).resolves.toMatchObject({
      state: 'CONFIRMED',
      redemptionId: 'redemption-1',
    });

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('surfaces redemption transaction conflicts after exhausting retries', async () => {
    const transaction = jest.fn().mockRejectedValue(serializationConflict());
    const service = serviceWith({ transaction });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-10', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-10',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('maps duplicate receipt P2002 to RECEIPT_ALREADY_USED', async () => {
    const service = serviceWith({
      transaction: jest
        .fn()
        .mockRejectedValue(
          p2002([
            'tenantId',
            'branchId',
            'receiptWeekStart',
            'normalizedPosReceiptNumber',
          ]),
        ),
      replay: null,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-5', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-5',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'RECEIPT_ALREADY_USED' },
    });
  });

  it('maps redemption receipt P2002 to REDEMPTION_TRANSACTION_CONFLICT', async () => {
    const service = serviceWith({
      transaction: jest.fn().mockRejectedValue(p2002(['receiptId'])),
      replay: null,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-6', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-6',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });
  });

  it('maps redemption ledger-entry P2002 to REDEMPTION_TRANSACTION_CONFLICT', async () => {
    const service = serviceWith({
      transaction: jest.fn().mockRejectedValue(p2002(['ledgerEntryId'])),
      replay: null,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-7', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-7',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });
  });

  it('maps approval-target P2002 to REDEMPTION_TRANSACTION_CONFLICT', async () => {
    const service = serviceWith({
      transaction: jest.fn().mockRejectedValue(p2002(['redemptionId'])),
      replay: null,
    });

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-8', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REDEEM-8',
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt: REQUEST_OCCURRED_AT,
      }),
    ).rejects.toMatchObject({
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });
  });
});

function serviceWith({
  transaction,
  replay,
  replayRequestHash,
  activeBalanceKobo = 100_000n,
}: {
  transaction: jest.Mock;
  replay?: unknown;
  replayRequestHash?: string;
  activeBalanceKobo?: bigint;
}) {
  const prisma = {
    $transaction: transaction,
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(
        replay === undefined
          ? null
          : replay === null
            ? null
            : {
                requestHash: replayRequestHash ?? expectedHash('idem-3'),
                responseJson: replay,
              },
      ),
    },
  } as never;

  return new RedemptionsService(
    prisma,
    {
      getActiveBalanceKobo: jest.fn().mockResolvedValue(activeBalanceKobo),
    } as never,
    {
      allocateDebit: jest.fn().mockResolvedValue([
        {
          creditLotId: 'lot-1',
          amountKobo: 1_000n,
          allocationOrder: 1,
          expiresAt: new Date('2027-07-26T12:00:00.000Z'),
        },
      ]),
    } as never,
    new RedemptionPolicyService(configService()),
    { recordWithClient: jest.fn().mockResolvedValue(undefined) } as never,
  );
}

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('serialization conflict', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

function transactionClient() {
  const now = new Date('2026-07-26T12:00:00.000Z');

  return {
    device: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'device-1',
        branchId: 'branch-1',
        status: 'ACTIVE',
        branch: {
          id: 'branch-1',
          status: 'ACTIVE',
          timezone: 'Africa/Lagos',
          receiptWeekStartDay: 1,
        },
      }),
    },
    card: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'card-1',
        barcodeValue: 'CARD-1',
        customerId: 'customer-1',
        status: 'ACTIVE',
        customer: {
          id: 'customer-1',
          phoneE164: '+2348000000000',
          status: 'ACTIVE',
          isStaff: false,
        },
      }),
    },
    idempotencyRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
    receipt: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'receipt-1',
        posReceiptNumber: 'POS-REDEEM-1',
      }),
    },
    redemption: {
      create: jest.fn().mockResolvedValue({ id: 'redemption-1' }),
      update: jest.fn().mockResolvedValue({ id: 'redemption-1' }),
    },
    approval: {
      create: jest
        .fn<Promise<{ id: string }>, [{ data: Record<string, unknown> }]>()
        .mockResolvedValue({ id: 'approval-1' }),
    },
    loyaltyLedgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
    smsMessage: {
      create: jest.fn().mockResolvedValue({ id: 'sms-1', status: 'QUEUED' }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    creditLot: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { remainingAmountKobo: 94_000n } }),
    },
    now,
  };
}

function p2002(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

function expectedHash(
  idempotencyKey: string,
  occurredAt = REQUEST_OCCURRED_AT,
) {
  const suffix = idempotencyKey.replace('idem-', '');

  return createHash('sha256')
    .update(
      stableStringify({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: `POS-REDEEM-${suffix.toUpperCase()}`,
        basketAmountKobo: 30_000,
        requestedRedemptionKobo: 6_000,
        occurredAt,
        deviceId: 'device-1',
      }),
    )
    .digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(',')}}`;
}

function configService() {
  return {
    get: (key: string) =>
      ({
        MIN_REDEMPTION_KOBO: 500,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 5_000,
      })[key],
  } as never;
}

function authContext(): AuthContext {
  const now = new Date();

  return {
    session: {
      id: 'session-1',
      userId: 'user-1',
      deviceId: 'device-1',
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: 'ACTIVE',
      expiresAt: now,
      revokedAt: null,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      username: 'cashier@example.test',
      role: UserRole.CASHIER,
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
