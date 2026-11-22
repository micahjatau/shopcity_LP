import { ConfigService } from '@nestjs/config';
import { FraudRulesService } from './fraud-rules.service';

describe('FraudRulesService', () => {
  it('emits one high-value finding above the approval threshold', () => {
    const service = new FraudRulesService(configService());
    const findings = service.evaluateReceipt({
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

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('FR-HV-002');
    expect(findings[0]?.severity).toBe('HIGH');
  });

  it('emits one medium finding when purchase exceeds only the flag threshold', () => {
    const service = new FraudRulesService(configService());
    const findings = service.evaluateReceipt({
      tenantId: 'tenant-1',
      receiptId: 'receipt-flag-only',
      branchId: 'branch-1',
      customerId: 'customer-1',
      cashierId: 'cashier-1',
      cardId: 'card-1',
      normalizedPosReceiptNumber: 'POS-002',
      receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
      purchaseAmountKobo: 15_000_000n,
      occurredAt: new Date('2026-08-10T10:00:00.000Z'),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('FR-HV-001');
    expect(findings[0]?.severity).toBe('MEDIUM');
  });

  it('compares branch thresholds as exact integer kobo', () => {
    const threshold = 9_007_199_254_740_993n;
    const findings = new FraudRulesService(configService()).evaluateReceipt(
      {
        tenantId: 'tenant-1',
        receiptId: 'receipt-large-amount',
        branchId: 'branch-1',
        customerId: 'customer-1',
        cashierId: 'cashier-1',
        cardId: 'card-1',
        normalizedPosReceiptNumber: 'POS-LARGE',
        receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
        purchaseAmountKobo: threshold + 1n,
        occurredAt: new Date('2026-08-10T10:00:00.000Z'),
      },
      {
        purchaseFlagThresholdKobo: threshold - 1n,
        purchaseApprovalThresholdKobo: threshold,
        redemptionApprovalThresholdKobo: 500_000n,
      },
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('FR-HV-002');
    expect(findings[0]?.evidence.thresholdKobo).toBe(threshold.toString());
  });

  it('emits high-value redemption findings above the configured threshold', () => {
    const service = new FraudRulesService(configService());
    const findings = service.evaluateRedemption({
      tenantId: 'tenant-1',
      redemptionId: 'redemption-1',
      receiptId: 'receipt-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      cashierId: 'cashier-1',
      cardId: 'card-1',
      requestedAmountKobo: 600_000n,
      occurredAt: new Date('2026-08-10T10:00:00.000Z'),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('FR-HV-003');
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
        default:
          return undefined;
      }
    },
  } as unknown as ConfigService;
}
