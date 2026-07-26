import { BadRequestException, ConflictException } from '@nestjs/common';
import { CardStatus, CustomerStatus } from '@prisma/client';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  it('returns card lookup without nested customer PII', async () => {
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          barcodeValue: 'CARD-1',
          status: CardStatus.ACTIVE,
          customer: {
            id: 'customer-id',
            fullName: 'Ada Customer',
            phoneE164: '+2348012345678',
            email: 'customer@example.com',
            status: CustomerStatus.ACTIVE,
            creditLots: [{ remainingAmountKobo: BigInt(2_500) }],
          },
        }),
      },
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(service.lookupCard('tenant-id', 'CARD-1')).resolves.toEqual({
      id: 'card-id',
      tenantId: 'tenant-id',
      customerId: 'customer-id',
      status: CardStatus.ACTIVE,
      serialNumber: 'CARD-1',
      customer: {
        customerId: 'customer-id',
        fullName: 'Ada Customer',
        maskedPhone: '+234801* *** 5678',
        cardStatus: CardStatus.ACTIVE,
        availableBalanceKobo: 2_500,
      },
    });
  });

  it('rejects status updates for replaced cards', async () => {
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.REPLACED,
          customer: { status: CustomerStatus.ACTIVE },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(
      service.updateStatus('tenant-id', actorStub(), 'card-id', 'ACTIVE'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows blocking an active card and records the audit event', async () => {
    const tx = {
      card: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.BLOCKED,
          blockedAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
      },
    };
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.ACTIVE,
          customer: { status: CustomerStatus.ACTIVE },
        }),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const auditService = auditStub();
    const service = new CardsService(prisma as never, auditService as never);

    await expect(
      service.updateStatus('tenant-id', actorStub(), 'card-id', 'BLOCKED'),
    ).resolves.toMatchObject({
      id: 'card-id',
      status: CardStatus.BLOCKED,
    });

    const updateManyCalls = tx.card.updateMany.mock.calls as Array<
      [
        {
          where: { id: string; tenantId: string; status: CardStatus };
          data: { status: CardStatus; blockedAt: Date };
        },
      ]
    >;
    const updateManyCall = updateManyCalls[0][0];

    expect(updateManyCall.where).toEqual({
      id: 'card-id',
      tenantId: 'tenant-id',
      status: CardStatus.ACTIVE,
    });
    expect(updateManyCall.data.status).toBe(CardStatus.BLOCKED);
    expect(updateManyCall.data.blockedAt).toBeInstanceOf(Date);
    expect(auditService.recordWithClient).toHaveBeenCalledWith(tx, {
      tenantId: 'tenant-id',
      actorId: 'user-id',
      action: 'card.status',
      entityType: 'card',
      entityId: 'card-id',
      metadata: { status: 'BLOCKED' },
    });
  });

  it('requires the customer to be active before reactivating a blocked card', async () => {
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.BLOCKED,
          customer: { status: CustomerStatus.BLOCKED },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(
      service.updateStatus('tenant-id', actorStub(), 'card-id', 'ACTIVE'),
    ).rejects.toThrow('Customer is not active');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails when a stale card state loses a race inside the transaction', async () => {
    const tx = {
      card: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
    };
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.ACTIVE,
          customer: { status: CustomerStatus.ACTIVE },
        }),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(
      service.updateStatus('tenant-id', actorStub(), 'card-id', 'BLOCKED'),
    ).rejects.toThrow(ConflictException);
  });
});

function auditStub() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  };
}

function actorStub() {
  return {
    user: {
      id: 'user-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      username: 'admin@shopcity.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    session: {
      id: 'session-id',
      expiresAt: new Date('2026-07-19T00:00:00.000Z'),
    },
  } as never;
}
