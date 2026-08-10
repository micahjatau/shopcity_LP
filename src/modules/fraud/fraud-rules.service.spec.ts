import { ConfigService } from '@nestjs/config';
import { FraudRulesService } from './fraud-rules.service';

describe('FraudRulesService', () => {
  it('emits high-value earn findings above both thresholds', () => {
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

    expect(findings.map((finding) => finding.ruleCode)).toEqual([
      'FR-HV-001',
      'FR-HV-002',
    ]);
    expect(findings[1]?.severity).toBe('HIGH');
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
