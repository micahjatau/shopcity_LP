import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service';
import { ReportMaterializerService } from './report-materializer.service';

describe('ReportMaterializerService', () => {
  it('uses the same tenant-wide advisory lock for tenant and branch materialization', async () => {
    const tx = reportTxStub();
    const stateUpsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub(tx, stateUpsert);
    const service = new ReportMaterializerService(prisma, configService());

    await service.materializeTenant('tenant-1', {
      materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      asOf: new Date('2026-08-10T12:00:00.000Z'),
    });
    await service.materializeBranch('tenant-1', 'branch-1', {
      materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      asOf: new Date('2026-08-10T12:00:00.000Z'),
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    const executeRawCalls = (tx.$executeRaw as { mock: { calls: unknown[][] } })
      .mock.calls;
    const firstLock = executeRawCalls[0]?.[0];
    const secondLock = executeRawCalls[1]?.[0];

    expect(firstLock).toStrictEqual(secondLock);
  });

  it('materializes tenant and branch reporting rows from authoritative source data', async () => {
    const tx = reportTxStub();
    const stateUpsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub(tx, stateUpsert);
    const service = new ReportMaterializerService(prisma, configService());

    await service.materializeTenant('tenant-1', {
      materializedAt: new Date('2026-08-10T12:00:00.000Z'),
      asOf: new Date('2026-08-10T12:00:00.000Z'),
    });

    expect(stateUpsert).toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.reportDailyFinancialSummary.createMany).toHaveBeenCalled();

    const payload =
      tx.reportDailyFinancialSummary.createMany.mock.calls[0]?.[0].data;

    const tenantRow = payload.find((row) => row.scopeKey === 'tenant-1');
    const branchRow = payload.find((row) => row.scopeKey === 'branch-1');

    expect(tenantRow).toMatchObject({
      registeredCustomers: 1,
      transactionCount: 1,
      loyaltyPurchaseValueKobo: 1000n,
      creditIssuedKobo: 1000n,
      outstandingLiabilityKobo: 1000n,
    });
    expect(branchRow).toMatchObject({
      registeredCustomers: 1,
      transactionCount: 1,
      loyaltyPurchaseValueKobo: 1000n,
      creditIssuedKobo: 1000n,
      outstandingLiabilityKobo: 1000n,
    });
  });
});

function configService(): ConfigService {
  return new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' } as never);
}

function prismaStub(tx: ReportTxStub, stateUpsert: jest.Mock): PrismaService {
  return {
    branch: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'branch-1', timezone: 'Africa/Lagos' }]),
    },
    customer: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'customer-1',
          branchId: 'branch-1',
          createdAt: new Date('2026-08-10T10:00:00.000Z'),
        },
      ]),
    },
    receipt: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'receipt-1',
          branchId: 'branch-1',
          customerId: 'customer-1',
          capturedBy: 'cashier-1',
          capturedAt: new Date('2026-08-10T10:00:00.000Z'),
          occurredAt: new Date('2026-08-10T10:00:00.000Z'),
          purchaseAmountKobo: 1000n,
          normalizedPosReceiptNumber: 'POS-1',
          receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
          captureStatus: 'CAPTURED',
        },
      ]),
    },
    loyaltyLedgerEntry: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'ledger-1',
          customerId: 'customer-1',
          receiptId: 'receipt-1',
          type: 'EARN',
          direction: 'CREDIT',
          status: 'CONFIRMED',
          amountKobo: 1000n,
          createdBy: 'cashier-1',
          createdAt: new Date('2026-08-10T10:00:00.000Z'),
          effectiveAt: new Date('2026-08-10T10:00:00.000Z'),
        },
      ]),
    },
    creditLot: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'lot-1',
          customerId: 'customer-1',
          originalAmountKobo: 1000n,
          earnedAt: new Date('2026-08-10T10:00:00.000Z'),
          expiresAt: new Date('2026-09-10T10:00:00.000Z'),
          earnLedgerEntryId: 'ledger-1',
        },
      ]),
    },
    redemption: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    smsMessage: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    approval: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    redemptionAllocation: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    allocationRestoration: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    reportMaterializationState: {
      upsert: stateUpsert,
    },
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(
      async (callback: (client: unknown) => Promise<void>) =>
        callback({
          ...({
            branch: {
              findMany: jest
                .fn()
                .mockResolvedValue([
                  { id: 'branch-1', timezone: 'Africa/Lagos' },
                ]),
            },
            customer: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'customer-1',
                  branchId: 'branch-1',
                  createdAt: new Date('2026-08-10T10:00:00.000Z'),
                },
              ]),
            },
            receipt: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'receipt-1',
                  branchId: 'branch-1',
                  customerId: 'customer-1',
                  capturedBy: 'cashier-1',
                  capturedAt: new Date('2026-08-10T10:00:00.000Z'),
                  occurredAt: new Date('2026-08-10T10:00:00.000Z'),
                  purchaseAmountKobo: 1000n,
                  normalizedPosReceiptNumber: 'POS-1',
                  receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
                  captureStatus: 'CAPTURED',
                },
              ]),
            },
            loyaltyLedgerEntry: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'ledger-1',
                  customerId: 'customer-1',
                  receiptId: 'receipt-1',
                  type: 'EARN',
                  direction: 'CREDIT',
                  status: 'CONFIRMED',
                  amountKobo: 1000n,
                  createdBy: 'cashier-1',
                  createdAt: new Date('2026-08-10T10:00:00.000Z'),
                  effectiveAt: new Date('2026-08-10T10:00:00.000Z'),
                },
              ]),
            },
            creditLot: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'lot-1',
                  customerId: 'customer-1',
                  originalAmountKobo: 1000n,
                  earnedAt: new Date('2026-08-10T10:00:00.000Z'),
                  expiresAt: new Date('2026-09-10T10:00:00.000Z'),
                  earnLedgerEntryId: 'ledger-1',
                },
              ]),
            },
            redemption: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            smsMessage: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            approval: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            redemptionAllocation: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            allocationRestoration: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            reportMaterializationState: {
              upsert: stateUpsert,
            },
          } as const),
          ...tx,
        }),
    ),
  } as unknown as PrismaService;
}

