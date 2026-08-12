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

  it('enqueues fraud evaluation for pending approval earns', async () => {
    const tx = transactionClient();
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(100_000n),
    );

    const response = await service.earn('tenant-1', authContext(), 'idem-2', {
      posReceiptNumber: 'POS-APPROVAL-1',
      cardSerialNumber: 'CARD-1',
      purchaseAmountKobo: 30_000_000,
      occurredAt: FIXED_OCCURRED_AT,
    });

    expect(response.state).toBe('PENDING_APPROVAL');
    const approvalData: Record<string, unknown> = {
      receiptId: 'receipt-1',
      targetType: 'EARN',
    };
    const fraudEventData: Record<string, unknown> = {
      tenantId: 'tenant-1',
      aggregateType: 'receipt',
      aggregateId: 'receipt-1',
      eventType: 'fraud.evaluate',
    };

    const approvalCreateArgs = tx.approval.create.mock.calls[0]?.[0];
    const outboxCreateArgs = tx.outboxEvent.create.mock.calls[0]?.[0];

    expect(approvalCreateArgs.data).toMatchObject(approvalData);
    expect(outboxCreateArgs.data).toMatchObject(fraudEventData);
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
  });
});

describe('LoyaltyService redemption approvals', () => {
  it('lists REDEEM approvals with receipt evidence through redemption.receipt', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      approval: {
        updateMany: jest.fn(),
      },
      redemption: {
        updateMany: jest.fn(),
      },
    };
    type ApprovalFindManyArgs = { where: { tenantId: string } };
    const approvalFindMany = jest
      .fn<Promise<unknown>, [ApprovalFindManyArgs]>()
      .mockResolvedValue([
        {
          id: 'approval-1',
          receiptId: null,
          redemptionId: 'redemption-1',
          targetType: ApprovalTargetType.REDEEM,
          status: ApprovalStatus.PENDING,
          reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
          requestedAmountKobo: 6_000n,
          requestedAt: new Date('2026-07-26T12:00:00.000Z'),
          expiresAt: new Date('2127-07-30T12:00:00.000Z'),
          decidedAt: null,
          executedAt: null,
          receipt: null,
          redemption: {
            id: 'redemption-1',
            receiptId: 'receipt-1',
            requestedAmountKobo: 6_000n,
            customerId: 'customer-1',
            receipt: {
              id: 'receipt-1',
              customerId: 'customer-1',
              posReceiptNumber: 'POS-REDEEM-1',
              purchaseAmountKobo: 30_000n,
              captureStatus: 'PENDING_APPROVAL',
              reviewStatus: ReceiptReviewStatus.PENDING,
              branchId: 'branch-1',
            },
          },
        },
      ]);
    const service = new LoyaltyService(
      {
        approval: {
          findMany: approvalFindMany,
        },
      } as never,
      auditService(),
      configService(),
    );

    await expect(
      service.listApprovals('tenant-1', supervisorAuthContext()),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'approval-1',
          receiptId: 'receipt-1',
          redemptionId: 'redemption-1',
          targetType: ApprovalTargetType.REDEEM,
          requestedAmountKobo: 6_000,
          receipt: { posReceiptNumber: 'POS-REDEEM-1' },
        },
      ],
    });

    const approvalFindManyArgs = approvalFindMany.mock.calls[0]?.[0] as
      { where?: { tenantId?: string } } | undefined;

    expect(approvalFindManyArgs?.where?.tenantId).toBe('tenant-1');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.approval.updateMany).not.toHaveBeenCalled();
    expect(tx.redemption.updateMany).not.toHaveBeenCalled();
  });

  it('replays completed earn responses before mutable validation', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date(FIXED_OCCURRED_AT).getTime());
    const transaction = jest.fn();
    const replay = { state: 'CONFIRMED', receiptId: 'receipt-1' };
    const requestHash = expectedEarnHash();
    try {
      const service = new LoyaltyService(
        prismaService({
          transaction,
          idempotencyRecord: {
            findUnique: jest.fn().mockResolvedValue({
              requestHash,
              responseJson: replay,
              status: 'COMPLETED',
            }),
          },
        }),
        auditService(),
        configService(),
        activeBalanceService(20_000n),
      );

      await expect(
        service.earn('tenant-1', authContext(), 'idem-replay', {
          posReceiptNumber: 'POS-REPLAY',
          cardSerialNumber: 'CARD-1',
          purchaseAmountKobo: 1_000_000,
          occurredAt: FIXED_OCCURRED_AT,
        }),
      ).resolves.toBe(replay);

      expect(transaction).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('replays completed earn responses even after timestamp windows close', async () => {
    const staleOccurredAt = '2026-07-25T23:59:59.000Z';
    const transaction = jest.fn();
    const replay = { state: 'CONFIRMED', receiptId: 'receipt-1' };
    const requestHash = expectedEarnHash(staleOccurredAt);
    const service = new LoyaltyService(
      prismaService({
        transaction,
        idempotencyRecord: {
          findUnique: jest.fn().mockResolvedValue({
            requestHash,
            responseJson: replay,
            status: 'COMPLETED',
          }),
        },
      }),
      auditService(),
      configService(),
      activeBalanceService(20_000n),
    );

    await expect(
      service.earn('tenant-1', authContext(), 'idem-stale-replay', {
        posReceiptNumber: 'POS-REPLAY',
        cardSerialNumber: 'CARD-1',
        purchaseAmountKobo: 1_000_000,
        occurredAt: staleOccurredAt,
      }),
    ).resolves.toBe(replay);

    expect(transaction).not.toHaveBeenCalled();
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
    expect(tx.$queryRaw).toHaveBeenCalled();
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

  it('re-reads the approval after locking and rejects stale post-lock state', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      approval: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'approval-1',
            tenantId: 'tenant-1',
            receiptId: 'receipt-1',
            redemptionId: null,
            targetType: ApprovalTargetType.EARN,
            status: ApprovalStatus.PENDING,
            requestedByTenantId: 'tenant-1',
            requestedBy: 'cashier-1',
            expiresAt: new Date('2127-07-30T12:00:00.000Z'),
            policyVersion: 'policy-version',
            redemption: null,
          })
          .mockResolvedValueOnce({
            id: 'approval-1',
            tenantId: 'tenant-1',
            receiptId: 'receipt-1',
            redemptionId: null,
            targetType: ApprovalTargetType.EARN,
            status: ApprovalStatus.APPROVED,
            requestedByTenantId: 'tenant-1',
            requestedBy: 'cashier-1',
            expiresAt: new Date('2127-07-30T12:00:00.000Z'),
            policyVersion: 'policy-version',
            receipt: null,
            redemption: null,
          }),
      },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditService(),
      configService(),
      activeBalanceService(100_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        supervisorAuthContext(),
        'approval-1',
        'APPROVED',
        'approved after lock',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_ALREADY_DECIDED' },
    });
  });

  it('records request-discovered expiry with system ownership and separate detector metadata', async () => {
    type AuditEntry = {
      tenantId: string;
      actorId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown>;
    };
    const recordWithClient = jest
      .fn<Promise<unknown>, [unknown, AuditEntry]>()
      .mockResolvedValue(undefined);
    const auditWriter = { recordWithClient };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      approval: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'approval-expired',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          redemptionId: null,
          targetType: ApprovalTargetType.EARN,
          status: ApprovalStatus.PENDING,
          requestedByTenantId: 'tenant-1',
          requestedBy: 'cashier-1',
          expiresAt: new Date('2026-07-25T12:00:00.000Z'),
          policyVersion: 'policy-version',
          receipt: {
            id: 'receipt-1',
            tenantId: 'tenant-1',
            customerId: 'customer-1',
            cardId: 'card-1',
            deviceId: 'device-1',
          },
          redemption: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      redemption: {
        updateMany: jest.fn(),
      },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const service = new LoyaltyService(
      prismaService({ transaction }),
      auditWriter as never,
      configService(),
      activeBalanceService(100_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        supervisorAuthContext(),
        'approval-expired',
        'APPROVED',
        'expired after supervisor request',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPROVAL_EXPIRED' },
    });

    const auditCall = recordWithClient.mock.calls[0]?.[1];

    expect(auditCall).toMatchObject({
      actorId: null,
      metadata: {
        detectedByTenantId: 'tenant-1',
        detectedBy: 'supervisor-1',
      },
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

    await expect(
      service.listApprovals('tenant-1', supervisorAuthContext()),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'approval-1',
          receiptId: 'receipt-1',
          targetType: ApprovalTargetType.EARN,
        },
      ],
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.approval.updateMany).not.toHaveBeenCalled();
    expect(tx.redemption.updateMany).not.toHaveBeenCalled();
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
      service.getTransaction('tenant-1', supervisorAuthContext(), 'ledger-1'),
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
      service.getTransaction('tenant-1', supervisorAuthContext(), 'ledger-1'),
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

  it('rejects cashier transaction reads outside branch scope', async () => {
    const ledgerEntry = redemptionLedgerEntryFixture();
    const receipt = ledgerEntry.receipt as unknown as {
      branchId: string;
      capturedBy: string;
    };
    receipt.branchId = 'branch-2';
    receipt.capturedBy = 'cashier-1';

    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(ledgerEntry),
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
      service.getTransaction('tenant-1', authContext(), 'ledger-1'),
    ).rejects.toMatchObject({
      response: { code: 'TRANSACTION_NOT_FOUND' },
    });
  });

  it('allows admin transaction reads across branch scope', async () => {
    const ledgerEntry = redemptionLedgerEntryFixture();
    const receipt = ledgerEntry.receipt as unknown as {
      branchId: string;
      capturedBy: string;
    };
    receipt.branchId = 'branch-2';
    receipt.capturedBy = 'cashier-2';

    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(ledgerEntry),
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
      service.getTransaction('tenant-1', adminAuthContext(), 'ledger-1'),
    ).resolves.toMatchObject({
      transactionId: 'ledger-1',
      ledgerEntryId: 'ledger-1',
    });
  });

  it('includes receiptless adjustment rows in the customer ledger', async () => {
    const ledgerEntry = {
      id: 'ledger-2',
      receiptId: null,
      type: 'ADJUSTMENT',
      direction: 'CREDIT',
      amountKobo: 4_000n,
      status: 'CONFIRMED',
      effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      redemption: null,
      adjustment: { id: 'adjustment-1' },
      creditLot: null,
      redemptionAllocations: [],
      allocationRestorations: [],
    };

    const findMany = jest.fn().mockResolvedValue([ledgerEntry]);
    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findMany,
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(94_000n),
    );

    await expect(
      service.listCustomerLedger(
        'tenant-1',
        supervisorAuthContext(),
        'customer-1',
      ),
    ).resolves.toMatchObject({
      customerId: 'customer-1',
      items: [
        {
          id: 'ledger-2',
          receiptId: null,
          type: 'ADJUSTMENT',
          direction: 'CREDIT',
          amountKobo: 4_000,
          restorations: [],
        },
      ],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          customer: { is: { branchId: 'branch-1' } },
        },
      }),
    );
  });

  it('returns expiry transaction details with immutable lot evidence', async () => {
    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(expiryLedgerEntryFixture()),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(0n),
    );

    await expect(
      service.getTransaction(
        'tenant-1',
        supervisorAuthContext(),
        'ledger-expiry-1',
      ),
    ).resolves.toMatchObject({
      transactionId: 'ledger-expiry-1',
      type: 'EXPIRY',
      direction: 'DEBIT',
      redeemedAmountKobo: 4_500,
      creditKobo: 0,
      posReceiptNumber: null,
      ledger: {
        type: 'EXPIRY',
        creditLot: {
          id: 'lot-expiry-1',
          remainingAmountKobo: 0,
          expiresAt: '2026-09-10T10:00:00.000Z',
        },
      },
    });
  });

  it('includes expiry rows in the customer ledger', async () => {
    const findMany = jest.fn().mockResolvedValue([expiryLedgerEntryFixture()]);
    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findMany,
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(0n),
    );

    await expect(
      service.listCustomerLedger(
        'tenant-1',
        supervisorAuthContext(),
        'customer-1',
      ),
    ).resolves.toMatchObject({
      customerId: 'customer-1',
      items: [
        {
          id: 'ledger-expiry-1',
          type: 'EXPIRY',
          direction: 'DEBIT',
          amountKobo: 4_500,
          creditLot: {
            id: 'lot-expiry-1',
            remainingAmountKobo: 0,
          },
        },
      ],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          customer: { is: { branchId: 'branch-1' } },
        },
      }),
    );
  });

  it('returns receiptless adjustment transaction details', async () => {
    const ledgerEntry = {
      id: 'ledger-3',
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      receiptId: null,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      amountKobo: 2_000n,
      status: 'CONFIRMED',
      effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      createdAt: new Date('2026-07-26T12:01:00.000Z'),
      creditLot: null,
      adjustment: {
        id: 'adjustment-3',
        kind: 'DEBIT',
        reason: 'Manual correction',
        createdBy: 'user-1',
      },
      redemption: null,
      redemptionAllocations: [],
      allocationRestorations: [],
      customer: { branchId: 'branch-1' },
      receipt: null,
      reversesEntryId: null,
    };

    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(ledgerEntry),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(92_000n),
    );

    await expect(
      service.getTransaction('tenant-1', supervisorAuthContext(), 'ledger-3'),
    ).resolves.toMatchObject({
      id: 'ledger-3',
      transactionId: 'ledger-3',
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      cardSerialNumber: null,
      posReceiptNumber: null,
      purchaseAmountKobo: null,
      captureStatus: null,
      reviewStatus: null,
      adjustment: {
        id: 'adjustment-3',
        kind: 'DEBIT',
        reason: 'Manual correction',
        createdBy: 'user-1',
      },
      ledger: {
        receiptId: null,
        restorations: [],
      },
    });
  });

  it('returns receiptless reversal transaction details', async () => {
    const ledgerEntry = {
      id: 'ledger-4',
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      receiptId: null,
      type: 'REVERSAL',
      direction: 'DEBIT',
      amountKobo: 2_000n,
      status: 'CONFIRMED',
      effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      createdAt: new Date('2026-07-26T12:01:00.000Z'),
      creditLot: null,
      adjustment: null,
      redemption: null,
      redemptionAllocations: [],
      allocationRestorations: [
        {
          id: 'restoration-1',
          allocationId: 'allocation-1',
          amountKobo: 2_000n,
          reversalLedgerEntryId: 'ledger-4',
          allocation: { creditLotId: 'lot-1' },
        },
      ],
      customer: { branchId: 'branch-1' },
      receipt: null,
      reversesEntryId: 'ledger-original',
    };

    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(ledgerEntry),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(92_000n),
    );

    await expect(
      service.getTransaction('tenant-1', supervisorAuthContext(), 'ledger-4'),
    ).resolves.toMatchObject({
      id: 'ledger-4',
      transactionId: 'ledger-4',
      type: 'REVERSAL',
      direction: 'DEBIT',
      cardSerialNumber: null,
      posReceiptNumber: null,
      purchaseAmountKobo: null,
      captureStatus: null,
      reviewStatus: null,
      reversal: {
        originalTransactionId: 'ledger-original',
        reason: null,
        createdBy: null,
        restorations: [
          {
            id: 'restoration-1',
            allocationId: 'allocation-1',
            creditLotId: 'lot-1',
            amountKobo: 2_000,
            reversalLedgerEntryId: 'ledger-4',
          },
        ],
      },
    });
  });

  it('returns debit adjustment reversal semantics for reversed earn transactions', async () => {
    const ledgerEntry = {
      id: 'ledger-5',
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      receiptId: null,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      amountKobo: 2_000n,
      status: 'CONFIRMED',
      effectiveAt: new Date('2026-07-26T12:00:00.000Z'),
      createdAt: new Date('2026-07-26T12:01:00.000Z'),
      creditLot: null,
      adjustment: {
        id: 'adjustment-5',
        kind: 'DEBIT',
        reason: 'Customer refund',
        createdBy: 'supervisor-1',
      },
      redemption: null,
      redemptionAllocations: [],
      allocationRestorations: [],
      customer: { branchId: 'branch-1' },
      receipt: null,
      reversesEntryId: 'earn-original',
    };

    const service = new LoyaltyService(
      {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue(ledgerEntry),
        },
        smsMessage: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      auditService(),
      configService(),
      activeBalanceService(90_000n),
    );

    await expect(
      service.getTransaction('tenant-1', supervisorAuthContext(), 'ledger-5'),
    ).resolves.toMatchObject({
      id: 'ledger-5',
      transactionId: 'ledger-5',
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      adjustment: {
        id: 'adjustment-5',
        kind: 'DEBIT',
        reason: 'Customer refund',
        createdBy: 'supervisor-1',
      },
      reversal: {
        originalTransactionId: 'earn-original',
        reason: 'Customer refund',
        createdBy: 'supervisor-1',
        restorations: [],
      },
    });
  });

  it('does not audit rejected redemptions as expired', async () => {
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
      },
      redemption: {
        update: jest.fn().mockResolvedValue({}),
      },
      receipt: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    const audit = { recordWithClient: jest.fn().mockResolvedValue(undefined) };
    const service = new LoyaltyService(
      prismaService({ transaction }),
      audit as never,
      redemptionConfigService(),
      activeBalanceService(100_000n),
      { allocateDebit: jest.fn() } as never,
    );

    await expect(
      service.decideApproval(
        'tenant-1',
        supervisorAuthContext(),
        'approval-1',
        'REJECTED',
        'not approved',
      ),
    ).resolves.toMatchObject({
      status: ApprovalStatus.REJECTED,
      receiptId: 'receipt-1',
      redemptionId: 'redemption-1',
    });

    const recordWithClient = audit.recordWithClient as jest.Mock<
      unknown,
      [unknown, { action: string }]
    >;
    const actions = recordWithClient.mock.calls.map(
      ([, payload]) => payload.action,
    );
    expect(actions).toEqual([
      'redemption.rejected',
      'redemption.approval.reject',
    ]);
    expect(actions).not.toContain('redemption.expired');
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

function prismaService({
  transaction,
  idempotencyRecord,
}: {
  transaction: jest.Mock;
  idempotencyRecord?: {
    deleteMany?: jest.Mock;
    findUnique?: jest.Mock;
  };
}) {
  return {
    $transaction: transaction,
    idempotencyRecord: {
      deleteMany:
        idempotencyRecord?.deleteMany ??
        jest.fn().mockResolvedValue({ count: 0 }),
      findUnique:
        idempotencyRecord?.findUnique ?? jest.fn().mockResolvedValue(null),
    },
  } as never;
}

function expectedEarnHash(occurredAt = FIXED_OCCURRED_AT) {
  return createHash('sha256')
    .update(
      stableStringify({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        cardSerialNumber: 'CARD-1',
        posReceiptNumber: 'POS-REPLAY',
        purchaseAmountKobo: 1_000_000,
        occurredAt,
        deviceId: 'device-1',
        overrideReason: undefined,
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

function expiryLedgerEntryFixture() {
  const now = new Date('2026-09-10T10:00:00.000Z');

  return {
    id: 'ledger-expiry-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    receiptId: null,
    type: 'EXPIRY',
    direction: 'DEBIT',
    amountKobo: 4_500n,
    status: 'CONFIRMED',
    effectiveAt: now,
    createdAt: now,
    creditLot: {
      id: 'lot-expiry-1',
      originalAmountKobo: 4_500n,
      remainingAmountKobo: 0n,
      earnedAt: new Date('2026-08-10T10:00:00.000Z'),
      expiresAt: now,
    },
    adjustment: null,
    redemption: null,
    redemptionAllocations: [],
    allocationRestorations: [],
    customer: { branchId: 'branch-1' },
    receipt: null,
    reversesEntryId: null,
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
    allocationRestorations: [],
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
      create: jest
        .fn<
          Promise<{ id: string; posReceiptNumber: string }>,
          [{ data: unknown }]
        >()
        .mockResolvedValue({
          id: 'receipt-1',
          posReceiptNumber: 'POS-RETRY-1',
        }),
    },
    approval: {
      create: jest
        .fn<Promise<{ id: string }>, [{ data: Record<string, unknown> }]>()
        .mockResolvedValue({ id: 'approval-1' }),
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
      create: jest
        .fn<Promise<{ id: string }>, [{ data: Record<string, unknown> }]>()
        .mockResolvedValue({ id: 'outbox-1' }),
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

function adminAuthContext(): AuthContext {
  return {
    ...authContext(),
    user: {
      ...authContext().user,
      id: 'admin-1',
      role: UserRole.ADMIN,
      branchId: 'branch-2',
    },
  };
}
