import { HttpStatus } from '@nestjs/common';
import { CustomerStatus, SessionStatus, UserRole, UserStatus } from '@prisma/client';
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
      service.createAdjustment('tenant-1', actor(UserRole.ADMIN), 'idem-credit', {
        customerId: 'customer-1',
        kind: 'CREDIT',
        amountKobo: 2_500,
        reason: 'Service recovery',
        effectiveAt: '2026-07-26T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      kind: 'CREDIT',
      amountKobo: 2_500,
      creditLot: { id: 'lot-1' },
      smsStatus: 'QUEUED',
    });

    expect(tx.creditLot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: new Date('2027-07-26T12:00:00.000Z'),
      }),
    });

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
      service.createAdjustment('tenant-1', actor(UserRole.ADMIN), 'idem-debit', {
        customerId: 'customer-1',
        kind: 'DEBIT',
        amountKobo: 2_000,
        reason: 'Manual correction',
      }),
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
      service.createAdjustment('tenant-1', actor(UserRole.ADMIN), 'idem-ceiling', {
        customerId: 'customer-1',
        kind: 'CREDIT',
        amountKobo: 1_001,
        reason: 'Service recovery',
      }),
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
}) {
  const tx = transactionClient();
  const transaction =
    options?.transaction ?? jest.fn((callback: (client: typeof tx) => unknown) => callback(tx));

  return new AdjustmentsService(
    {
      $transaction: transaction,
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    } as never,
    {
      getActiveBalanceKobo: jest.fn().mockResolvedValue(options?.activeBalanceKobo ?? 20_000n),
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
          ADJUSTMENT_AMOUNT_CEILING_KOBO: options?.config?.ADJUSTMENT_AMOUNT_CEILING_KOBO ?? 100_000_000,
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
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function actor(role: UserRole): AuthContext {
  const now = new Date('2026-07-26T12:00:00.000Z');

  return {
    session: {
      id: 'session-1',
      userId: 'user-1',
      deviceId: 'device-1',
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