function reportTxStub(): ReportTxStub {
  return {
    reportDailyFinancialSummary: reportTableStub(),
    reportCashierDailySummary: reportTableStub(),
    reportCustomerSnapshot: reportTableStub(),
    reportLiabilityBucket: reportTableStub(),
    reportRedemptionDailySummary: reportTableStub(),
    reportSmsDailySummary: reportTableStub(),
    reportMaterializationState: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    $executeRaw: jest.fn().mockResolvedValue(undefined),
  };
}

function reportTableStub<
  T extends Record<string, unknown>,
>(): ReportTableStub<T> {
  const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const createMany = jest.fn<Promise<{ count: number }>, [{ data: T[] }]>();
  createMany.mockResolvedValue({ count: 1 });

  return {
    deleteMany,
    createMany,
  };
}

type DailySummaryRow = {
  scopeKey: string;
  registeredCustomers: number;
  transactionCount: number;
  loyaltyPurchaseValueKobo: bigint;
  creditIssuedKobo: bigint;
  outstandingLiabilityKobo: bigint;
};

type ReportTableStub<T extends Record<string, unknown>> = {
  deleteMany: jest.Mock;
  createMany: jest.Mock<Promise<{ count: number }>, [{ data: T[] }]>;
};

type ReportTxStub = {
  reportDailyFinancialSummary: ReportTableStub<DailySummaryRow>;
  reportCashierDailySummary: ReportTableStub<Record<string, unknown>>;
  reportCustomerSnapshot: ReportTableStub<Record<string, unknown>>;
  reportLiabilityBucket: ReportTableStub<Record<string, unknown>>;
  reportRedemptionDailySummary: ReportTableStub<Record<string, unknown>>;
  reportSmsDailySummary: ReportTableStub<Record<string, unknown>>;
  reportMaterializationState: {
    deleteMany: jest.Mock;
    upsert: jest.Mock;
  };
  $executeRaw: jest.Mock;
};
