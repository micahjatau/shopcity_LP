import type { PrismaService } from '../../database/prisma.service';
import { FraudRulesService } from './fraud-rules.service';
import { FraudService } from './fraud.service';

type FraudFlagUpsertCall = {
  where: {
    tenantId_dedupeKey: {
      tenantId: string;
      dedupeKey: string;
    };
  };
  create: {
    ruleCode: string;
  };
};

describe('FraudService', () => {
  it('records duplicate receipt evidence and increments repeated deliveries', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub({
      receiptCount: 2,
      upsert,
    });
    const service = new FraudService(prisma, rulesStub());
    const input = receiptInput();

    expect(await service.evaluateReceipt(input)).toBe(3);
    expect(upsert).toHaveBeenCalledTimes(3);
    const calls = upsert.mock.calls as Array<[FraudFlagUpsertCall]>;
    expect(calls[0]?.[0].where.tenantId_dedupeKey).toEqual({
      tenantId: 'tenant-1',
      dedupeKey: 'FR-DUP-001:branch-1:POS-001:2026-08-10T00:00:00.000Z',
    });
    expect(calls[1]?.[0].create.ruleCode).toBe('FR-HV-001');
    expect(calls[2]?.[0].create.ruleCode).toBe('FR-HV-002');
  });

  it('records redemption evidence', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaStub({ upsert });
    const service = new FraudService(prisma, rulesStub());

    expect(
      await service.evaluateRedemption({
        tenantId: 'tenant-1',
        redemptionId: 'redemption-1',
        receiptId: 'receipt-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        cashierId: 'cashier-1',
        cardId: 'card-1',
        requestedAmountKobo: 600_000n,
        occurredAt: new Date('2026-08-10T10:00:00.000Z'),
      }),
    ).toBe(1);

    expect(upsert).toHaveBeenCalledTimes(1);
    const calls = upsert.mock.calls as Array<[FraudFlagUpsertCall]>;
    expect(calls[0]?.[0].create.ruleCode).toBe('FR-HV-003');
  });
});

function rulesStub() {
  return {
    evaluateReceipt: jest.fn().mockReturnValue([
      {
        ruleCode: 'FR-HV-001',
        severity: 'MEDIUM',
        dedupeKey: 'FR-HV-001:receipt-1',
        subjectType: 'RECEIPT',
        subjectId: 'receipt-1',
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        branchId: 'branch-1',
        cashierId: 'cashier-1',
        customerId: 'customer-1',
        receiptId: 'receipt-1',
        evidence: {},
      },
      {
        ruleCode: 'FR-HV-002',
        severity: 'HIGH',
        dedupeKey: 'FR-HV-002:receipt-1',
        subjectType: 'RECEIPT',
        subjectId: 'receipt-1',
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        branchId: 'branch-1',
        cashierId: 'cashier-1',
        customerId: 'customer-1',
        receiptId: 'receipt-1',
        evidence: {},
      },
    ]),
    evaluateRedemption: jest.fn().mockReturnValue([
      {
        ruleCode: 'FR-HV-003',
        severity: 'HIGH',
        dedupeKey: 'FR-HV-003:redemption-1',
        subjectType: 'REDEMPTION',
        subjectId: 'redemption-1',
        windowStart: new Date('2026-08-10T10:00:00.000Z'),
        branchId: 'branch-1',
        cashierId: 'cashier-1',
        customerId: 'customer-1',
        receiptId: 'receipt-1',
        redemptionId: 'redemption-1',
        evidence: {},
      },
    ]),
  } as unknown as FraudRulesService;
}

function prismaStub(overrides: {
  receiptCount?: number;
  upsert: jest.Mock;
}): PrismaService {
  return {
    receipt: {
      count: jest.fn().mockResolvedValue(overrides.receiptCount ?? 0),
    },
    fraudFlag: {
      upsert: overrides.upsert,
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        fraudFlag: {
          upsert: overrides.upsert,
        },
      }),
    ),
  } as unknown as PrismaService;
}

function receiptInput() {
  return {
    tenantId: 'tenant-1',
    receiptId: 'receipt-1',
    branchId: 'branch-1',
    customerId: 'customer-1',
    cashierId: 'cashier-1',
    cardId: 'card-1',
    normalizedPosReceiptNumber: 'POS-001',
    receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
    purchaseAmountKobo: 25_000_000n,
    occurredAt: new Date('2026-08-10T10:00:00.000Z'),
  };
}
