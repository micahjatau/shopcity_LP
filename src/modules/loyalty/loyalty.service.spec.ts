import { Prisma, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyService approval list', () => {
  it('returns typed earn and redemption approval targets', async () => {
    const service = new LoyaltyService(
      prismaService({
        transaction: jest.fn(),
        approvals: approvalRows(),
      }),
      auditService(),
      configService(),
    );

    await expect(service.listApprovals('tenant-1')).resolves.toEqual({
      items: [
        {
          id: 'approval-earn',
          targetType: 'EARN',
          receiptId: 'receipt-earn',
          redemptionId: null,
          status: 'PENDING',
          reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
          requestedAt: '2026-07-26T12:00:00.000Z',
          expiresAt: '2026-07-27T12:00:00.000Z',
          decidedAt: null,
          executedAt: null,
          receipt: {
            id: 'receipt-earn',
            customerId: 'customer-1',
            cardId: 'card-1',
            posReceiptNumber: 'POS-EARN',
            purchaseAmountKobo: 1_000_000,
            captureStatus: 'PENDING_APPROVAL',
            reviewStatus: 'PENDING',
          },
          redemption: null,
        },
        {
          id: 'approval-redeem',
          targetType: 'REDEEM',
          receiptId: 'receipt-redeem',
          redemptionId: 'redemption-1',
          status: 'PENDING',
          reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
          requestedAt: '2026-07-26T11:00:00.000Z',
          expiresAt: '2026-07-27T11:00:00.000Z',
          decidedAt: null,
          executedAt: null,
          receipt: {
            id: 'receipt-redeem',
            customerId: 'customer-1',
            cardId: 'card-1',
            posReceiptNumber: 'POS-REDEEM',
            purchaseAmountKobo: 2_000_000,
            captureStatus: 'CAPTURED',
            reviewStatus: 'APPROVED',
          },
          redemption: {
            id: 'redemption-1',
            requestedAmountKobo: 600_000,
            maximumAllowedKobo: 600_000,
            status: 'PENDING_APPROVAL',
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });
});

describe('LoyaltyService redemption approval execution', () => {
  it('executes an approved redemption with ledger, allocation, sms, audit, and state transitions', async () => {
    const tx = transactionClient({ approval: redemptionApprovalRow() });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const lotAllocationService = {
      allocateDebit: jest.fn().mockResolvedValue([
        {
          creditLotId: 'lot-1',
          amountKobo: 600_000n,
          allocationOrder: 1,
          expiresAt: new Date('2027-01-15T10:00:00.000Z'),
        },
      ]),
    } as never;
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      lotAllocationService,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).resolves.toMatchObject({
      id: 'approval-redeem',
      status: 'EXECUTED',
      receiptId: 'receipt-redeem',
      redemptionId: 'redemption-1',
      ledgerEntryId: 'ledger-1',
      redeemedKobo: 600_000,
      remainingBalanceKobo: 900_000,
      smsStatus: 'QUEUED',
    });
    const ledgerCreate = firstCall<{
      data: { type: string; direction: string; amountKobo: bigint };
    }>(tx.loyaltyLedgerEntry.create);
    expect(ledgerCreate.data.type).toBe('REDEEM');
    expect(ledgerCreate.data.direction).toBe('DEBIT');
    expect(ledgerCreate.data.amountKobo).toBe(600_000n);

    const redemptionUpdate = firstCall<{ data: { status: string } }>(
      tx.redemption.updateMany,
    );
    expect(redemptionUpdate.data.status).toBe('CONFIRMED');
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
  });

  it('rejects redemption approval execution when current balance is too low', async () => {
    const tx = transactionClient({ approval: redemptionApprovalRow() });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(300_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_BALANCE' },
    });
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects a pending redemption approval without financial effects', async () => {
    const tx = transactionClient({ approval: redemptionApprovalRow() });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const lotAllocationService = { allocateDebit: jest.fn() } as never;
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      lotAllocationService,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'REJECTED',
        'receipt mismatch',
      ),
    ).resolves.toMatchObject({
      id: 'approval-redeem',
      status: 'REJECTED',
      receiptId: 'receipt-redeem',
      redemptionId: 'redemption-1',
      ledgerEntryId: null,
      redeemedKobo: null,
      remainingBalanceKobo: null,
      smsStatus: null,
      reason: 'receipt mismatch',
      executedAt: null,
    });

    const approvalUpdate = firstCall<{ data: { status: string } }>(
      tx.approval.updateMany,
    );
    expect(approvalUpdate.data.status).toBe('REJECTED');

    const redemptionUpdate = firstCall<{ data: { status: string } }>(
      tx.redemption.updateMany,
    );
    expect(redemptionUpdate.data.status).toBe('REJECTED');
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });

  it('expires a stale redemption approval without financial effects', async () => {
    const tx = transactionClient({
      approval: redemptionApprovalRow({
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_EXPIRED' },
    });

    const approvalUpdate = firstCall<{ data: { status: string } }>(
      tx.approval.updateMany,
    );
    expect(approvalUpdate.data.status).toBe('EXPIRED');

    const redemptionUpdate = firstCall<{ data: { status: string } }>(
      tx.redemption.updateMany,
    );
    expect(redemptionUpdate.data.status).toBe('EXPIRED');
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });

  it('retries serialization conflicts during redemption approval execution', async () => {
    const tx = transactionClient({ approval: redemptionApprovalRow() });
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(serializationConflict())
      .mockImplementationOnce(
        (callback: (client: unknown) => Promise<unknown>) => callback(tx),
      );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      {
        allocateDebit: jest.fn().mockResolvedValue([
          {
            creditLotId: 'lot-1',
            amountKobo: 600_000n,
            allocationOrder: 1,
            expiresAt: new Date('2027-01-15T10:00:00.000Z'),
          },
        ]),
      } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).resolves.toMatchObject({ status: 'EXECUTED' });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('maps exhausted redemption approval serialization conflicts to a temporary conflict', async () => {
    const transaction = jest.fn().mockRejectedValue(serializationConflict());
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_TRANSACTION_CONFLICT' },
    });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('returns already decided for completed redemption approvals without financial effects', async () => {
    const tx = transactionClient({
      approval: redemptionApprovalRow({ status: 'EXECUTED' }),
    });
    const transaction = jest.fn(
      (callback: (client: unknown) => Promise<unknown>) => callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(900_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        authContext(),
        'approval-redeem',
        'APPROVED',
        'supervisor approved',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_ALREADY_DECIDED' },
    });
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });
});

describe('LoyaltyService earn transaction retries', () => {
  it('retries serialization conflicts and returns the successful earn response', async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(serializationConflict())
      .mockImplementationOnce((callback: (tx: unknown) => Promise<unknown>) =>
        callback(transactionClient()),
      );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(20_000n),
    );

    const response = await service.earn('tenant-1', authContext(), 'idem-1', {
      posReceiptNumber: 'POS-RETRY-1',
      cardSerialNumber: 'CARD-1',
      purchaseAmountKobo: 1_000_000,
      occurredAt: new Date().toISOString(),
    });

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(response.state).toBe('CONFIRMED');
  });

  it('maps exhausted serialization conflicts to a temporary concurrency error', async () => {
    const transaction = jest.fn().mockRejectedValue(serializationConflict());
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
    );

    await expect(
      service.earn('tenant-1', authContext(), 'idem-1', {
        posReceiptNumber: 'POS-RETRY-2',
        cardSerialNumber: 'CARD-1',
        purchaseAmountKobo: 1_000_000,
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({
      response: { code: 'EARN_TRANSACTION_CONFLICT' },
    });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it.each(['P2028', 'P2031'])('does not retry Prisma %s', async (code) => {
    const error = prismaKnownRequestError(code);
    const transaction = jest.fn().mockRejectedValue(error);
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
    );

    await expect(
      service.earn('tenant-1', authContext(), 'idem-1', {
        posReceiptNumber: `POS-${code}`,
        cardSerialNumber: 'CARD-1',
        purchaseAmountKobo: 1_000_000,
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('does not retry generic transaction-message errors', async () => {
    const error = new Error('transaction already closed');
    const transaction = jest.fn().mockRejectedValue(error);
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
    );

    await expect(
      service.earn('tenant-1', authContext(), 'idem-1', {
        posReceiptNumber: 'POS-GENERIC-TRANSACTION',
        cardSerialNumber: 'CARD-1',
        purchaseAmountKobo: 1_000_000,
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

function serializationConflict() {
  return prismaKnownRequestError('P2034');
}

function prismaKnownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('serialization conflict', {
    code,
    clientVersion: 'test',
  });
}

function firstCall<T>(mock: { mock: { calls: [T][] } }): T {
  return mock.mock.calls[0][0];
}

function prismaService({
  transaction,
  approvals = [],
}: {
  transaction: jest.Mock;
  approvals?: unknown[];
}) {
  return {
    $transaction: transaction,
    approval: {
      findMany: jest.fn().mockResolvedValue(approvals),
    },
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as never;
}

function approvalRows() {
  return [
    {
      id: 'approval-earn',
      targetType: 'EARN',
      receiptId: 'receipt-earn',
      redemptionId: null,
      status: 'PENDING',
      reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
      requestedAt: new Date('2026-07-26T12:00:00.000Z'),
      expiresAt: new Date('2026-07-27T12:00:00.000Z'),
      decidedAt: null,
      executedAt: null,
      receipt: {
        id: 'receipt-earn',
        customerId: 'customer-1',
        cardId: 'card-1',
        posReceiptNumber: 'POS-EARN',
        purchaseAmountKobo: 1_000_000n,
        captureStatus: 'PENDING_APPROVAL',
        reviewStatus: 'PENDING',
      },
      redemption: null,
    },
    {
      id: 'approval-redeem',
      targetType: 'REDEEM',
      receiptId: 'receipt-redeem',
      redemptionId: 'redemption-1',
      status: 'PENDING',
      reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
      requestedAt: new Date('2026-07-26T11:00:00.000Z'),
      expiresAt: new Date('2026-07-27T11:00:00.000Z'),
      decidedAt: null,
      executedAt: null,
      receipt: {
        id: 'receipt-redeem',
        customerId: 'customer-1',
        cardId: 'card-1',
        posReceiptNumber: 'POS-REDEEM',
        purchaseAmountKobo: 2_000_000n,
        captureStatus: 'CAPTURED',
        reviewStatus: 'APPROVED',
      },
      redemption: {
        id: 'redemption-1',
        requestedAmountKobo: 600_000n,
        maximumAllowedKobo: 600_000n,
        status: 'PENDING_APPROVAL',
      },
    },
  ];
}

function activeBalanceService(balance: bigint) {
  return {
    getActiveBalanceKobo: jest.fn().mockResolvedValue(balance),
  } as never;
}

function transactionClient({ approval = null }: { approval?: unknown } = {}) {
  const now = new Date();

  return {
    approval: {
      findFirst: jest.fn().mockResolvedValue(approval),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
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
      create: jest.fn().mockResolvedValue({}),
    },
    receipt: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'receipt-1',
        posReceiptNumber: 'POS-RETRY-1',
      }),
    },
    loyaltyLedgerEntry: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    redemption: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    creditLot: {
      create: jest.fn().mockResolvedValue({
        id: 'lot-1',
        expiresAt: now,
      }),
      findMany: jest.fn().mockResolvedValue([{ remainingAmountKobo: 20_000n }]),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
    smsMessage: {
      create: jest.fn().mockResolvedValue({ id: 'sms-1', status: 'QUEUED' }),
    },
  };
}

function redemptionApprovalRow({
  expiresAt = new Date('2099-01-01T00:00:00.000Z'),
  status = 'PENDING',
}: { expiresAt?: Date; status?: string } = {}) {
  return {
    id: 'approval-redeem',
    tenantId: 'tenant-1',
    receiptId: 'receipt-redeem',
    redemptionId: 'redemption-1',
    targetType: 'REDEEM',
    status,
    requestedByTenantId: 'tenant-1',
    requestedBy: 'requester-1',
    reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
    policyVersion:
      '900e3cb1e11c958ddfad2d8665d39a2a0683b20320ebadebdbc5775ce1488b4c',
    expiresAt,
    receipt: {
      id: 'receipt-redeem',
      occurredAt: new Date('2026-07-26T12:00:00.000Z'),
    },
    redemption: {
      id: 'redemption-1',
      customerId: 'customer-1',
      receiptId: 'receipt-redeem',
      requestedAmountKobo: 600_000n,
      basketAmountKobo: 2_000_000n,
      status: 'PENDING_APPROVAL',
      ledgerEntryId: null,
      branch: { status: 'ACTIVE' },
      device: { status: 'ACTIVE' },
      card: { status: 'ACTIVE' },
      customer: {
        id: 'customer-1',
        status: 'ACTIVE',
        isStaff: false,
        phoneE164: '+2348000000000',
      },
    },
  };
}

function auditService() {
  return {
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  } as never;
}

function configService() {
  return {
    get: (key: string) =>
      ({
        DEFAULT_EARN_RATE_BPS: 200,
        PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
        PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
        PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
        MIN_REDEMPTION_KOBO: 50_000,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
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
