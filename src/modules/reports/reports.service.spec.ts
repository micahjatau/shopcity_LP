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
        loyaltyPurchaseValueKobo: 3500n,
        creditIssuedKobo: 70n,
        creditRedeemedKobo: 500n,
        creditExpiredKobo: 0n,
        outstandingLiabilityKobo: 70n,
        materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    ]);
    expect(source.receipts).toHaveLength(2);
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
      redemption: null,
      ledgerEntries: [{ type: 'EARN', amountKobo: 42n, status: 'CONFIRMED' }],
    };
    const prisma = prismaStub({ receipts: [receipt] });
    const service = new ReportsService(prisma, configService());

    await expect(
      service.listCashierToday('tenant-1', cashierContext()),
    ).resolves.toMatchObject({
      branchId: 'branch-1',
      timezone: 'Africa/Lagos',
      items: [
        {
          id: 'receipt-1',
          operation: 'EARN',
          loyaltyAmountKobo: 42,
          receiptNumber: '1831',
          status: 'CONFIRMED',
        },
      ],
    });
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
          loyaltyAmountKobo: null,
          receiptNumber: '1831-PENDING',
          status: 'PENDING',
        },
      ],
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
          redemption: {
            requestedAmountKobo: 500n,
            confirmedAmountKobo: 450n,
            status: 'CONFIRMED',
          },
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
          operation: 'REDEEM',
          loyaltyAmountKobo: 450,
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
    receipts?: Array<Record<string, unknown>>;
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
    },
    reportLiabilityBucket: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    reportCustomerSnapshot: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    reportMaterializationState: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    receipt: {
      findMany: jest.fn().mockResolvedValue(options.receipts ?? []),
    },
  } as unknown as PrismaService;
}

function sourceFixture() {
  return {
    receipts: [{ purchaseAmountKobo: 1000n }, { purchaseAmountKobo: 2500n }],
  };
}
