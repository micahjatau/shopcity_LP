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
  } as unknown as PrismaService;
}

function sourceFixture() {
  return {
    receipts: [{ purchaseAmountKobo: 1000n }, { purchaseAmountKobo: 2500n }],
  };
}
