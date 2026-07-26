import { CardStatus, UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
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
      role,
    },
    session: { id: 'session-id' },
  } as never;
}
