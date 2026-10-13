import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import type { PrismaService } from '../../database/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('reconciles executive summary rows against authoritative source totals', async () => {
    const source = sourceFixture();
    const prisma = prismaStub({
      executiveSummaryRows: [
        {
          scope: 'TENANT',
          scopeKey: 'tenant-1',
          branchId: null,
          reportDate: new Date('2026-08-10T00:00:00.000Z'),
          registeredCustomers: 2,
          activeCustomers: 2,
          transactionCount: 2,
          loyaltyPurchaseValueKobo: 3500n,
          creditIssuedKobo: 70n,
          creditRedeemedKobo: 500n,
          creditExpiredKobo: 0n,
          outstandingLiabilityKobo: 70n,
          materializedAt: new Date('2026-08-10T12:00:00.000Z'),
        },
      ],
    });
    const service = new ReportsService(prisma, configService());

    const result = await service.listExecutiveSummary(
      'tenant-1',
      adminContext(),
      {
        from: '2026-08-10T00:00:00.000Z',
        to: '2026-08-10T23:59:59.999Z',
        timezone: 'Africa/Lagos',
      },
    );

    expect(result).toMatchObject({
      scope: 'TENANT',
      scopeKey: 'tenant-1',
      branchId: null,
      timezone: 'Africa/Lagos',
    });
    expect(result.items).toEqual([
      {
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        reportDate: new Date('2026-08-10T00:00:00.000Z'),
        registeredCustomers: 2,
        activeCustomers: 2,
        transactionCount: 2,
        loyaltyPurchaseValueKobo: 3500,
        creditIssuedKobo: 70,
        creditRedeemedKobo: 500,
        creditExpiredKobo: 0,
        outstandingLiabilityKobo: 70,
        materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    ]);
    expect(source.receipts).toHaveLength(2);
  });

  it('returns the latest executive snapshot without date flow filters', async () => {
    const latestRow = {
      scope: 'BRANCH',
      scopeKey: 'branch-1',
      branchId: 'branch-1',
      reportDate: new Date('2026-08-11T00:00:00.000Z'),
      registeredCustomers: 3,
      activeCustomers: 2,
      transactionCount: 0,
      loyaltyPurchaseValueKobo: 0n,
      creditIssuedKobo: 0n,
      creditRedeemedKobo: 0n,
      creditExpiredKobo: 0n,
      outstandingLiabilityKobo: 1200n,
      materializedAt: new Date('2026-08-11T12:00:00.000Z'),
    };
    const prisma = prismaStub({ executiveSnapshotRow: latestRow });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.getExecutiveSnapshot('tenant-1', supervisorContext()),
    ).resolves.toMatchObject({
      scope: 'BRANCH',
      scopeKey: 'branch-1',
      branchId: 'branch-1',
      items: [
        expect.objectContaining({
          reportDate: latestRow.reportDate,
          outstandingLiabilityKobo: 1200,
        }),
      ],
    });
    const reportDailyFinancialSummary =
      prisma.reportDailyFinancialSummary as unknown as {
        findFirst: jest.Mock<unknown, [Record<string, unknown>]>;
      };
    const findFirstMock = reportDailyFinancialSummary.findFirst;
    const firstFindFirstCall = findFirstMock.mock.calls[0]?.[0];
    expect(firstFindFirstCall).toEqual({
      where: {
        tenantId: 'tenant-1',
        scope: 'BRANCH',
        scopeKey: 'branch-1',
      },
      orderBy: { reportDate: 'desc' },
    });
  });

  it('returns an empty executive snapshot when no materialized rows exist', async () => {
    const service = new ReportsService(prismaStub(), configService());

    await expect(
      service.getExecutiveSnapshot('tenant-1', adminContext()),
    ).resolves.toMatchObject({
      scope: 'TENANT',
      scopeKey: 'tenant-1',
      branchId: null,
      items: [],
    });
  });

  it('returns an admin-only pilot operations summary with release metadata and source-backed counts', async () => {
    const prisma = {
      outboxEvent: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
      },
      smsMessage: {
        count: jest.fn().mockResolvedValue(2),
      },
      offlineSyncAttempt: {
        count: jest.fn().mockResolvedValue(4),
      },
      fraudFlag: {
        count: jest.fn().mockResolvedValue(5),
      },
      reportMaterializationState: {
        count: jest.fn().mockResolvedValue(1),
      },
      creditLot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'lot-1',
            originalAmountKobo: 100n,
            remainingAmountKobo: 70n,
          },
        ]),
      },
      redemptionAllocation: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { creditLotId: 'lot-1', _sum: { amountKobo: 30n } },
          ]),
      },
      creditExpiry: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      allocationRestoration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const service = new ReportsService(prisma, configService());

    await expect(
      service.getPilotOperationsSummary('tenant-1', adminContext()),
    ).resolves.toMatchObject({
      release: {
        version: '1.2.3',
        sha: 'abc123',
        sentryConfigured: true,
      },
      outbox: {
        backlogCount: 3,
        staleCount: 1,
      },
      sms: {
        failedCount: 2,
      },
      offlineSync: {
        failureCount: 4,
      },
      fraud: {
        openCount: 5,
      },
      reports: {
        staleCount: 1,
      },
      reconciliation: {
        healthy: true,
        mismatchCount: 0,
      },
    });
  });

  it('marks reconciliation unhealthy when mismatch counts are present', async () => {
    const prisma = {
      outboxEvent: {
        count: jest.fn().mockResolvedValue(0),
      },
      smsMessage: {
        count: jest.fn().mockResolvedValue(0),
      },
      offlineSyncAttempt: {
        count: jest.fn().mockResolvedValue(0),
      },
      fraudFlag: {
        count: jest.fn().mockResolvedValue(0),
      },
      reportMaterializationState: {
        count: jest.fn().mockResolvedValue(0),
      },
      creditLot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'lot-1',
            originalAmountKobo: 100n,
            remainingAmountKobo: 100n,
          },
          {
            id: 'lot-2',
            originalAmountKobo: 200n,
            remainingAmountKobo: 150n,
          },
        ]),
      },
      redemptionAllocation: {
        groupBy: jest.fn().mockResolvedValue([
          { creditLotId: 'lot-1', _sum: { amountKobo: 20n } },
          { creditLotId: 'lot-2', _sum: { amountKobo: 10n } },
        ]),
      },
      creditExpiry: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      allocationRestoration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const service = new ReportsService(prisma, configService());

    await expect(
      service.getPilotOperationsSummary('tenant-1', adminContext()),
    ).resolves.toMatchObject({
      reconciliation: {
        healthy: false,
        mismatchCount: 2,
      },
    });
  });

  it('rejects pilot operations summary for non-admin callers', async () => {
    const service = new ReportsService(prismaStub(), configService());

    await expect(
      service.getPilotOperationsSummary('tenant-1', supervisorContext()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks supervisors from cross-branch report access', async () => {
    const service = new ReportsService(prismaStub(), configService());

    await expect(
      service.listMaterializationState('tenant-1', supervisorContext(), {
        branchId: 'branch-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns branch-scoped today transactions for a cashier', async () => {
    const receipt = {
      id: 'receipt-1',
      occurredAt: new Date('2026-08-25T10:00:00.000Z'),
      posReceiptNumber: '1831',
      purchaseAmountKobo: 420n,
      reviewStatus: 'APPROVED',
      customer: { fullName: 'Ada Shopper' },
      redemption: null,
      ledgerEntries: [{ type: 'EARN', amountKobo: 42n, status: 'CONFIRMED' }],
    };
    const prisma = prismaStub({
      receipts: [receipt],
      monthlyEarnKobo: 2000n,
    });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext(), 'customer-1'),
    ).resolves.toMatchObject({
      branchId: 'branch-1',
      timezone: 'Africa/Lagos',
      monthlyEarnKobo: 2000,
      items: [
        {
          id: 'receipt-1',
          operation: 'EARN',
          customerName: 'Ada Shopper',
          purchaseAmountKobo: 420,
          loyaltyAmountKobo: 42,
          redeemedAmountKobo: null,
          netPaidAmountKobo: null,
          earnedAmountKobo: 42,
          receiptNumber: '1831',
          status: 'CONFIRMED',
        },
      ],
    });
  });

  it('filters recent cashier activity by customer and bounds the requested limit', async () => {
    const prisma = prismaStub({ receipts: [] });
    const findMany = jest.spyOn(prisma.receipt, 'findMany');
    const service = new ReportsService(prisma, configService());

    await service.listCashierToday(
      'tenant-1',
      cashierContext(),
      'customer-1',
      3,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matcher types expose `any`; this assertion inspects the Prisma where payload.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          capturedByTenantId: 'tenant-1',
          capturedBy: 'cashier-1',
          customerId: 'customer-1',
        }),
        take: 3,
      }),
    );
  });

  it('returns a server page and scoped total for cashier activity', async () => {
    const prisma = prismaStub({ totalCount: 12 });
    const findMany = jest.spyOn(prisma.receipt, 'findMany');
    const count = jest.spyOn(prisma.receipt, 'count');
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext(), undefined, 5, 3),
    ).resolves.toMatchObject({ page: 3, limit: 5, totalCount: 12, items: [] });

    const expectedWhere = {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      capturedByTenantId: 'tenant-1',
      capturedBy: 'cashier-1',
    };
    const findManyQuery = findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      skip: number;
      take: number;
      orderBy: unknown;
    };
    expect(findManyQuery).toMatchObject({
      where: expectedWhere,
      skip: 10,
      take: 5,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    const countQuery = count.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(countQuery.where).toMatchObject(expectedWhere);
  });

  it('does not represent a pending Earn purchase amount as loyalty credit', async () => {
    const prisma = prismaStub({
      receipts: [
        {
          id: 'receipt-pending-earn',
          occurredAt: new Date('2026-08-25T10:00:00.000Z'),
          posReceiptNumber: '1831-PENDING',
          purchaseAmountKobo: 1000000n,
          reviewStatus: 'PENDING',
          customer: { fullName: 'Ada Shopper' },
          redemption: null,
          ledgerEntries: [],
        },
      ],
    });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext()),
    ).resolves.toMatchObject({
      items: [
        {
          operation: 'EARN',
          customerName: 'Ada Shopper',
          purchaseAmountKobo: 1000000,
          loyaltyAmountKobo: null,
          redeemedAmountKobo: null,
          netPaidAmountKobo: null,
          earnedAmountKobo: null,
          receiptNumber: '1831-PENDING',
          status: 'PENDING',
        },
      ],
    });
  });

  it('omits purchase amounts that cannot be represented as safe integer kobo', async () => {
    const prisma = prismaStub({
      receipts: [
        {
          id: 'receipt-large-amount',
          occurredAt: new Date('2026-08-25T10:00:00.000Z'),
          posReceiptNumber: '1833',
          purchaseAmountKobo: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
          reviewStatus: 'APPROVED',
          customer: { fullName: 'Ada Shopper' },
          redemption: null,
          ledgerEntries: [],
        },
      ],
    });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext()),
    ).resolves.toMatchObject({
      items: [{ customerName: 'Ada Shopper', purchaseAmountKobo: null }],
    });
  });

  it('maps a redemption receipt to its confirmed amount and status', async () => {
    const prisma = prismaStub({
      receipts: [
        {
          id: 'receipt-2',
          occurredAt: new Date('2026-08-25T10:00:00.000Z'),
          posReceiptNumber: '1832',
          purchaseAmountKobo: 1000n,
          reviewStatus: 'APPROVED',
          customer: { fullName: 'Ada Shopper' },
          redemption: {
            requestedAmountKobo: 500n,
            confirmedAmountKobo: 450n,
            status: 'CONFIRMED',
          },
          ledgerEntries: [
            { type: 'REDEEM', amountKobo: 450n, status: 'CONFIRMED' },
            { type: 'EARN', amountKobo: 11n, status: 'CONFIRMED' },
          ],
        },
      ],
    });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext()),
    ).resolves.toMatchObject({
      items: [
        {
          operation: 'REDEEM',
          loyaltyAmountKobo: 450,
          redeemedAmountKobo: 450,
          netPaidAmountKobo: 550,
          earnedAmountKobo: 11,
          receiptNumber: '1832',
          status: 'CONFIRMED',
        },
      ],
    });
  });

  it('rejects cashier activity without a branch scope', async () => {
    const service = new ReportsService(prismaStub(), configService());
    const context = cashierContext();
    Reflect.set(context.user, 'branchId', null);

    await expect(
      service.listCashierToday('tenant-1', context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects cashier activity when the branch belongs to another tenant', async () => {
    const prisma = prismaStub();
    jest.spyOn(prisma.branch, 'findFirst').mockResolvedValue(null);
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext()),
    ).rejects.toThrow('Cashier activity branch not found');
  });

  it('uses the branch timezone and cashier identity in the activity query', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-25T22:30:00.000Z'));
    try {
      const prisma = prismaStub();
      const findMany = jest.spyOn(prisma.receipt, 'findMany');
      const service = new ReportsService(prisma, configService());

      await service.listCashierToday('tenant-1', cashierContext());

      const query = findMany.mock.calls[0]?.[0] as {
        where: {
          tenantId: string;
          branchId: string;
          capturedByTenantId: string;
          capturedBy: string;
          occurredAt: { gte: Date; lt: Date };
        };
      };
      expect(query.where).toEqual({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        capturedByTenantId: 'tenant-1',
        capturedBy: 'cashier-1',
        occurredAt: {
          gte: new Date('2026-08-24T23:00:00.000Z'),
          lt: new Date('2026-08-25T23:00:00.000Z'),
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('adds tenant- and branch-scoped customer names to customer performance rows', async () => {
    const prisma = prismaStub({
      customerSnapshotRows: [
        { customerId: 'customer-1', purchaseValueKobo: 1200n },
      ],
      customers: [{ id: 'customer-1', fullName: 'Amina Bello' }],
    });
    const service = new ReportsService(prisma, configService());

    const result = await service.listCustomerPerformance(
      'tenant-1',
      supervisorContext(),
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        customerId: 'customer-1',
        customerName: 'Amina Bello',
        purchaseValueKobo: 1200,
      }),
    ]);
    const customerDelegate = prisma.customer as unknown as {
      findMany: jest.Mock<unknown, [Record<string, unknown>]>;
    };
    const customerFindMany = customerDelegate.findMany;
    expect(customerFindMany.mock.calls[0]?.[0]).toEqual({
      where: {
        tenantId: 'tenant-1',
        id: { in: ['customer-1'] },
        branchId: 'branch-1',
      },
      select: { id: true, fullName: true },
    });
  });

  it('adds tenant- and branch-scoped cashier emails to cashier activity rows', async () => {
    const prisma = prismaStub({
      cashierActivityRows: [{ cashierId: 'cashier-1', transactionCount: 3 }],
      cashierUsers: [{ id: 'cashier-1', username: 'cashier.one@example.test' }],
    });
    const service = new ReportsService(prisma, configService());

    const result = await service.listCashierActivity(
      'tenant-1',
      supervisorContext(),
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        cashierId: 'cashier-1',
        cashierEmail: 'cashier.one@example.test',
        transactionCount: 3,
      }),
    ]);
    const userDelegate = prisma.user as unknown as {
      findMany: jest.Mock<unknown, [Record<string, unknown>]>;
    };
    const userFindMany = userDelegate.findMany;
    expect(userFindMany.mock.calls[0]?.[0]).toEqual({
      where: {
        tenantId: 'tenant-1',
        id: { in: ['cashier-1'] },
        branchId: 'branch-1',
      },
      select: { id: true, username: true },
    });
  });

  it('rejects invalid report dates', async () => {
    const service = new ReportsService(prismaStub(), configService());

    await expect(
      service.listExecutiveSummary('tenant-1', adminContext(), {
        from: 'invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function configService(): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'SHOPCITY_TIMEZONE') {
        return 'Africa/Lagos';
      }
      if (key === 'RELEASE_VERSION') {
        return '1.2.3';
      }
      if (key === 'RELEASE_SHA') {
        return 'abc123';
      }
      if (key === 'SENTRY_DSN') {
        return 'https://examplePublicKey@o0.ingest.sentry.io/1';
      }
      if (key === 'OUTBOX_STALE_THRESHOLD_MINUTES') {
        return 30;
      }
      if (key === 'REPORT_STALENESS_THRESHOLD_MINUTES') {
        return 180;
      }

      return undefined;
    },
  } as unknown as ConfigService;
}

function adminContext(): AuthContext {
  return {
    session: {} as never,
    user: {
      id: 'admin-1',
      tenantId: 'tenant-1',
      role: UserRole.ADMIN,
      branchId: null,
    } as never,
  };
}

function cashierContext(): AuthContext {
  return {
    session: {} as never,
    user: {
      id: 'cashier-1',
      tenantId: 'tenant-1',
      role: UserRole.CASHIER,
      branchId: 'branch-1',
    } as never,
  };
}

function supervisorContext(): AuthContext {
  return {
    session: {} as never,
    user: {
      id: 'supervisor-1',
      tenantId: 'tenant-1',
      role: UserRole.SUPERVISOR,
      branchId: 'branch-1',
    } as never,
  };
}

function prismaStub(
  options: {
    executiveSummaryRows?: Array<Record<string, unknown>>;
    executiveSnapshotRow?: Record<string, unknown> | null;
    customerSnapshotRows?: Array<Record<string, unknown>>;
    cashierActivityRows?: Array<Record<string, unknown>>;
    customers?: Array<{ id: string; fullName: string }>;
    cashierUsers?: Array<{ id: string; username: string }>;
    receipts?: Array<Record<string, unknown>>;
    totalCount?: number;
    monthlyEarnKobo?: bigint | null;
  } = {},
): PrismaService {
  return {
    branch: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'branch-1', timezone: 'Africa/Lagos' }),
    },
    reportDailyFinancialSummary: {
      findMany: jest.fn().mockResolvedValue(options.executiveSummaryRows ?? []),
      findFirst: jest
        .fn()
        .mockResolvedValue(options.executiveSnapshotRow ?? null),
    },
    reportLiabilityBucket: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    reportCustomerSnapshot: {
      findMany: jest.fn().mockResolvedValue(options.customerSnapshotRows ?? []),
    },
    reportCashierDailySummary: {
      findMany: jest.fn().mockResolvedValue(options.cashierActivityRows ?? []),
    },
    customer: {
      findMany: jest.fn().mockResolvedValue(options.customers ?? []),
    },
    user: {
      findMany: jest.fn().mockResolvedValue(options.cashierUsers ?? []),
    },
    reportMaterializationState: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    receipt: {
      findMany: jest.fn().mockResolvedValue(options.receipts ?? []),
      count: jest
        .fn()
        .mockResolvedValue(options.totalCount ?? options.receipts?.length ?? 0),
    },
    loyaltyLedgerEntry: {
      aggregate: jest.fn().mockResolvedValue({
        _sum: { amountKobo: options.monthlyEarnKobo ?? null },
      }),
    },
  } as unknown as PrismaService;
}

function sourceFixture() {
  return {
    receipts: [{ purchaseAmountKobo: 1000n }, { purchaseAmountKobo: 2500n }],
  };
}
