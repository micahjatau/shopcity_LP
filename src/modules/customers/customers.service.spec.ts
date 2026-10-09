import { createHash } from 'node:crypto';
import { CardStatus, UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  it('rejects registration without affirmative loyalty consent', async () => {
    const service = new CustomersService(
      {} as never,
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
          loyaltyConsent: false,
          marketingOptIn: false,
        },
        'onboarding-consent-001',
      ),
    ).rejects.toThrow('Loyalty-service consent is required');
  });

  it('creates the customer and initial card in one idempotent transaction', async () => {
    const customer = customerRecord({ id: 'created-customer' });
    const card = {
      id: 'created-card',
      barcodeValue: 'CARD-001',
      status: CardStatus.ACTIVE,
    };
    const cardCreate = jest.fn().mockResolvedValue(card);
    const consentCreate = jest.fn().mockResolvedValue(undefined);
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
      customerConsent: { create: consentCreate },
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
          loyaltyConsent: true,
          marketingOptIn: false,
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
    expect(consentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-id',
        customerId: 'created-customer',
        capturedBy: 'user-id',
        loyaltyConsent: true,
        marketingOptIn: false,
        consentVersion: 'v1.2',
        privacyNoticeVersion: 'v2.0',
      }) as Record<string, unknown>,
    });
    expect(idempotencyUpdate).toHaveBeenCalledTimes(1);
    expect(auditService.recordWithClient).toHaveBeenCalledTimes(2);
  });

  it('does not complete idempotency when initial card creation fails', async () => {
    const idempotencyUpdate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
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
      customerConsent: { create: jest.fn().mockResolvedValue(undefined) },
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
          loyaltyConsent: true,
          marketingOptIn: false,
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
          loyaltyConsent: true,
          marketingOptIn: false,
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
          loyaltyConsent: true,
          marketingOptIn: false,
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

  it('returns customer-specific card, latest-purchase, and earned-credit values', async () => {
    const customerOneId = 'customer-one';
    const customerTwoId = 'customer-two';
    const customerThreeId = 'customer-three';
    const earnedGroupBy = jest.fn().mockResolvedValue([
      { customerId: customerOneId, _sum: { amountKobo: 7_500n } },
      { customerId: customerTwoId, _sum: { amountKobo: 11_000n } },
    ]);
    const latestReceiptAtOne = new Date('2026-09-01T12:00:00.000Z');
    const latestReceiptAtTwo = new Date('2026-09-03T12:00:00.000Z');
    const receiptGroupBy = jest.fn().mockResolvedValue([
      { customerId: customerOneId, _max: { occurredAt: latestReceiptAtOne } },
      { customerId: customerTwoId, _max: { occurredAt: latestReceiptAtTwo } },
    ]);
    const receiptFindMany = jest.fn().mockResolvedValue([
      { customerId: customerOneId, purchaseAmountKobo: 45_000n },
      { customerId: customerTwoId, purchaseAmountKobo: 500n },
    ]);
    const prisma = {
      customer: {
        findMany: jest.fn().mockResolvedValue([
          customerRecord({
            id: customerOneId,
            fullName: 'Ada One',
            cards: [{ status: CardStatus.ACTIVE, barcodeValue: 'CARD-ONE' }],
          }),
          customerRecord({
            id: customerTwoId,
            fullName: 'Ada Two',
            cards: [{ status: CardStatus.ACTIVE, barcodeValue: 'CARD-TWO' }],
          }),
          customerRecord({
            id: customerThreeId,
            fullName: 'Ada Three',
            cards: [],
          }),
        ]),
      },
      loyaltyLedgerEntry: { groupBy: earnedGroupBy },
      receipt: { groupBy: receiptGroupBy, findMany: receiptFindMany },
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );

    const response = await service.listCustomers(
      'tenant-id',
      actorStub(UserRole.SUPERVISOR),
    );

    expect(response).toMatchObject({
      items: [
        {
          id: customerOneId,
          cardNumber: 'CARD-ONE',
          activeCardSerialNumber: 'CARD-ONE',
          lifetimeEarnedKobo: 7_500,
          lastPurchaseAmountKobo: 45_000,
        },
        {
          id: customerTwoId,
          cardNumber: 'CARD-TWO',
          activeCardSerialNumber: 'CARD-TWO',
          lifetimeEarnedKobo: 11_000,
          lastPurchaseAmountKobo: 500,
        },
        {
          id: customerThreeId,
          cardNumber: null,
          activeCardSerialNumber: null,
          lifetimeEarnedKobo: 0,
          lastPurchaseAmountKobo: null,
        },
      ],
    });
    expect(earnedGroupBy).toHaveBeenCalledWith({
      by: ['customerId'],
      where: {
        tenantId: 'tenant-id',
        customerId: { in: [customerOneId, customerTwoId, customerThreeId] },
        type: 'EARN',
        direction: 'CREDIT',
        status: 'CONFIRMED',
      },
      _sum: { amountKobo: true },
    });
    expect(receiptGroupBy).toHaveBeenCalledWith({
      by: ['customerId'],
      where: {
        tenantId: 'tenant-id',
        customerId: { in: [customerOneId, customerTwoId, customerThreeId] },
        captureStatus: 'CAPTURED',
        reviewStatus: 'APPROVED',
      },
      _max: { occurredAt: true },
    });
    expect(receiptFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-id',
        OR: [
          { customerId: customerOneId, occurredAt: latestReceiptAtOne },
          { customerId: customerTwoId, occurredAt: latestReceiptAtTwo },
        ],
      },
      orderBy: [{ customerId: 'asc' }, { id: 'desc' }],
      select: { customerId: true, purchaseAmountKobo: true },
    });
  });

  it('returns tenant-scoped profile metrics, upcoming expiry, records, and sanitized activity', async () => {
    const future = new Date(Date.now() + 86_400_000);
    const cardIssuedAt = new Date('2025-01-01T00:00:00.000Z');
    const effectiveAt = new Date('2025-02-01T00:00:00.000Z');
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'customer-id',
          createdAt: cardIssuedAt,
          cards: [
            {
              id: 'card-id',
              barcodeValue: 'CARD-001',
              status: 'ACTIVE',
              issuedAt: cardIssuedAt,
              blockedAt: null,
            },
          ],
          consents: [
            {
              loyaltyConsent: true,
              marketingOptIn: false,
              consentVersion: 'v1',
              privacyNoticeVersion: 'v2',
              capturedAt: cardIssuedAt,
            },
          ],
        }),
      },
      card: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'card-id',
            barcodeValue: 'CARD-001',
            status: 'ACTIVE',
            issuedAt: cardIssuedAt,
            blockedAt: null,
          },
        ]),
      },
      customerConsent: {
        findFirst: jest.fn().mockResolvedValue({
          loyaltyConsent: true,
          marketingOptIn: false,
          consentVersion: 'v1',
          privacyNoticeVersion: 'v2',
          capturedAt: cardIssuedAt,
        }),
      },
      loyaltyLedgerEntry: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amountKobo: 9_000n } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'earn-1',
            type: 'EARN',
            direction: 'CREDIT',
            amountKobo: 9_000n,
            status: 'CONFIRMED',
            effectiveAt,
          },
        ]),
      },
      approval: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'approval-1',
            targetType: 'EARN',
            status: 'REJECTED',
            requestedAt: effectiveAt,
            decidedAt: effectiveAt,
            receipt: { purchaseAmountKobo: 2_000n },
            redemption: null,
            expiresAt: new Date('2025-03-01T00:00:00.000Z'),
          },
          {
            id: 'approval-pending',
            targetType: 'REDEEM',
            status: 'PENDING',
            requestedAt: new Date('2025-02-02T00:00:00.000Z'),
            decidedAt: null,
            expiresAt: new Date('2025-03-02T00:00:00.000Z'),
            receipt: null,
            redemption: { requestedAmountKobo: 700n },
          },
          {
            id: 'approval-expired',
            targetType: 'EARN',
            status: 'EXPIRED',
            requestedAt: new Date('2025-02-03T00:00:00.000Z'),
            decidedAt: null,
            expiresAt: new Date('2025-02-04T00:00:00.000Z'),
            receipt: { purchaseAmountKobo: 2_000n },
            redemption: null,
          },
        ]),
      },
      creditLot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'future-lot', expiresAt: future, remainingAmountKobo: 500n },
          { id: 'used-lot', expiresAt: future, remainingAmountKobo: 0n },
          {
            id: 'expired-lot',
            expiresAt: new Date(Date.now() - 86_400_000),
            remainingAmountKobo: 50n,
          },
        ]),
      },
      receipt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'receipt-1',
            purchaseAmountKobo: 2_000n,
            occurredAt: effectiveAt,
            captureStatus: 'CAPTURED',
            reviewStatus: 'APPROVED',
          },
        ]),
      },
      redemption: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'redemption-1',
            requestedAmountKobo: 700n,
            confirmedAmountKobo: 600n,
            status: 'CONFIRMED',
            requestedAt: effectiveAt,
            confirmedAt: effectiveAt,
          },
        ]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-good',
            action: 'customer.status',
            entityType: 'customer',
            entityId: 'customer-id',
            metadata: { status: 'BLOCKED', phone: 'must-not-leak' },
            createdAt: effectiveAt,
          },
          {
            id: 'audit-card-status',
            action: 'card.status',
            entityType: 'card',
            entityId: 'card-id',
            metadata: { status: 'BLOCKED', barcodeValue: 'must-not-leak' },
            createdAt: effectiveAt,
          },
          {
            id: 'audit-bad',
            action: 'card.status',
            entityType: 'card',
            entityId: 'card-id',
            metadata: { status: 'UNKNOWN' },
            createdAt: effectiveAt,
          },
        ]),
      },
    };
    const audit = auditStub();
    const service = new CustomersService(
      prisma as never,
      audit as never,
      activeBalanceStub() as never,
    );
    const result = await service.getCustomerProfileProjection(
      'tenant-id',
      'customer-id',
      actorStub(UserRole.SUPERVISOR),
    );

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-id', id: 'customer-id' },
      }),
    );
    expect(prisma.creditLot.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.approval.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-id',
        status: 'PENDING',
        OR: [
          { receipt: { customerId: 'customer-id' } },
          { redemption: { customerId: 'customer-id' } },
        ],
      },
    });
    expect(result).toMatchObject({
      customerId: 'customer-id',
      sourceErrors: [],
      pendingApprovalsCount: 2,
      lifetimeEarnedKobo: 9000,
      expirySchedule: [
        { expiresAt: future.toISOString(), remainingAmountKobo: 500 },
      ],
      card: {
        identifier: 'CARD-001',
        status: 'ACTIVE',
        issuedAt: cardIssuedAt.toISOString(),
      },
      consent: { loyaltyConsent: true, marketingOptIn: false },
    });
    expect(result.recentActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'EARNING',
          amountKobo: 9000,
          occurredAt: effectiveAt.toISOString(),
        }),
        expect.objectContaining({ type: 'CUSTOMER_STATUS', status: 'BLOCKED' }),
        expect.objectContaining({ type: 'CARD_STATUS', status: 'BLOCKED' }),
        expect.objectContaining({
          type: 'APPROVAL_REQUEST',
          targetType: 'REDEEM',
          status: 'PENDING',
          amountKobo: null,
          occurredAt: '2025-02-02T00:00:00.000Z',
        }),
        expect.objectContaining({
          type: 'APPROVAL_OUTCOME',
          targetType: 'EARN',
          status: 'REJECTED',
          amountKobo: null,
        }),
        expect.objectContaining({
          type: 'APPROVAL_EXPIRED',
          status: 'EXPIRED',
          amountKobo: null,
          occurredAt: '2025-02-04T00:00:00.000Z',
        }),
        expect.objectContaining({ type: 'CARD_ISSUED' }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('audit-bad');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'customer.pii.read',
        entityId: 'customer-id',
      }),
    );
  });

  it('returns source errors without turning one failed tab into a false empty result', async () => {
    const prisma = {
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'customer-id', createdAt: new Date() }),
      },
      card: { findMany: jest.fn().mockResolvedValue([]) },
      customerConsent: { findFirst: jest.fn().mockResolvedValue(null) },
      loyaltyLedgerEntry: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amountKobo: 4_000n } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      approval: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      creditLot: { findMany: jest.fn().mockResolvedValue([]) },
      receipt: {
        findMany: jest
          .fn()
          .mockRejectedValue(new Error('receipt query failed')),
      },
      redemption: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );

    const result = await service.getCustomerProfileProjection(
      'tenant-id',
      'customer-id',
      actorStub(UserRole.ADMIN),
    );

    expect(result.sourceErrors).toContain('transactions');
    expect(result.transactions).toEqual([]);
    expect(result.lifetimeEarnedKobo).toBe(4_000);
  });

  it('rejects non-supervisor profile projection reads', async () => {
    const service = new CustomersService(
      {} as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );
    await expect(
      service.getCustomerProfileProjection(
        'tenant-id',
        'customer-id',
        actorStub(UserRole.CASHIER),
      ),
    ).rejects.toThrow('Supervisor or admin access is required');
  });

  it('returns not found for missing tenant-scoped profile customer', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new CustomersService(
      prisma as never,
      auditStub() as never,
      activeBalanceStub() as never,
    );
    await expect(
      service.getCustomerProfileProjection(
        'tenant-id',
        'foreign-customer',
        actorStub(UserRole.ADMIN),
      ),
    ).rejects.toThrow('Customer not found');
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-id', id: 'foreign-customer' },
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
    cards: [{ status: CardStatus.ACTIVE, barcodeValue: 'CARD-001' }],
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
