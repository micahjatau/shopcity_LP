import { createHash } from 'node:crypto';
import { CardStatus, UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  it('creates the customer and initial card in one idempotent transaction', async () => {
    const customer = customerRecord({ id: 'created-customer' });
    const card = {
      id: 'created-card',
      barcodeValue: 'CARD-001',
      status: CardStatus.ACTIVE,
    };
    const cardCreate = jest.fn().mockResolvedValue(card);
    const idempotencyUpdate = jest.fn().mockResolvedValue(undefined);
    const prisma: any = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: idempotencyUpdate,
      },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(customer),
      },
      card: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: cardCreate,
      },
      $transaction: jest.fn((callback: (client: unknown) => unknown): unknown =>
        callback(prisma),
      ),
    };
    const auditService = auditStub();
    const service = new CustomersService(
      prisma as never,
      auditService as never,
      activeBalanceStub() as never,
    );

    await expect(
      service.createCustomer(
        'tenant-id',
        actorStub(UserRole.SUPERVISOR),
        {
          fullName: 'Ada Customer',
          phone: '+2348012345678',
          cardSerialNumber: ' card-001 ',
        },
        'onboarding-001',
      ),
    ).resolves.toMatchObject({
      id: 'created-customer',
      card: { id: 'created-card', serialNumber: 'CARD-001' },
    });

    expect(cardCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'created-customer',
        barcodeValue: 'CARD-001',
      }) as Record<string, unknown>,
      select: { id: true, barcodeValue: true, status: true },
    });
    expect(idempotencyUpdate).toHaveBeenCalledTimes(1);
    expect(auditService.recordWithClient).toHaveBeenCalledTimes(2);
  });

  it('does not complete idempotency when initial card creation fails', async () => {
    const idempotencyUpdate = jest.fn().mockResolvedValue(undefined);
    const prisma: any = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: idempotencyUpdate,
      },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(customerRecord()),
      },
      card: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('card write failed')),
      },
      $transaction: jest.fn((callback: (client: unknown) => unknown): unknown =>
        callback(prisma),
      ),
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );

    await expect(
      service.createCustomer(
        'tenant-id',
        actorStub(UserRole.SUPERVISOR),
        {
          fullName: 'Ada Customer',
          phone: '+2348012345678',
          cardSerialNumber: 'CARD-001',
        },
        'onboarding-002',
      ),
    ).rejects.toThrow('card write failed');
    expect(idempotencyUpdate).not.toHaveBeenCalled();
  });

  it('replays a completed onboarding request without creating another card', async () => {
    const response = {
      id: 'created-customer',
      card: {
        id: 'created-card',
        serialNumber: 'CARD-001',
        status: CardStatus.ACTIVE,
      },
    };
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: 'tenant-id',
          actorId: 'user-id',
          fullName: 'Ada Customer',
          phone: '+2348012345678',
          cardSerialNumber: 'CARD-001',
        }),
      )
      .digest('hex');
    const prisma = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findUnique: jest
          .fn()
          .mockResolvedValue({ requestHash, responseJson: response }),
      },
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );

    await expect(
      service.createCustomer(
        'tenant-id',
        actorStub(UserRole.SUPERVISOR),
        {
          fullName: 'Ada Customer',
          phone: '+2348012345678',
          cardSerialNumber: 'CARD-001',
        },
        'onboarding-001',
      ),
    ).resolves.toEqual(response);
  });

  it('returns minimized cashier customer summaries', async () => {
    const prisma = {
      customer: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            customerRecord({ email: 'customer@example.com' }),
          ]),
      },
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub({ batch: new Map([['customer-id', 1_500n]]) }) as never,
    );

    await expect(
      service.listCustomers('tenant-id', actorStub(UserRole.CASHIER)),
    ).resolves.toEqual({
      items: [
        {
          customerId: 'customer-id',
          fullName: 'Ada Customer',
          maskedPhone: '+234801* *** 5678',
          cardStatus: CardStatus.ACTIVE,
          availableBalanceKobo: 1_500,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('finds locally entered Nigerian phone numbers against normalized E.164 records', async () => {
    const findMany = jest.fn().mockResolvedValue([customerRecord()]);
    const prisma = { customer: { findMany } };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );

    await service.listCustomers(
      'tenant-id',
      actorStub(UserRole.CASHIER),
      '08012345678',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-id',
          OR: expect.arrayContaining([
            { phoneE164: { contains: '+2348012345678' } },
          ]),
        }),
      }),
    );
  });
  it('audits privileged full customer reads', async () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(customerRecord()),
      },
    };
    const auditService = auditStub();
    const service = new CustomersService(
      prisma as never,
      auditService as never,
      activeBalanceStub({ single: 1_500n }) as never,
    );

    const result = await service.getCustomer(
      'tenant-id',
      'customer-id',
      actorStub(UserRole.SUPERVISOR),
    );

    expect(result).toMatchObject({
      id: 'customer-id',
      phoneE164: '+2348012345678',
      email: 'customer@example.com',
      availableBalanceKobo: 1_500,
    });
    expect(result).not.toHaveProperty('creditLots');
    expect(auditService.record).toHaveBeenCalledWith({
      tenantId: 'tenant-id',
      actorId: 'user-id',
      action: 'customer.pii.read',
      entityType: 'customer',
      entityId: 'customer-id',
    });
  });
});

function customerRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'customer-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    fullName: 'Ada Customer',
    phoneE164: '+2348012345678',
    email: 'customer@example.com',
    isStaff: false,
    status: 'ACTIVE',
    registeredBy: 'registrar-id',
    registeredByTenantId: 'tenant-id',
    blockedAt: null,
    cards: [{ status: CardStatus.ACTIVE }],
    creditLots: [{ remainingAmountKobo: BigInt(1_500) }],
    ...overrides,
  };
}

function auditStub() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
    recordWithClient: jest.fn().mockResolvedValue(undefined),
  };
}

function activeBalanceStub({
  single = 0n,
  batch = new Map<string, bigint>(),
}: {
  single?: bigint;
  batch?: Map<string, bigint>;
} = {}) {
  return {
    getActiveBalanceKobo: jest.fn().mockResolvedValue(single),
    getActiveBalancesKobo: jest.fn().mockResolvedValue(batch),
  };
}

function actorStub(role: UserRole) {
  return {
    user: {
      id: 'user-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      role,
    },
    session: { id: 'session-id' },
  } as never;
}
