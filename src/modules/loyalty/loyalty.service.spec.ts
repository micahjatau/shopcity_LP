import {
  ApprovalStatus,
  ApprovalTargetType,
  Prisma,
  ReceiptReviewStatus,
  RedemptionStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthContext } from '../../common/auth/session.types';
import { LoyaltyService } from './loyalty.service';

const FIXED_OCCURRED_AT = '2026-07-26T12:00:00.000Z';

describe('LoyaltyService earn transaction retries', () => {
  beforeEach(() => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-07-26T12:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
      occurredAt: FIXED_OCCURRED_AT,
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
        occurredAt: FIXED_OCCURRED_AT,
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
        occurredAt: FIXED_OCCURRED_AT,
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
        occurredAt: FIXED_OCCURRED_AT,
      }),
    ).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe('LoyaltyService redemption approvals', () => {
  it('lists REDEEM approvals with receipt evidence through redemption.receipt', async () => {
    const service = new LoyaltyService(
      {
        approval: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'approval-1',
              receiptId: null,
              redemptionId: 'redemption-1',
              targetType: ApprovalTargetType.REDEEM,
              status: ApprovalStatus.PENDING,
              reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
              requestedAt: new Date('2026-07-26T12:00:00.000Z'),
              expiresAt: new Date('2127-07-30T12:00:00.000Z'),
              decidedAt: null,
              executedAt: null,
              receipt: null,
              redemption: {
                id: 'redemption-1',
                receiptId: 'receipt-1',
                receipt: {
                  id: 'receipt-1',
                  posReceiptNumber: 'POS-REDEEM-1',
                  purchaseAmountKobo: 30_000n,
                  captureStatus: 'PENDING_APPROVAL',
                  reviewStatus: ReceiptReviewStatus.PENDING,
                },
              },
            },
          ]),
        },
      } as never,
      auditService(),
      configService(),
    );

    await expect(service.listApprovals('tenant-1')).resolves.toMatchObject({
      items: [
        {
          id: 'approval-1',
          receiptId: 'receipt-1',
          redemptionId: 'redemption-1',
          targetType: ApprovalTargetType.REDEEM,
          receipt: { posReceiptNumber: 'POS-REDEEM-1' },
        },
      ],
    });
  });

  it('executes REDEEM approval using redemption receipt evidence', async () => {
    const tx = redemptionApprovalTransactionClient();
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const allocateDebit = jest.fn().mockResolvedValue([
      {
        creditLotId: 'lot-1',
        amountKobo: 6_000n,
        allocationOrder: 1,
        expiresAt: new Date('2027-07-26T12:00:00.000Z'),
      },
    ]);
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      redemptionConfigService(),
      activeBalanceService(100_000n),
      { allocateDebit } as never,
    );

    const response = await service.decideApproval(
      'tenant-1',
      supervisorAuthContext(),
      'approval-1',
      'APPROVED',
      'approved by supervisor',
    );

    expect(response).toMatchObject({
      status: ApprovalStatus.EXECUTED,
      receiptId: 'receipt-1',
      redemptionId: 'redemption-1',
      ledgerEntryId: 'ledger-1',
      redeemedAmountKobo: 6_000,
    });
    expect(tx.loyaltyLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'REDEEM',
        direction: 'DEBIT',
        amountKobo: 6_000n,
        receiptId: 'receipt-1',
      }) as Record<string, unknown>,
    });
    expect(allocateDebit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        redemptionId: 'redemption-1',
        debitLedgerEntryId: 'ledger-1',
      }),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it('treats approval policy changes as terminal rejection outcomes', async () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'approval-1',
          tenantId: 'tenant-1',
          receiptId: null,
          redemptionId: 'redemption-1',
          targetType: ApprovalTargetType.REDEEM,
          status: ApprovalStatus.PENDING,
          requestedByTenantId: 'tenant-1',
          requestedBy: 'cashier-1',
          policyVersion: 'stale-policy-version',
          expiresAt: new Date('2127-07-30T12:00:00.000Z'),
          redemption: {
            id: 'redemption-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            customerId: 'customer-1',
            cardId: 'card-1',
            deviceId: 'device-1',
            receiptId: 'receipt-1',
            requestedAmountKobo: 6_000n,
            basketAmountKobo: 30_000n,
            maximumAllowedKobo: 9_000n,
            status: RedemptionStatus.PENDING_APPROVAL,
            ledgerEntryId: null,
            policyVersion: 'stale-policy-version',
            receipt: {
              id: 'receipt-1',
              tenantId: 'tenant-1',
              branchId: 'branch-1',
              customerId: 'customer-1',
              cardId: 'card-1',
              deviceId: 'device-1',
              posReceiptNumber: 'POS-REDEEM-1',
              purchaseAmountKobo: 30_000n,
              occurredAt: now,
              capturedByTenantId: 'tenant-1',
              capturedBy: 'cashier-1',
              captureStatus: 'PENDING_APPROVAL',
              reviewStatus: ReceiptReviewStatus.PENDING,
              branch: { status: 'ACTIVE' },
              card: {
                status: 'ACTIVE',
                customer: { phoneE164: '+2348000000000' },
              },
              customer: {
                status: 'ACTIVE',
                isStaff: false,
                phoneE164: '+2348000000000',
              },
              device: { status: 'ACTIVE' },
            },
          },
        }),
      },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      redemptionConfigService(),
      activeBalanceService(100_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        supervisorAuthContext(),
        'approval-1',
        'APPROVED',
        'approval policy changed',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_POLICY_CHANGED' },
    });
  });

  it('expires overdue approvals before listing approvals', async () => {
    const overdueApproval = {
      id: 'approval-expired',
      redemptionId: 'redemption-1',
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([overdueApproval]),
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      redemption: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const approvalFindMany = jest.fn().mockResolvedValue([
      {
        id: 'approval-1',
        receiptId: 'receipt-1',
        redemptionId: null,
        targetType: ApprovalTargetType.EARN,
        status: ApprovalStatus.PENDING,
        reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
        requestedAt: new Date('2026-07-26T12:00:00.000Z'),
        expiresAt: new Date('2127-07-30T12:00:00.000Z'),
        decidedAt: null,
        executedAt: null,
        receipt: {
          id: 'receipt-1',
          posReceiptNumber: 'POS-APPROVAL-1',
          purchaseAmountKobo: 30_000n,
          captureStatus: 'PENDING_APPROVAL',
          reviewStatus: ReceiptReviewStatus.PENDING,
        },
        redemption: null,
      },
    ]);
    const service = new LoyaltyService(
      {
        $transaction: transaction,
        approval: {
          findMany: approvalFindMany,
        },
      } as never,
      auditService(),
      configService(),
    );

    await expect(service.listApprovals('tenant-1')).resolves.toMatchObject({
      items: [
        {
          id: 'approval-1',
          receiptId: 'receipt-1',
          targetType: ApprovalTargetType.EARN,
        },
      ],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.approval.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.redemption.updateMany).toHaveBeenCalledTimes(1);
    expect(approvalFindMany).toHaveBeenCalledTimes(1);
  });

  it('returns redemption transaction details with allocation summary', async () => {
    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest
            .fn()
            .mockResolvedValue(redemptionLedgerEntryFixture()),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue({ status: 'QUEUED' }),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(94_000n),
    );

    await expect(
      service.getTransaction('tenant-1', 'ledger-1'),
    ).resolves.toMatchObject({
      transactionId: 'ledger-1',
      ledgerEntryId: 'ledger-1',
      redemptionId: 'redemption-1',
      redeemedAmountKobo: 6_000,
      creditKobo: 0,
      ledger: {
        direction: 'DEBIT',
        allocations: [
          {
            id: 'allocation-1',
            creditLotId: 'lot-1',
            amountKobo: 6_000,
            allocationOrder: 1,
          },
        ],
      },
    });
  });

  it('returns redemption transaction details with redemption evidence', async () => {
    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest
            .fn()
            .mockResolvedValue(redemptionLedgerEntryFixture()),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue({ status: 'QUEUED' }),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(94_000n),
    );

    await expect(
      service.getTransaction('tenant-1', 'ledger-1'),
    ).resolves.toMatchObject({
      transactionId: 'ledger-1',
      redemptionId: 'redemption-1',
      redeemedAmountKobo: 6_000,
      approvalId: null,
      ledger: {
        receiptId: 'receipt-1',
        allocations: [
          {
            creditLotId: 'lot-1',
            amountKobo: 6_000,
            restorations: [],
          },
        ],
      },
    });
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

function prismaService({ transaction }: { transaction: jest.Mock }) {
  return {
    $transaction: transaction,
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as never;
}

function redemptionApprovalTransactionClient() {
  const now = new Date('2026-07-26T12:00:00.000Z');
  const approvalUpdateMany = jest
    .fn()
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 1 });

  return {
    approval: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'approval-1',
        tenantId: 'tenant-1',
        receiptId: null,
        redemptionId: 'redemption-1',
        targetType: ApprovalTargetType.REDEEM,
        status: ApprovalStatus.PENDING,
        requestedByTenantId: 'tenant-1',
        requestedBy: 'cashier-1',
        policyVersion: redemptionPolicyVersion(),
        expiresAt: new Date('2127-07-30T12:00:00.000Z'),
        redemption: {
          id: 'redemption-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          customerId: 'customer-1',
          cardId: 'card-1',
          deviceId: 'device-1',
          receiptId: 'receipt-1',
          requestedAmountKobo: 6_000n,
          basketAmountKobo: 30_000n,
          maximumAllowedKobo: 9_000n,
          status: RedemptionStatus.PENDING_APPROVAL,
          ledgerEntryId: null,
          policyVersion: redemptionPolicyVersion(),
          receipt: {
            id: 'receipt-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            customerId: 'customer-1',
            cardId: 'card-1',
            deviceId: 'device-1',
            posReceiptNumber: 'POS-REDEEM-1',
            purchaseAmountKobo: 30_000n,
            occurredAt: now,
            capturedByTenantId: 'tenant-1',
            capturedBy: 'cashier-1',
            captureStatus: 'PENDING_APPROVAL',
            reviewStatus: ReceiptReviewStatus.PENDING,
            branch: { status: 'ACTIVE' },
            card: {
              status: 'ACTIVE',
              customer: { phoneE164: '+2348000000000' },
            },
            customer: {
              status: 'ACTIVE',
              isStaff: false,
              phoneE164: '+2348000000000',
            },
            device: { status: 'ACTIVE' },
          },
        },
      }),
      updateMany: approvalUpdateMany,
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    redemption: {
      update: jest.fn().mockResolvedValue({ id: 'redemption-1' }),
    },
    receipt: {
      update: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
    },
    loyaltyLedgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
    smsMessage: {
      create: jest.fn().mockResolvedValue({ id: 'sms-1' }),
    },
  };
}

