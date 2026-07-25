import { Prisma, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { LoyaltyService } from './loyalty.service';

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

function prismaService({ transaction }: { transaction: jest.Mock }) {
  return {
    $transaction: transaction,
    idempotencyRecord: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    creditLot: {
      findMany: jest.fn().mockResolvedValue([{ remainingAmountKobo: 20_000n }]),
    },
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
