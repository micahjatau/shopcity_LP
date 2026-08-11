import { ConfigService } from '@nestjs/config';
import { FraudBehaviorService } from './fraud-behavior.service';
import type { PrismaService } from '../../database/prisma.service';

describe('FraudBehaviorService', () => {
  it('evaluates receipt behavioral rules from authoritative rows', async () => {
    const service = new FraudBehaviorService(
      prismaStub({
        receiptFindUnique: {
          id: 'receipt-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          cardId: 'card-1',
          customerId: 'customer-1',
          capturedBy: 'cashier-1',
          occurredAt: new Date('2026-08-10T10:00:00.000Z'),
          purchaseAmountKobo: 25_000_000n,
          normalizedPosReceiptNumber: 'POS-001',
          receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
          branch: { timezone: 'Africa/Lagos' },
        },
        queryRawResults: [
          [{ count: 6n }],
          [
            {
              cashierId: 'cashier-1',
              receiptCount: 6n,
              cashierValueKobo: 120_000_000n,
            },
            {
              cashierId: 'cashier-2',
              receiptCount: 6n,
              cashierValueKobo: 10_000_000n,
            },
          ],
          [{ roundedCount: 6n, sampleSize: 6n }],
        ],
      }),
      configService(),
    );

    const findings = await service.evaluateReceiptBehavior({
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
    });

    expect(findings.map((finding) => finding.ruleCode)).toEqual([
      'FR-CARD-001',
      'FR-CASH-001',
      'FR-ROUND-001',
    ]);
  });

  it('suppresses receipt behavior findings below thresholds', async () => {
    const service = new FraudBehaviorService(
      prismaStub({
        receiptFindUnique: {
          id: 'receipt-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          cardId: 'card-1',
          customerId: 'customer-1',
          capturedBy: 'cashier-1',
          occurredAt: new Date('2026-08-10T10:00:00.000Z'),
          purchaseAmountKobo: 500_000n,
          normalizedPosReceiptNumber: 'POS-001',
          receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
          branch: { timezone: 'Africa/Lagos' },
        },
        queryRawResults: [
          [{ count: 1n }],
          [],
          [{ roundedCount: 0n, sampleSize: 1n }],
        ],
      }),
      configService(),
    );

    const findings = await service.evaluateReceiptBehavior({
      tenantId: 'tenant-1',
      receiptId: 'receipt-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      cashierId: 'cashier-1',
      cardId: 'card-1',
      normalizedPosReceiptNumber: 'POS-001',
      receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
      purchaseAmountKobo: 500_000n,
      occurredAt: new Date('2026-08-10T10:00:00.000Z'),
    });

    expect(findings).toEqual([]);
  });

  it('evaluates lifecycle fraud rules from authoritative rows', async () => {
    const service = new FraudBehaviorService(
      prismaStub({
        cardFindUnique: {
          id: 'card-1',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          customer: { branchId: 'branch-1' },
        },
        userFindUnique: {
          id: 'user-1',
          tenantId: 'tenant-1',
          branch: { id: 'branch-1' },
        },
        cardCount: 3,
        auditLogCount: 5,
        reversalCount: 4,
      }),
      configService(),
    );

    const [cardFindings, reversalFindings, authFindings] = await Promise.all([
      service.evaluateCardReplacementBehavior({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        cardId: 'card-1',
        replacementCount: 0,
        windowStart: new Date('2026-08-01T00:00:00.000Z'),
        windowEnd: new Date('2026-08-31T00:00:00.000Z'),
      }),
      service.evaluateReversalBehavior({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        cashierId: 'cashier-1',
        reversalCount: 0,
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        windowEnd: new Date('2026-08-11T00:00:00.000Z'),
      }),
      service.evaluateAuthFailures({
        tenantId: 'tenant-1',
        userId: 'user-1',
        failureCount: 0,
        windowStart: new Date('2026-08-10T00:00:00.000Z'),
        windowEnd: new Date('2026-08-10T00:15:00.000Z'),
      }),
    ]);

    expect(cardFindings[0]?.ruleCode).toBe('FR-REPL-001');
    expect(reversalFindings[0]?.ruleCode).toBe('FR-REV-001');
    expect(authFindings[0]?.ruleCode).toBe('FR-AUTH-001');
  });
});

function configService(): ConfigService {
  return {
    get: (key: string) => {
      switch (key) {
        case 'PURCHASE_FLAG_THRESHOLD_KOBO':
          return 10_000_000;
        case 'PURCHASE_APPROVAL_THRESHOLD_KOBO':
          return 20_000_000;
        case 'REDEMPTION_APPROVAL_THRESHOLD_KOBO':
          return 500_000;
        case 'FRAUD_CARD_DAILY_COUNT_THRESHOLD':
          return 5;
        case 'FRAUD_CASHIER_MIN_SAMPLE_SIZE':
          return 5;
        case 'FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS':
          return 15000;
        case 'FRAUD_ROUNDED_VALUE_MIN_SAMPLE':
          return 5;
        case 'FRAUD_ROUNDED_VALUE_UNIT_KOBO':
          return 1000;
        case 'FRAUD_REVERSAL_COUNT_THRESHOLD':
          return 3;
        case 'FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD':
          return 3;
        case 'FRAUD_AUTH_FAILURE_COUNT_THRESHOLD':
          return 5;
        default:
          return undefined;
      }
    },
  } as unknown as ConfigService;
}

function prismaStub(overrides: {
  receiptFindUnique?: Record<string, unknown>;
  queryRawResults?: unknown[][];
  cardFindUnique?: Record<string, unknown>;
  userFindUnique?: Record<string, unknown>;
  cardCount?: number;
  auditLogCount?: number;
  reversalCount?: number;
}): PrismaService {
  const queryRaw = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(overrides.queryRawResults?.shift() ?? []),
    );

  return {
    receipt: {
      findUnique: jest
        .fn()
        .mockResolvedValue(overrides.receiptFindUnique ?? null),
    },
    card: {
      findUnique: jest.fn().mockResolvedValue(overrides.cardFindUnique ?? null),
      count: jest.fn().mockResolvedValue(overrides.cardCount ?? 0),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides.userFindUnique ?? null),
    },
    loyaltyLedgerEntry: {
      count: jest.fn().mockResolvedValue(overrides.reversalCount ?? 0),
    },
    auditLog: {
      count: jest.fn().mockResolvedValue(overrides.auditLogCount ?? 0),
    },
    $queryRaw: queryRaw,
  } as unknown as PrismaService;
}