function redemptionLedgerEntryFixture() {
  const now = new Date('2026-07-26T12:00:00.000Z');

  return {
    id: 'ledger-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    receiptId: 'receipt-1',
    type: 'REDEEM',
    direction: 'DEBIT',
    amountKobo: 6_000n,
    status: 'CONFIRMED',
    effectiveAt: now,
    creditLot: null,
    redemption: { id: 'redemption-1' },
    redemptionAllocations: [
      {
        id: 'allocation-1',
        creditLotId: 'lot-1',
        amountKobo: 6_000n,
        allocationOrder: 1,
        creditLot: { expiresAt: new Date('2027-07-26T12:00:00.000Z') },
        restorations: [],
      },
    ],
    receipt: {
      id: 'receipt-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      deviceId: 'device-1',
      posReceiptNumber: 'POS-REDEEM-1',
      purchaseAmountKobo: 30_000n,
      occurredAt: now,
      capturedAt: now,
      captureStatus: 'CAPTURED',
      reviewStatus: 'APPROVED',
      card: { barcodeValue: 'CARD-1' },
      customer: { id: 'customer-1' },
      device: { id: 'device-1' },
      approvals: [],
    },
  };
}

function activeBalanceService(balance: bigint) {
  return {
    getActiveBalanceKobo: jest.fn().mockResolvedValue(balance),
  } as never;
}

function transactionClient() {
  const now = new Date();

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
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
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
      create: jest.fn().mockResolvedValue({ id: 'sms-1' }),
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
      })[key],
  } as never;
}

function redemptionConfigService() {
  return {
    get: (key: string) =>
      ({
        MIN_REDEMPTION_KOBO: 500,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 5_000,
      })[key],
  } as never;
}

function redemptionPolicyVersion() {
  return createHash('sha256')
    .update(
      JSON.stringify({
        minimumRedemptionKobo: 500,
        maxBasketPercent: 30,
        approvalThresholdKobo: 5_000,
      }),
    )
    .digest('hex');
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

function supervisorAuthContext(): AuthContext {
  return {
    ...authContext(),
    user: {
      ...authContext().user,
      id: 'supervisor-1',
      role: UserRole.SUPERVISOR,
    },
  };
}
