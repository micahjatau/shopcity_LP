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
