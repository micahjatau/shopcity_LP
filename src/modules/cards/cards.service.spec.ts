import { BadRequestException } from '@nestjs/common';
import { CardStatus, CustomerStatus } from '@prisma/client';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  it('rejects status updates for replaced cards', async () => {
    const prisma = {
      card: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'card-id',
          tenantId: 'tenant-id',
          customerId: 'customer-id',
          status: CardStatus.REPLACED,
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
        update: jest.fn().mockResolvedValue({
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
        }),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
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

    expect(tx.card.update).toHaveBeenCalledWith({
      where: { id: 'card-id' },
      data: {
        status: CardStatus.BLOCKED,
        blockedAt: expect.any(Date),
      },
    });
    expect(auditService.recordWithClient).toHaveBeenCalledWith(tx, {
      tenantId: 'tenant-id',
      actorId: 'user-id',
      action: 'card.status',
      entityType: 'card',
      entityId: 'card-id',
      metadata: { status: 'BLOCKED' },
    });
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
