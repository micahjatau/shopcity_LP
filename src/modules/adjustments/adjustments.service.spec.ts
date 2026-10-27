import { HttpStatus } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CustomerStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { AdjustmentsService } from './adjustments.service';

describe('AdjustmentsService', () => {
  it('rejects non-admin callers', async () => {
    const service = createService();

    await expect(
      service.createAdjustment('tenant-1', actor(UserRole.CASHIER), 'idem-1', {
        customerId: 'customer-1',
        kind: 'CREDIT',
        amountKobo: 1_000,
        reason: 'Service recovery',
        effectiveAt: '2026-07-26T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'ADJUSTMENT_FORBIDDEN',
      },
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('rejects invalid amount and reason payloads', async () => {
    const service = createService();

    await expect(
      service.createAdjustment('tenant-1', actor(UserRole.ADMIN), 'idem-1', {
        customerId: 'customer-1',
        kind: 'CREDIT',
        amountKobo: 0,
        reason: 'Service recovery',
        effectiveAt: '2026-07-26T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });

    await expect(
      service.createAdjustment('tenant-1', actor(UserRole.ADMIN), 'idem-2', {
        customerId: 'customer-1',
        kind: 'DEBIT',
        amountKobo: 1_000,
        reason: '   ',
        effectiveAt: '2026-07-26T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
  });

  it('creates credit adjustments with a new expiring lot', async () => {
    const tx = transactionClient();
    const service = createService({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      activeBalanceKobo: 17_000n,
    });

    await expect(
      service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-credit',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 2_500,
          reason: 'Service recovery',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        },
      ),
    ).resolves.toMatchObject({
      kind: 'CREDIT',
      amountKobo: 2_500,
      creditLot: { id: 'lot-1' },
      smsStatus: 'QUEUED',
    });

    const creditLotCreate = tx.creditLot.create as jest.Mock<
      unknown,
      [{ data: { expiresAt: Date } }]
    >;
    const creditLotCreateArg = creditLotCreate.mock.calls[0]?.[0];
    expect(creditLotCreateArg.data.expiresAt).toEqual(
      new Date('2027-07-26T12:00:00.000Z'),
    );

    expect(tx.loyaltyLedgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.adjustment.create).toHaveBeenCalledTimes(1);
    expect(tx.creditLot.create).toHaveBeenCalledTimes(1);
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });

  it('creates debit adjustments using FIFO allocations', async () => {
    const tx = transactionClient();
    const lotAllocationService = {
      allocateDebit: jest.fn().mockResolvedValue([
        {
          creditLotId: 'lot-1',
          amountKobo: 2_000n,
          allocationOrder: 1,
          expiresAt: new Date('2026-08-26T12:00:00.000Z'),
        },
      ]),
    };
    const service = createService({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      lotAllocationService,
      activeBalanceKobo: 15_000n,
    });

    await expect(
      service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-debit',
        {
          customerId: 'customer-1',
          kind: 'DEBIT',
          amountKobo: 2_000,
          reason: 'Manual correction',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        },
      ),
    ).resolves.toMatchObject({
      kind: 'DEBIT',
      amountKobo: 2_000,
      allocations: [
        {
          creditLotId: 'lot-1',
          amountKobo: 2_000,
          allocationOrder: 1,
        },
      ],
      smsStatus: 'QUEUED',
    });

    expect(lotAllocationService.allocateDebit).toHaveBeenCalledTimes(1);
    expect(tx.adjustment.create).toHaveBeenCalledTimes(1);
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.smsMessage.create).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });

  it('replays a completed matching idempotency record without financial writes', async () => {
    const tx = transactionClient();
    const storedResponse = {
      id: 'adjustment-original',
      transactionId: 'ledger-original',
      adjustmentId: 'adjustment-original',
      customerId: 'customer-1',
      kind: 'CREDIT',
      amountKobo: 1_000,
      newActiveBalanceKobo: 21_000,
      allocations: [],
      creditLot: null,
      smsStatus: 'QUEUED',
      occurredAt: '2026-07-26T12:00:00.000Z',
    };
    const idempotencyRecord = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue({
        requestHash: adjustmentRequestHash({
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_000,
          reason: 'Service recovery',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        }),
        responseJson: storedResponse,
      }),
      create: jest.fn(),
    };
    const service = createService({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      idempotencyRecord,
    });

    await expect(
      service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-replay',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_000,
          reason: 'Service recovery',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        },
      ),
    ).resolves.toEqual(storedResponse);

    expect(tx.loyaltyLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.adjustment.create).not.toHaveBeenCalled();
    expect(tx.creditLot.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
    expect(idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a changed payload for a matching idempotency key', async () => {
    const transaction = jest.fn();
    const idempotencyRecord = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue({
        requestHash: 'previous-request-hash',
        responseJson: { id: 'adjustment-original' },
      }),
      create: jest.fn(),
    };
    const service = createService({ transaction, idempotencyRecord });

    await expect(
      service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-conflict',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_001,
          reason: 'Service recovery',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        },
      ),
    ).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_CONFLICT' },
      status: HttpStatus.CONFLICT,
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it('expires completed idempotency records at the seven-day boundary', async () => {
    const startedAt = new Date('2026-07-26T12:00:00.000Z');
    const expiresAt = new Date('2026-08-02T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(startedAt);
    const idempotencyRecord = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    };
    const tx = transactionClient();
    const service = createService({
      transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      idempotencyRecord,
    });

    try {
      await service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-expiry',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_000,
          reason: 'Service recovery',
          effectiveAt: startedAt.toISOString(),
        },
      );

      const updateData = tx.idempotencyRecord.update.mock.calls[0]?.[0].data;
      expect(updateData?.expiresAt).toEqual(expiresAt);
      expect(idempotencyRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          actorId: 'user-1',
          idempotencyKey: 'idem-expiry',
          expiresAt: { lte: startedAt },
        },
      });

      jest.setSystemTime(expiresAt);
      await service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-expiry',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_000,
          reason: 'Service recovery',
          effectiveAt: startedAt.toISOString(),
        },
      );

      expect(idempotencyRecord.deleteMany).toHaveBeenLastCalledWith({
        where: {
          tenantId: 'tenant-1',
          actorId: 'user-1',
          idempotencyKey: 'idem-expiry',
          expiresAt: { lte: expiresAt },
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects adjustments above the configured ceiling before writing', async () => {
    const transaction = jest.fn();
    const service = createService({
      transaction,
      config: {
        ADJUSTMENT_AMOUNT_CEILING_KOBO: 1_000,
        ADJUSTMENT_CREDIT_EXPIRY_MONTHS: 12,
      },
    });

    await expect(
      service.createAdjustment(
        'tenant-1',
        actor(UserRole.ADMIN),
        'idem-ceiling',
        {
          customerId: 'customer-1',
          kind: 'CREDIT',
          amountKobo: 1_001,
          reason: 'Service recovery',
          effectiveAt: '2026-07-26T12:00:00.000Z',
        },
      ),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });

    expect(transaction).not.toHaveBeenCalled();
  });
});

function createService(options?: {
  transaction?: jest.Mock;
  activeBalanceKobo?: bigint;
  lotAllocationService?: { allocateDebit: jest.Mock };
  config?: Record<string, number>;
  idempotencyRecord?: {
    deleteMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
}) {
  const tx = transactionClient();
  const transaction =
    options?.transaction ??
    jest.fn((callback: (client: typeof tx) => unknown) => callback(tx));

  return new AdjustmentsService(
    {
      $transaction: transaction,
      idempotencyRecord: options?.idempotencyRecord ?? {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    } as never,
    {
      getActiveBalanceKobo: jest
        .fn()
        .mockResolvedValue(options?.activeBalanceKobo ?? 20_000n),
    } as never,
    (options?.lotAllocationService ??
      ({ allocateDebit: jest.fn().mockResolvedValue([]) } as never)) as never,
    {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    } as never,
    {
      get: (key: string) =>
        ({
          ADJUSTMENT_CREDIT_EXPIRY_MONTHS: 12,
          ADJUSTMENT_AMOUNT_CEILING_KOBO:
            options?.config?.ADJUSTMENT_AMOUNT_CEILING_KOBO ?? 100_000_000,
        })[key],
    } as never,
  );
}

function transactionClient() {
  return {
    customer: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'customer-1',
        tenantId: 'tenant-1',
        phoneE164: '+2348000000000',
        status: CustomerStatus.ACTIVE,
        isStaff: false,
      }),
    },
    loyaltyLedgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    adjustment: {
      create: jest.fn().mockResolvedValue({ id: 'adjustment-1' }),
    },
    creditLot: {
      create: jest.fn().mockResolvedValue({
        id: 'lot-1',
        expiresAt: new Date('2027-07-26T12:00:00.000Z'),
      }),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
    smsMessage: {
      create: jest.fn().mockResolvedValue({ id: 'sms-1' }),
    },
    idempotencyRecord: {
      create: jest.fn().mockResolvedValue({}),
      update: jest
        .fn<Promise<unknown>, [{ where: unknown; data: { expiresAt: Date } }]>()
        .mockResolvedValue({}),
    },
  };
}

function adjustmentRequestHash(input: {
  customerId: string;
  kind: 'CREDIT' | 'DEBIT';
  amountKobo: number;
  reason: string;
  effectiveAt: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        ...input,
      }),
    )
    .digest('hex');
}

function actor(role: UserRole): AuthContext {
  const now = new Date('2026-07-26T12:00:00.000Z');

  return {
    session: {
      id: 'session-1',
      userId: 'user-1',
      deviceId: 'device-1',
      deviceCredentialId: null,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: SessionStatus.ACTIVE,
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
      username: 'admin@example.test',
      role,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      supabaseAuthId: null,
      tenant: null,
      branch: null,
    },
  };
}
