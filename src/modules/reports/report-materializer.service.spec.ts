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

  it('reconstructs outstanding and expired liability from expiry evidence across as-of boundaries', async () => {
    const tx = reportTxStub();
    const stateUpsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub(tx, stateUpsert, {
      creditExpiries: [
        {
          creditLotId: 'lot-1',
          amountKobo: 1000n,
          expiredAt: new Date('2026-09-10T10:00:00.000Z'),
        },
      ],
    });
    const service = new ReportMaterializerService(prisma, configService());

    await service.materializeTenant('tenant-1', {
      materializedAt: new Date('2026-09-09T12:00:00.000Z'),
      asOf: new Date('2026-09-09T12:00:00.000Z'),
    });

    const preExpiryRows =
      tx.reportDailyFinancialSummary.createMany.mock.calls[0]?.[0].data;
    const preExpiryTenantRow = preExpiryRows.find(
      (row) => row.scopeKey === 'tenant-1',
    );

    expect(preExpiryTenantRow).toMatchObject({
      creditExpiredKobo: 0n,
      outstandingLiabilityKobo: 1000n,
    });

    tx.reportDailyFinancialSummary.createMany.mockClear();

    await service.materializeTenant('tenant-1', {
      materializedAt: new Date('2026-09-11T12:00:00.000Z'),
      asOf: new Date('2026-09-11T12:00:00.000Z'),
    });

    const postExpiryRows =
      tx.reportDailyFinancialSummary.createMany.mock.calls[0]?.[0].data;
    const postExpiryTenantRow = postExpiryRows.find(
      (row) => row.scopeKey === 'tenant-1',
    );

    expect(postExpiryTenantRow).toMatchObject({
      creditExpiredKobo: 1000n,
      outstandingLiabilityKobo: 0n,
    });
  });

  it('rebuilds redemption and SMS summaries from as-of status snapshots', async () => {
    const tx = reportTxStub();
    const stateUpsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub(tx, stateUpsert);
    const prismaWithTransaction = {
      ...prisma,
      $transaction: jest.fn(
        async (callback: (client: ReportMaterializationTx) => Promise<void>) =>
          callback({
            ...tx,
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
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'redemption-1',
                  branchId: 'branch-1',
                  customerId: 'customer-1',
                  requestedAmountKobo: 2000n,
                  confirmedAmountKobo: 2000n,
                  status: 'REVERSED',
                  requestedAt: new Date('2026-08-10T10:00:00.000Z'),
                  confirmedAt: new Date('2026-08-10T11:00:00.000Z'),
                  rejectedAt: null,
                  reversedAt: new Date('2026-08-10T13:00:00.000Z'),
                },
              ]),
            },
            creditExpiry: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            smsMessage: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'sms-1',
                  receiptId: 'receipt-1',
                  status: 'SENT',
                  queuedAt: new Date('2026-08-10T10:00:00.000Z'),
                  createdAt: new Date('2026-08-10T10:00:00.000Z'),
                  sentAt: new Date('2026-08-10T13:00:00.000Z'),
                  deliveredAt: null,
                  failedAt: new Date('2026-08-10T11:00:00.000Z'),
                  suppressedAt: null,
                },
              ]),
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
          }),
      ),
    } as unknown as PrismaService;
    const service = new ReportMaterializerService(
      prismaWithTransaction,
      configService(),
    );
    const asOf = new Date('2026-08-10T12:00:00.000Z');

    await service.materializeTenant('tenant-1', {
      materializedAt: asOf,
      asOf,
    });

    const redemptionRows =
      tx.reportRedemptionDailySummary.createMany.mock.calls[0]?.[0].data;
    const smsRows = tx.reportSmsDailySummary.createMany.mock.calls[0]?.[0].data;
    const dailyRows =
      tx.reportDailyFinancialSummary.createMany.mock.calls[0]?.[0].data;
    const tenantDailyRow = dailyRows.find((row) => row.scopeKey === 'tenant-1');

    expect(redemptionRows[0]).toMatchObject({
      pendingApprovalCount: 0,
      confirmedKobo: 2000n,
      reversedKobo: 0n,
    });
    expect(tenantDailyRow).toMatchObject({
      creditRedeemedKobo: 2000n,
    });
    expect(smsRows[0]).toMatchObject({
      queuedCount: 1,
      sentCount: 0,
      failedCount: 1,
    });
  });
});

function configService(): ConfigService {
  return new ConfigService({ SHOPCITY_TIMEZONE: 'Africa/Lagos' } as never);
}

type ReportMaterializationTx = {
  branch: {
    findMany: jest.Mock;
  };
  customer: {
    findMany: jest.Mock;
  };
  receipt: {
    findMany: jest.Mock;
  };
  loyaltyLedgerEntry: {
    findMany: jest.Mock;
  };
  creditLot: {
    findMany: jest.Mock;
  };
  redemption: {
    findMany: jest.Mock;
  };
  creditExpiry: {
    findMany: jest.Mock;
  };
  smsMessage: {
    findMany: jest.Mock;
  };
  approval: {
    findMany: jest.Mock;
  };
  redemptionAllocation: {
    findMany: jest.Mock;
  };
  allocationRestoration: {
    findMany: jest.Mock;
  };
  auditLog: {
    findMany: jest.Mock;
  };
};

function prismaStub(
  tx: ReportTxStub,
  stateUpsert: jest.Mock,
  options: {
    creditExpiries?: Array<{
      creditLotId: string;
      amountKobo: bigint;
      expiredAt: Date;
    }>;
  } = {},
): PrismaService {
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
    creditExpiry: {
      findMany: jest.fn().mockResolvedValue(options.creditExpiries ?? []),
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
            creditExpiry: {
              findMany: jest.fn().mockResolvedValue(
                options.creditExpiries ?? [],
              ),
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
