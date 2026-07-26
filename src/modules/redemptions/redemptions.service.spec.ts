import { SmsMessageStatus, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { RedemptionsService } from './redemptions.service';

describe('RedemptionsService', () => {
  it('confirms an eligible redemption atomically', async () => {
    const tx = transactionClient();
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const activeBalanceService = balanceService([900_000n, 650_000n]);
    const lotAllocationService = {
      allocateDebit: jest.fn().mockResolvedValue([
        {
          creditLotId: 'lot-1',
          amountKobo: 250_000n,
          allocationOrder: 1,
          expiresAt: new Date('2027-01-15T10:00:00.000Z'),
        },
      ]),
    } as never;
    const service = new RedemptionsService(
      prismaService({ transaction }),
      activeBalanceService,
      lotAllocationService,
      policyService({ maximumAllowedKobo: 270_000n }),
      auditService(),
    );

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-1', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-1',
        basketAmountKobo: 900_000,
        requestedRedemptionKobo: 250_000,
        occurredAt: '2026-07-26T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      transactionId: 'ledger-1',
      redemptionId: 'redemption-1',
      receiptId: 'receipt-1',
      state: 'CONFIRMED',
      basketAmountKobo: 900_000,
      redeemedKobo: 250_000,
      maximumAllowedKobo: 270_000,
      remainingBalanceKobo: 650_000,
      smsStatus: SmsMessageStatus.QUEUED,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    const receiptCreate = firstCall<{
      data: { normalizedPosReceiptNumber: string; purchaseAmountKobo: bigint };
    }>(tx.receipt.create);
    expect(receiptCreate.data.normalizedPosReceiptNumber).toBe('POS-1');
    expect(receiptCreate.data.purchaseAmountKobo).toBe(900_000n);

    const redemptionCreate = firstCall<{
      data: {
        requestedAmountKobo: bigint;
        confirmedAmountKobo: bigint;
        status: string;
      };
    }>(tx.redemption.create);
    expect(redemptionCreate.data.requestedAmountKobo).toBe(250_000n);
    expect(redemptionCreate.data.confirmedAmountKobo).toBe(250_000n);
    expect(redemptionCreate.data.status).toBe('CONFIRMED');

    const ledgerCreate = firstCall<{
      data: { amountKobo: bigint; type: string; direction: string };
    }>(tx.loyaltyLedgerEntry.create);
    expect(ledgerCreate.data.amountKobo).toBe(250_000n);
    expect(ledgerCreate.data.type).toBe('REDEEM');
    expect(ledgerCreate.data.direction).toBe('DEBIT');

    const idempotencyCreate = firstCall<{
      data: { status: string; responseJson: { state: string } };
    }>(tx.idempotencyRecord.create);
    expect(idempotencyCreate.data.status).toBe('COMPLETED');
    expect(idempotencyCreate.data.responseJson.state).toBe('CONFIRMED');
  });

  it('replays a completed idempotent redemption response without duplicate writes', async () => {
    const replay = {
      transactionId: 'ledger-1',
      redemptionId: 'redemption-1',
      receiptId: 'receipt-1',
      state: 'CONFIRMED',
      basketAmountKobo: 900_000,
      redeemedKobo: 250_000,
      maximumAllowedKobo: 270_000,
      remainingBalanceKobo: 650_000,
      allocations: [],
      smsStatus: SmsMessageStatus.QUEUED,
    };
    const tx = transactionClient({
      existingIdempotency: {
        requestHash:
          '8f6f5e7344c80c92d63358139f483799b8fbe1b6fe4d968f610060ea9b7add02',
        responseJson: replay,
        status: 'COMPLETED',
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const service = new RedemptionsService(
      prismaService({ transaction }),
      balanceService(),
      { allocateDebit: jest.fn() } as never,
      policyService(),
      auditService(),
    );

    await expect(
      service.redeem('tenant-1', authContext(), 'idem-1', {
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-1',
        basketAmountKobo: 900_000,
        requestedRedemptionKobo: 250_000,
        occurredAt: '2026-07-26T12:00:00.000Z',
      }),
    ).resolves.toEqual(replay);

    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('creates a pending approval for high-value redemption without financial effects', async () => {
    const tx = transactionClient();
    const service = redemptionService({
      tx,
      policy: policyService({ requiresApproval: true }),
    });

    await expect(redeemRequest(service)).resolves.toMatchObject({
      transactionId: null,
      redemptionId: 'redemption-1',
      receiptId: 'receipt-1',
      approvalId: 'approval-1',
      state: 'PENDING_APPROVAL',
      requestedAmountKobo: 250_000,
      maximumAllowedKobo: 270_000,
      reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
    });
    expect(tx.approval.create).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });

  it('rejects redemptions below the configured minimum without writes', async () => {
    const tx = transactionClient();
    const service = redemptionService({
      tx,
      policy: policyService({
        minimumRedemptionKobo: 300_000n,
        maximumAllowedKobo: 500_000n,
      }),
    });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'REDEMPTION_BELOW_MINIMUM' },
    });
    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.redemption.create).not.toHaveBeenCalled();
  });

  it('rejects redemptions above the basket cap without writes', async () => {
    const tx = transactionClient();
    const service = redemptionService({
      tx,
      policy: policyService({
        basketCapKobo: 200_000n,
        maximumAllowedKobo: 200_000n,
      }),
    });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'REDEMPTION_EXCEEDS_BASKET_CAP' },
    });
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects redemptions above active balance without writes', async () => {
    const tx = transactionClient();
    const service = redemptionService({
      tx,
      policy: policyService({
        basketCapKobo: 270_000n,
        maximumAllowedKobo: 200_000n,
      }),
    });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_BALANCE' },
    });
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects same-purchase credit consumption before duplicate receipt handling', async () => {
    const tx = transactionClient({
      duplicateReceipt: { id: 'receipt-1' },
      samePurchaseCreditLot: { id: 'lot-1' },
    });
    const service = redemptionService({ tx });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'SAME_PURCHASE_REDEMPTION_NOT_ALLOWED' },
    });
    expect(tx.redemption.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate receipt reuse without financial writes', async () => {
    const tx = transactionClient({ duplicateReceipt: { id: 'receipt-1' } });
    const service = redemptionService({ tx });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'RECEIPT_ALREADY_USED' },
    });
    expect(tx.redemption.create).not.toHaveBeenCalled();
  });

  it('rejects inactive devices as offline redemption attempts', async () => {
    const tx = transactionClient({ deviceStatus: 'INACTIVE' });
    const service = redemptionService({ tx });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'DEVICE_NOT_ACTIVE' },
    });
    expect(tx.receipt.create).not.toHaveBeenCalled();
  });

  it('rejects conflicting idempotency payloads without duplicate writes', async () => {
    const tx = transactionClient({
      existingIdempotency: {
        requestHash: 'different-hash',
        responseJson: {},
        status: 'COMPLETED',
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    const service = redemptionService({ tx });

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_CONFLICT' },
    });
    expect(tx.receipt.create).not.toHaveBeenCalled();
  });

  it('returns dependency unavailable when collaborators are missing', async () => {
    const transaction = jest.fn();
    const service = new RedemptionsService(
      prismaService({ transaction }),
      balanceService(),
      { allocateDebit: jest.fn() } as never,
      policyService(),
      null as never,
    );

    await expect(redeemRequest(service)).rejects.toMatchObject({
      response: { code: 'DEPENDENCY_UNAVAILABLE' },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

function prismaService({ transaction }: { transaction: jest.Mock }) {
  return {
    $transaction: transaction,
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  } as never;
}

function firstCall<T>(mock: { mock: { calls: [T][] } }): T {
  return mock.mock.calls[0][0];
}

function redemptionService({
  tx,
  policy = policyService(),
}: {
  tx: ReturnType<typeof transactionClient>;
  policy?: ReturnType<typeof policyService>;
}) {
  const transaction = jest.fn(
    (callback: (client: unknown) => Promise<unknown>) => callback(tx),
  );

  return new RedemptionsService(
    prismaService({ transaction }),
    balanceService([900_000n, 650_000n]),
    { allocateDebit: jest.fn() } as never,
    policy,
    auditService(),
  );
}

function redeemRequest(service: RedemptionsService) {
  return service.redeem('tenant-1', authContext(), 'idem-1', {
    cardSerialNumber: 'CARD-1',
    posReceiptNumber: 'POS-1',
    basketAmountKobo: 900_000,
    requestedRedemptionKobo: 250_000,
    occurredAt: '2026-07-26T12:00:00.000Z',
  });
}

type IdempotencyReplay = {
  requestHash: string;
  responseJson: Record<string, unknown>;
  status: string;
  expiresAt: Date;
} | null;

function transactionClient({
  existingIdempotency = null,
  duplicateReceipt = null,
  samePurchaseCreditLot = null,
  deviceStatus = 'ACTIVE',
  branchStatus = 'ACTIVE',
}: {
  existingIdempotency?: IdempotencyReplay;
  duplicateReceipt?: { id: string } | null;
  samePurchaseCreditLot?: { id: string } | null;
  deviceStatus?: string;
  branchStatus?: string;
} = {}) {
  return {
    device: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'device-1',
        branchId: 'branch-1',
        status: deviceStatus,
        branch: {
          id: 'branch-1',
          status: branchStatus,
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
      findUnique: jest.fn().mockResolvedValue(existingIdempotency),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
    receipt: {
      findFirst: jest.fn().mockResolvedValue(duplicateReceipt),
      create: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
    },
    creditLot: {
      findFirst: jest.fn().mockResolvedValue(samePurchaseCreditLot),
    },
    redemption: {
      create: jest.fn().mockResolvedValue({ id: 'redemption-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    approval: {
      create: jest.fn().mockResolvedValue({ id: 'approval-1' }),
    },
    loyaltyLedgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
    smsMessage: {
      create: jest.fn().mockResolvedValue({
        id: 'sms-1',
        status: SmsMessageStatus.QUEUED,
      }),
    },
  };
}

function balanceService(balances: bigint[] = [900_000n]) {
  return {
    getActiveBalanceKobo: jest
      .fn()
      .mockImplementation(() => Promise.resolve(balances.shift() ?? 0n)),
    toJsonSafeKobo: jest.fn((value: bigint) => Number(value)),
  } as never;
}

function policyService({
  minimumRedemptionKobo = 50_000n,
  basketCapKobo = 270_000n,
  maximumAllowedKobo = 270_000n,
  requiresApproval = false,
} = {}) {
  return {
    evaluate: jest.fn().mockReturnValue({
      minimumRedemptionKobo,
      basketCapKobo,
      maximumAllowedKobo,
      approvalThresholdKobo: 500_000n,
      requiresApproval,
      policyVersion: 'policy-version',
    }),
  } as never;
}

function auditService() {
  return {
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  } as never;
}

function authContext(): AuthContext {
  const now = new Date('2026-07-26T12:00:00.000Z');

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
