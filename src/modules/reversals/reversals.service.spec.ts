import { HttpStatus } from '@nestjs/common';
import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { ReversalsService } from './reversals.service';

describe('ReversalsService', () => {
  const prismaService = {
    loyaltyLedgerEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (callback: (tx: never) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(0),
          loyaltyLedgerEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          idempotencyRecord: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        } as never),
      ),
  };

  const service = new ReversalsService(
    prismaService as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('requires an idempotency key', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', undefined, {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('requires a non-empty reason', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: '   ',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Reversal reason is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('returns transaction not found for unknown reversals', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('retries PostgreSQL serialization failures surfaced as Prisma raw-query errors', async () => {
    const serializationFailure = Object.assign(
      new Error(
        'Raw query failed. Code: `40001`. Message: `could not serialize access`',
      ),
      { code: 'P2010', meta: { code: '40001' } },
    );
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest
        .fn()
        .mockRejectedValueOnce(serializationFailure)
        .mockImplementationOnce(
          async (callback: (client: never) => Promise<unknown>) =>
            callback(tx as never),
        ),
    };
    const service = new ReversalsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: { code: 'TRANSACTION_NOT_FOUND' },
      status: HttpStatus.NOT_FOUND,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('fails closed when reversing one leg of a paired settlement', async () => {
    const original = {
      id: 'earn-1',
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      receiptId: 'receipt-1',
      type: LedgerEntryType.EARN,
      direction: LedgerEntryDirection.CREDIT,
      amountKobo: 4_000n,
      status: LedgerEntryStatus.CONFIRMED,
      customer: { branchId: 'branch-1' },
      receipt: {
        ledgerEntries: [
          { id: 'earn-1', type: LedgerEntryType.EARN },
          { id: 'redeem-1', type: LedgerEntryType.REDEEM },
        ],
      },
      redemption: null,
      creditLot: null,
      adjustment: null,
      redemptionAllocations: [],
      reversedByEntries: [],
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([]),
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(original),
        create: jest.fn(),
      },
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(
        async (callback: (client: never) => Promise<unknown>) =>
          callback(tx as never),
      ),
    };
    const service = new ReversalsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'earn-1', 'idem-paired', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: { code: 'REVERSAL_REVIEW_REQUIRED' },
    });
    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it.each(['redeem-group-1', 'earn-group-1'])(
    'reverses both settlement effects via %s with exact amounts and one grouped notification',
    async (originalId) => {
      const receiptId = 'receipt-group-1';
      const earn = {
        id: 'earn-group-1',
        tenantId: 'tenant-1',
        customerId: 'customer-1',
        receiptId,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 123n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: 'settlement:earn',
        receipt: {
          ledgerEntries: [
            {
              id: 'earn-group-1',
              type: LedgerEntryType.EARN,
              status: LedgerEntryStatus.CONFIRMED,
            },
            {
              id: 'redeem-group-1',
              type: LedgerEntryType.REDEEM,
              status: LedgerEntryStatus.CONFIRMED,
            },
          ],
        },
        customer: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          phoneE164: '+2348000000000',
        },
        creditLot: {
          id: 'earn-lot',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          earnLedgerEntryId: 'earn-group-1',
          originalAmountKobo: 123n,
          remainingAmountKobo: 123n,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
        reversedByEntries: [],
      };
      const redeem = {
        id: 'redeem-group-1',
        tenantId: 'tenant-1',
        customerId: 'customer-1',
        receiptId,
        type: LedgerEntryType.REDEEM,
        direction: LedgerEntryDirection.DEBIT,
        amountKobo: 5_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: 'settlement',
        receipt: {
          ledgerEntries: [
            {
              id: 'earn-group-1',
              type: LedgerEntryType.EARN,
              status: LedgerEntryStatus.CONFIRMED,
            },
            {
              id: 'redeem-group-1',
              type: LedgerEntryType.REDEEM,
              status: LedgerEntryStatus.CONFIRMED,
            },
          ],
        },
        customer: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          phoneE164: '+2348000000000',
        },
        redemption: {
          id: 'redemption-1',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          receiptId,
          ledgerEntryId: 'redeem-group-1',
          status: 'CONFIRMED',
          confirmedAmountKobo: 5_000n,
        },
        redemptionAllocations: [
          {
            id: 'allocation-1',
            tenantId: 'tenant-1',
            redemptionId: 'redemption-1',
            creditLotId: 'source-lot',
            amountKobo: 5_000n,
            allocationOrder: 1,
            creditLot: {
              tenantId: 'tenant-1',
              customerId: 'customer-1',
              expiresAt: new Date('2030-01-01T00:00:00.000Z'),
              originalAmountKobo: 10_000n,
              remainingAmountKobo: 5_000n,
            },
            restorations: [],
          },
        ],
        reversedByEntries: [],
      };
      const candidates = [
        {
          id: earn.id,
          type: LedgerEntryType.EARN,
          status: LedgerEntryStatus.CONFIRMED,
        },
        {
          id: redeem.id,
          type: LedgerEntryType.REDEEM,
          status: LedgerEntryStatus.CONFIRMED,
        },
      ];
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(0),
        $queryRaw: jest.fn().mockResolvedValue([]),
        loyaltyLedgerEntry: {
          findFirst: jest.fn(({ where }: { where: { id: string } }) =>
            Promise.resolve(
              where.id === earn.id
                ? earn
                : where.id === redeem.id
                  ? redeem
                  : null,
            ),
          ),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest
            .fn()
            .mockResolvedValueOnce({ id: 'earn-reversal' })
            .mockResolvedValueOnce({ id: 'redeem-reversal' }),
        },
        adjustment: {
          create: jest.fn().mockResolvedValue({ id: 'adjustment-1' }),
        },
        creditLot: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        allocationRestoration: { create: jest.fn().mockResolvedValue({}) },
        redemption: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        outboxEvent: {
          create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
        },
        smsMessage: { create: jest.fn().mockResolvedValue({ id: 'sms-1' }) },
        idempotencyRecord: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const prisma = {
        loyaltyLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue({ receiptId }),
          findMany: jest.fn().mockResolvedValue(candidates),
        },
        idempotencyRecord: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn(
          async (callback: (client: never) => Promise<unknown>) =>
            callback(tx as never),
        ),
      };
      const planRestorations = jest.fn().mockResolvedValue([
        {
          allocationId: 'allocation-1',
          creditLotId: 'source-lot',
          amountKobo: 5_000n,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      ]);
      const lotAllocationService = {
        planRestorations,
        allocateDebitFromExactLot: jest.fn().mockResolvedValue([
          {
            creditLotId: 'earn-lot',
            amountKobo: 123n,
            allocationOrder: 1,
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          },
        ]),
      };
      const auditService = {
        recordWithClient: jest.fn().mockResolvedValue(undefined),
      };
      const service = new ReversalsService(
        prisma as never,
        { getActiveBalanceKobo: jest.fn().mockResolvedValue(10_123n) } as never,
        lotAllocationService as never,
        auditService as never,
      );

      const rejectMutation = async (
        key: string,
        mutate: () => void,
        configure?: () => void,
      ) => {
        const beforeEarn = structuredClone(earn);
        const beforeRedeem = structuredClone(redeem);
        mutate();
        configure?.();
        await expect(
          service.reverse('tenant-1', actor(), originalId, `invalid-${key}`, {
            reason: 'Receipt settlement correction',
          }),
        ).rejects.toMatchObject({
          response: { code: 'REVERSAL_REVIEW_REQUIRED' },
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        });
        Object.assign(earn, beforeEarn);
        Object.assign(redeem, beforeRedeem);
        expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
        expect(tx.creditLot.updateMany).not.toHaveBeenCalled();
        expect(tx.allocationRestoration.create).not.toHaveBeenCalled();
        expect(tx.outboxEvent.create).not.toHaveBeenCalled();
        expect(tx.smsMessage.create).not.toHaveBeenCalled();
        expect(auditService.recordWithClient).not.toHaveBeenCalled();
      };
      const reviewException = () =>
        new DomainHttpException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'REVERSAL_REVIEW_REQUIRED',
          'Credit lot is expired',
        );

      await rejectMutation('consumed-earn', () => {
        earn.creditLot.remainingAmountKobo = 122n;
      });
      await rejectMutation('expired-earn', () => {
        earn.creditLot.expiresAt = new Date('2000-01-01T00:00:00.000Z');
      });
      await rejectMutation('missing-earn-lot', () => {
        Object.assign(earn, { creditLot: null });
      });
      await rejectMutation(
        'expired-redeemed-lot',
        () => {
          redeem.redemptionAllocations[0].creditLot.expiresAt = new Date(
            '2000-01-01T00:00:00.000Z',
          );
        },
        () => {
          planRestorations.mockRejectedValueOnce(reviewException());
        },
      );
      await rejectMutation('partially-restored-allocation', () => {
        Object.assign(redeem.redemptionAllocations[0], {
          restorations: [{ amountKobo: 1n }],
        });
      });
      await rejectMutation('incomplete-pair', () => {
        Object.assign(earn.receipt.ledgerEntries[1], {
          status: 'PENDING',
        });
        Object.assign(redeem.receipt.ledgerEntries[0], {
          status: 'PENDING',
        });
      });
      await rejectMutation('wrong-customer', () => {
        redeem.customerId = 'customer-other';
        redeem.redemption.customerId = 'customer-other';
      });
      await rejectMutation('wrong-tenant', () => {
        earn.customer.tenantId = 'tenant-other';
      });
      await rejectMutation('wrong-pair-correlation', () => {
        earn.correlationId = 'unpaired-earn';
      });
      await rejectMutation('partial-reversal-history', () => {
        Object.assign(earn, {
          reversedByEntries: [{ id: 'partial-reversal' }],
        });
      });

      const response = await service.reverse(
        'tenant-1',
        actor(),
        originalId,
        'group-key',
        { reason: 'Receipt settlement correction' },
      );

      expect(response).toMatchObject({
        receiptId,
        originalRedemptionTransactionId: redeem.id,
        originalEarnTransactionId: earn.id,
        redemptionReversalTransactionId: 'redeem-reversal',
        earnReversalTransactionId: 'earn-reversal',
        earnRemovedAmountKobo: 123,
        redeemedRestoredAmountKobo: 5_000,
        newActiveBalanceKobo: 10_123,
        restorations: [{ allocationId: 'allocation-1', amountKobo: 5_000 }],
      });
      expect(tx.loyaltyLedgerEntry.create).toHaveBeenCalledTimes(2);
      expect(tx.outboxEvent.create).toHaveBeenCalledTimes(2);
      expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
      expect(auditService.recordWithClient).toHaveBeenCalledTimes(1);
      expect(tx.redemption.updateMany).toHaveBeenCalledTimes(1);

      const requestHash = createHash('sha256')
        .update(
          JSON.stringify({
            tenantId: 'tenant-1',
            actorId: actor().user.id,
            transactionId: receiptId,
            reason: 'Receipt settlement correction',
          }),
        )
        .digest('hex');
      Object.assign(earn, { reversedByEntries: [{ id: 'earn-reversal' }] });
      Object.assign(redeem, { reversedByEntries: [{ id: 'redeem-reversal' }] });
      earn.creditLot.remainingAmountKobo = 0n;
      Object.assign(redeem.redemptionAllocations[0], {
        restorations: [
          {
            allocationId: 'allocation-1',
            reversalLedgerEntryId: 'redeem-reversal',
            amountKobo: 5_000n,
          },
        ],
      });
      const completedHistory = [
        {
          id: 'earn-reversal',
          reversesEntryId: earn.id,
          type: LedgerEntryType.ADJUSTMENT,
          direction: LedgerEntryDirection.DEBIT,
          amountKobo: earn.amountKobo,
          status: LedgerEntryStatus.CONFIRMED,
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          receiptId: null,
          correlationId: `${requestHash}:earn-reversal`,
          adjustment: {
            id: 'adjustment-1',
            tenantId: 'tenant-1',
            customerId: 'customer-1',
            kind: 'DEBIT',
            amountKobo: earn.amountKobo,
            ledgerEntryId: 'earn-reversal',
            allocations: [
              {
                id: 'earn-allocation',
                tenantId: 'tenant-1',
                adjustmentId: 'adjustment-1',
                redemptionLedgerEntryId: 'earn-reversal',
                creditLotId: 'earn-lot',
                amountKobo: earn.amountKobo,
                allocationOrder: 1,
              },
            ],
          },
          allocationRestorations: [],
        },
        {
          id: 'redeem-reversal',
          reversesEntryId: redeem.id,
          type: LedgerEntryType.REVERSAL,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: redeem.amountKobo,
          status: LedgerEntryStatus.CONFIRMED,
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          receiptId: null,
          correlationId: `${requestHash}:redeem-reversal`,
          adjustment: null,
          redemptionAllocations: [],
          allocationRestorations: [
            { allocationId: 'allocation-1', amountKobo: 5_000n },
          ],
        },
      ];
      tx.loyaltyLedgerEntry.findMany.mockResolvedValue(completedHistory);
      const storedIdempotencyRecord = {
        requestHash,
        responseJson: response,
      };
      tx.idempotencyRecord.findUnique.mockResolvedValue(
        storedIdempotencyRecord,
      );
      prisma.idempotencyRecord.findUnique.mockResolvedValue(
        storedIdempotencyRecord,
      );
      redeem.redemption.status = 'REVERSED';
      const replay = await service.reverse(
        'tenant-1',
        actor(),
        originalId === earn.id ? redeem.id : earn.id,
        'group-key',
        { reason: 'Receipt settlement correction' },
      );
      expect(replay).toEqual(response);
      await expect(
        service.reverse(
          'tenant-1',
          actor(),
          originalId === earn.id ? redeem.id : earn.id,
          'group-key',
          { reason: 'Different grouped reason' },
        ),
      ).rejects.toMatchObject({
        response: { code: 'IDEMPOTENCY_CONFLICT' },
        status: HttpStatus.CONFLICT,
      });
      prisma.loyaltyLedgerEntry.findMany.mockResolvedValueOnce([
        { id: earn.id, type: LedgerEntryType.EARN },
      ]);
      await expect(
        service.reverse('tenant-1', actor(), originalId, 'group-key', {
          reason: 'Receipt settlement correction',
        }),
      ).rejects.toMatchObject({
        response: { code: 'REVERSAL_REVIEW_REQUIRED' },
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
      prisma.loyaltyLedgerEntry.findMany.mockResolvedValue(candidates);

      const corruptedResponseRecord = {
        ...storedIdempotencyRecord,
        responseJson: {
          ...response,
          earnReversalTransactionId: 'wrong-earn-reversal',
        },
      };
      tx.idempotencyRecord.findUnique.mockResolvedValue(
        corruptedResponseRecord,
      );
      prisma.idempotencyRecord.findUnique.mockResolvedValue(
        corruptedResponseRecord,
      );
      await expect(
        service.reverse(
          'tenant-1',
          actor(),
          originalId === earn.id ? redeem.id : earn.id,
          'group-key',
          { reason: 'Receipt settlement correction' },
        ),
      ).rejects.toMatchObject({
        response: { code: 'REVERSAL_REVIEW_REQUIRED' },
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
      tx.idempotencyRecord.findUnique.mockResolvedValue(
        storedIdempotencyRecord,
      );
      prisma.idempotencyRecord.findUnique.mockResolvedValue(
        storedIdempotencyRecord,
      );

      const validHistory = structuredClone(completedHistory);
      const corruptions: Array<(history: typeof completedHistory) => void> = [
        (history) => {
          history[0].adjustment = null;
        },
        (history) => {
          history[0].customerId = 'wrong-customer';
        },
        (history) => {
          Object.assign(history[1], { receiptId: 'wrong-receipt' });
        },
        (history) => {
          history[1].correlationId = 'unpaired-correlation';
        },
        (history) => {
          history[0].adjustment!.allocations[0].creditLotId = 'wrong-lot';
        },
        (history) => {
          history[0].adjustment!.allocations[0].redemptionLedgerEntryId =
            'wrong-reversal';
        },
        (history) => {
          history[1].allocationRestorations = [];
        },
        (history) => {
          history[1].allocationRestorations[0].amountKobo = 4_999n;
        },
        (history) => {
          history.splice(1, 1);
        },
      ];
      for (const corrupt of corruptions) {
        const invalidHistory = structuredClone(validHistory);
        corrupt(invalidHistory);
        tx.loyaltyLedgerEntry.findMany.mockResolvedValue(invalidHistory);
        await expect(
          service.reverse(
            'tenant-1',
            actor(),
            originalId === earn.id ? redeem.id : earn.id,
            'group-key',
            { reason: 'Receipt settlement correction' },
          ),
        ).rejects.toMatchObject({
          response: { code: 'REVERSAL_REVIEW_REQUIRED' },
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      }

      const missingHistory = structuredClone(validHistory);
      Object.assign(earn, { reversedByEntries: [] });
      Object.assign(redeem, { reversedByEntries: [] });
      redeem.redemption.status = 'CONFIRMED';
      tx.loyaltyLedgerEntry.findMany.mockResolvedValue([]);
      await expect(
        service.reverse(
          'tenant-1',
          actor(),
          originalId === earn.id ? redeem.id : earn.id,
          'group-key',
          { reason: 'Receipt settlement correction' },
        ),
      ).rejects.toMatchObject({
        response: { code: 'REVERSAL_REVIEW_REQUIRED' },
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
      Object.assign(earn, { reversedByEntries: [{ id: 'earn-reversal' }] });
      Object.assign(redeem, { reversedByEntries: [{ id: 'redeem-reversal' }] });
      redeem.redemption.status = 'REVERSED';
      tx.loyaltyLedgerEntry.findMany.mockResolvedValue(missingHistory);

      expect(tx.loyaltyLedgerEntry.create).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(23);
    },
  );

  it('returns a specific conflict for transactions that already have reversals', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'earn-1',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          receiptId: 'receipt-1',
          type: LedgerEntryType.EARN,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 4_000n,
          status: LedgerEntryStatus.CONFIRMED,
          customer: { branchId: 'branch-1' },
          creditLot: null,
          redemption: null,
          adjustment: null,
          redemptionAllocations: [],
          reversedByEntries: [{ id: 'reversal-1' }],
        }),
      },
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (tx: never) => Promise<unknown>) =>
          callback(tx as never),
        ),
    };
    const service = new ReversalsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'earn-1', 'idem-reversed', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TRANSACTION_ALREADY_REVERSED',
        message: 'Transaction already has a reversal',
      },
      status: HttpStatus.CONFLICT,
    });
  });

  it('replays an existing reversal response for the same idempotency key', async () => {
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: 'tenant-1',
          actorId: 'user-1',
          transactionId: 'transaction-1',
          reason: 'Customer refund',
        }),
      )
      .digest('hex');
    const prisma = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          requestHash,
          responseJson: { id: 'reversal-1' },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new ReversalsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).resolves.toEqual({ id: 'reversal-1' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects conflicting reversal payload reuse for the same idempotency key', async () => {
    const prisma = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          requestHash: 'hash-1',
          responseJson: null,
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new ReversalsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Different reason',
      }),
    ).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_CONFLICT' },
      status: HttpStatus.CONFLICT,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reverses an unused earn transaction with compensating ledger evidence', async () => {
    const lotAllocationService = {
      allocateDebitFromExactLot: jest.fn().mockResolvedValue([
        {
          creditLotId: 'lot-1',
          amountKobo: 4_000n,
          allocationOrder: 1,
          expiresAt: new Date('2026-09-04T00:00:00.000Z'),
        },
      ]),
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'earn-1',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          receiptId: 'receipt-1',
          type: LedgerEntryType.EARN,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 4_000n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: 'earn-correlation',
          createdByTenantId: 'tenant-1',
          createdBy: 'user-1',
          effectiveAt: new Date('2026-08-04T00:00:00.000Z'),
          customer: {
            branchId: 'branch-1',
            phoneE164: '+2348000000000',
          },
          receipt: {
            id: 'receipt-1',
          },
          creditLot: {
            id: 'lot-1',
            originalAmountKobo: 4_000n,
            remainingAmountKobo: 4_000n,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          redemption: null,
          adjustment: null,
          redemptionAllocations: [],
          reversedByEntries: [],
        }),
        create: jest.fn().mockResolvedValue({ id: 'reversal-1' }),
      },
      adjustment: {
        create: jest.fn().mockResolvedValue({ id: 'reversal-adjustment-1' }),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      smsMessage: {
        create: jest.fn().mockResolvedValue({ id: 'sms-1' }),
      },
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prismaService = {
      loyaltyLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (tx: never) => Promise<unknown>) =>
          callback(tx as never),
        ),
    };
    const activeBalanceService = {
      getActiveBalanceKobo: jest.fn().mockResolvedValue(0n),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReversalsService(
      prismaService as never,
      activeBalanceService as never,
      lotAllocationService as never,
      auditService as never,
    );

    await expect(
      service.reverse('tenant-1', actor(), 'earn-1', 'idem-success', {
        reason: 'Customer refund',
      }),
    ).resolves.toMatchObject({
      id: 'reversal-1',
      transactionId: 'reversal-1',
      originalTransactionId: 'earn-1',
      reversedAmountKobo: 4_000,
      newActiveBalanceKobo: 0,
      smsStatus: 'QUEUED',
    });

    const ledgerEntryCreate = tx.loyaltyLedgerEntry.create as jest.Mock<
      unknown,
      [
        {
          data: {
            type: LedgerEntryType;
            direction: LedgerEntryDirection;
            reversesEntryId: string;
          };
        },
      ]
    >;
    const ledgerEntryCreateArg = ledgerEntryCreate.mock.calls[0]?.[0];
    expect(ledgerEntryCreateArg.data).toMatchObject({
      type: LedgerEntryType.ADJUSTMENT,
      direction: LedgerEntryDirection.DEBIT,
      reversesEntryId: 'earn-1',
    });

    const adjustmentCreate = tx.adjustment.create as jest.Mock<
      unknown,
      [{ data: { kind: string; ledgerEntryId: string } }]
    >;
    const adjustmentCreateArg = adjustmentCreate.mock.calls[0]?.[0];
    expect(adjustmentCreateArg.data).toMatchObject({
      kind: 'DEBIT',
      ledgerEntryId: 'reversal-1',
    });
    expect(lotAllocationService.allocateDebitFromExactLot).toHaveBeenCalledWith(
      tx as never,
      expect.objectContaining({
        creditLotId: 'lot-1',
        debitLedgerEntryId: 'reversal-1',
        adjustmentId: 'reversal-adjustment-1',
      }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx as never,
      expect.objectContaining({ action: 'transaction.reversed' }),
    );
    expect(tx.idempotencyRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyRecord.update).toHaveBeenCalledTimes(1);
  });
});

function actor(): AuthContext {
  return {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      branchId: null,
      username: 'supervisor-1',
      supabaseAuthId: null,
      role: UserRole.SUPERVISOR,
      status: UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    },
    session: {
      id: 'session-1',
      userId: 'user-1',
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
