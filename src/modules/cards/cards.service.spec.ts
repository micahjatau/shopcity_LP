import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CardStatus, CustomerStatus } from '@prisma/client';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  it('requires an idempotency key for card creation', async () => {
    const service = new CardsService({} as never, auditStub() as never);

    await expect(
      service.createCard(
        'tenant-id',
        actorStub(),
        { customerId: 'customer-id', serialNumber: 'CARD-1' },
        undefined,
      ),
    ).rejects.toThrow('Idempotency-Key header is required');
  });

  it('requires an idempotency key for card replacement and status changes', async () => {
    const service = new CardsService({} as never, auditStub() as never);

    await expect(
      service.replaceCard(
        'tenant-id',
        actorStub(),
        'card-id',
        { serialNumber: 'CARD-2' },
        undefined,
      ),
    ).rejects.toThrow('Idempotency-Key header is required');
    await expect(
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'BLOCKED',
        undefined,
      ),
    ).rejects.toThrow('Idempotency-Key header is required');
  });

  it('replays a completed card status mutation without touching the card', async () => {
    const prisma = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue({
          requestHash: createHash('sha256')
            .update(
              JSON.stringify({
                tenantId: 'tenant-id',
                actorId: 'user-id',
                cardId: 'card-id',
                status: 'BLOCKED',
              }),
            )
            .digest('hex'),
          responseJson: { id: 'card-id', status: CardStatus.BLOCKED },
        }),
      },
      card: { findFirst: jest.fn() },
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'BLOCKED',
        'status-key',
      ),
    ).resolves.toEqual({ id: 'card-id', status: CardStatus.BLOCKED });
    expect(prisma.card.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a changed payload for a reused card mutation key', async () => {
    const prisma = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue({
          requestHash: 'different-request-hash',
          responseJson: null,
        }),
      },
    };
    const service = new CardsService(prisma as never, auditStub() as never);

    await expect(
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'BLOCKED',
        'status-key',
      ),
    ).rejects.toHaveProperty('response.code', 'IDEMPOTENCY_CONFLICT');
  });

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
            isStaff: false,
            status: CustomerStatus.ACTIVE,
          },
        }),
      },
    };
    const service = new CardsService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub(2_500n) as never,
    );

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
        isStaff: false,
        earningEligible: true,
        eligibilityReason: null,
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
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'ACTIVE',
        'status-key',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows blocking an active card and records the audit event', async () => {
    const tx = {
      idempotencyRecord: {
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
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
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'BLOCKED',
        'status-key',
      ),
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
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'ACTIVE',
        'status-key',
      ),
    ).rejects.toThrow('Customer is not active');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails when a stale card state loses a race inside the transaction', async () => {
    const tx = {
      idempotencyRecord: {
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
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
      service.updateStatus(
        'tenant-id',
        actorStub(),
        'card-id',
        'BLOCKED',
        'status-key',
      ),
    ).rejects.toThrow(ConflictException);
  });
});

function auditStub() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  };
}

function activeBalanceStub(balance: bigint) {
  return {
    getActiveBalanceKobo: jest.fn().mockResolvedValue(balance),
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
