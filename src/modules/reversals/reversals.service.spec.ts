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
import { ReversalsService } from './reversals.service';

describe('ReversalsService', () => {
  const prismaService = {
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(
      async (callback: (tx: never) => Promise<unknown>) =>
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
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          requestHash,
          responseJson: { id: 'reversal-1' },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new ReversalsService(prisma as never, {} as never, {} as never, {} as never);

    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).resolves.toEqual({ id: 'reversal-1' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects conflicting reversal payload reuse for the same idempotency key', async () => {
    const prisma = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          requestHash: 'hash-1',
          responseJson: null,
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new ReversalsService(prisma as never, {} as never, {} as never, {} as never);

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
      allocateDebit: jest.fn().mockResolvedValue([
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
            expiresAt: new Date('2026-09-04T00:00:00.000Z'),
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
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: never) => Promise<unknown>) =>
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

    expect(tx.loyaltyLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.DEBIT,
        reversesEntryId: 'earn-1',
      }),
    });
    expect(tx.adjustment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: 'DEBIT',
        ledgerEntryId: 'reversal-1',
      }),
    });
    expect(lotAllocationService.allocateDebit).toHaveBeenCalledWith(
      tx as never,
      expect.objectContaining({
        debitLedgerEntryId: 'reversal-1',
        adjustmentId: 'reversal-adjustment-1',
      }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx as never,
      expect.objectContaining({ action: 'transaction.reversed' }),
    );
    expect(tx.idempotencyRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyRecord.update).toHaveBeenCalledTimes(1);
  });
});

function actor() {
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
