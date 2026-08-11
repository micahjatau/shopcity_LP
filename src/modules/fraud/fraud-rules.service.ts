import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthFailureRuleInput,
  CardFrequencyRuleInput,
  CardReplacementRuleInput,
  CashierAnomalyRuleInput,
  FraudFinding,
  FraudReceiptInput,
  FraudRedemptionInput,
  ReversalFrequencyRuleInput,
  RoundedValueRuleInput,
} from './fraud.types';

const DEFAULT_PURCHASE_FLAG_THRESHOLD_KOBO = 10_000_000;
const DEFAULT_PURCHASE_APPROVAL_THRESHOLD_KOBO = 20_000_000;
const DEFAULT_REDEMPTION_APPROVAL_THRESHOLD_KOBO = 500_000;

@Injectable()
export class FraudRulesService {
  constructor(private readonly configService: ConfigService) {}

  evaluateReceipt(input: FraudReceiptInput): FraudFinding[] {
    const findings: FraudFinding[] = [];
    const flagThresholdKobo = this.purchaseFlagThresholdKobo();
    const approvalThresholdKobo = this.purchaseApprovalThresholdKobo();

    if (input.purchaseAmountKobo > BigInt(flagThresholdKobo)) {
      findings.push({
        ruleCode: 'FR-HV-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey('FR-HV-001', input.receiptId),
        subjectType: 'RECEIPT',
        subjectId: input.receiptId,
        windowStart: input.receiptWeekStart,
        branchId: input.branchId,
        cashierId: input.cashierId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        evidence: {
          purchaseAmountKobo: input.purchaseAmountKobo.toString(),
          thresholdKobo: flagThresholdKobo,
          normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
          occurredAt: input.occurredAt.toISOString(),
        },
      });
    }

    if (input.purchaseAmountKobo > BigInt(approvalThresholdKobo)) {
      findings.push({
        ruleCode: 'FR-HV-002',
        severity: 'HIGH',
        dedupeKey: this.dedupeKey('FR-HV-002', input.receiptId),
        subjectType: 'RECEIPT',
        subjectId: input.receiptId,
        windowStart: input.receiptWeekStart,
        branchId: input.branchId,
        cashierId: input.cashierId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        evidence: {
          purchaseAmountKobo: input.purchaseAmountKobo.toString(),
          thresholdKobo: approvalThresholdKobo,
          normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
          occurredAt: input.occurredAt.toISOString(),
        },
      });
    }

    return findings;
  }

  evaluateRedemption(input: FraudRedemptionInput): FraudFinding[] {
    const approvalThresholdKobo = this.redemptionApprovalThresholdKobo();

    if (input.requestedAmountKobo <= BigInt(approvalThresholdKobo)) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-HV-003',
        severity: 'HIGH',
        dedupeKey: this.dedupeKey('FR-HV-003', input.redemptionId),
        subjectType: 'REDEMPTION',
        subjectId: input.redemptionId,
        windowStart: input.occurredAt,
        branchId: input.branchId,
        cashierId: input.cashierId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        redemptionId: input.redemptionId,
        evidence: {
          requestedAmountKobo: input.requestedAmountKobo.toString(),
          thresholdKobo: approvalThresholdKobo,
          occurredAt: input.occurredAt.toISOString(),
        },
      },
    ];
  }

  evaluateCardFrequency(input: CardFrequencyRuleInput): FraudFinding[] {
    const threshold = this.cardDailyCountThreshold();
    if (input.countInLocalDay < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-CARD-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey('FR-CARD-001', input.cardId),
        subjectType: 'RECEIPT',
        subjectId: input.cardId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        evidence: {
          countInLocalDay: input.countInLocalDay,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  evaluateCashierAnomaly(input: CashierAnomalyRuleInput): FraudFinding[] {
    const minSampleSize = this.cashierMinSampleSize();
    if (input.sampleSize < minSampleSize) {
      return [];
    }

    const ratioBps =
      input.peerMedianValueKobo === 0n
        ? 0n
        : (input.cashierValueKobo * 10_000n) / input.peerMedianValueKobo;

    if (ratioBps <= BigInt(this.cashierValueRatioThresholdBps())) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-CASH-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-CASH-001',
          `${input.branchId}:${input.cashierId}:${input.windowStart.toISOString()}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.cashierId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        evidence: {
          sampleSize: input.sampleSize,
          cashierCount: input.cashierCount,
          cashierValueKobo: input.cashierValueKobo.toString(),
          peerMedianValueKobo: input.peerMedianValueKobo.toString(),
          ratioBps: ratioBps.toString(),
          thresholdBps: this.cashierValueRatioThresholdBps(),
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  evaluateRoundedValues(input: RoundedValueRuleInput): FraudFinding[] {
    const minSampleSize = this.roundedValueMinSample();
    if (
      input.sampleSize < minSampleSize ||
      input.roundedCount < minSampleSize
    ) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-ROUND-001',
        severity: 'LOW',
        dedupeKey: this.dedupeKey(
          'FR-ROUND-001',
          `${input.branchId}:${input.cashierId}:${input.windowStart.toISOString()}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.receiptId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        receiptId: input.receiptId,
        evidence: {
          roundedCount: input.roundedCount,
          sampleSize: input.sampleSize,
          unitKobo: input.unitKobo.toString(),
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  evaluateReversalFrequency(input: ReversalFrequencyRuleInput): FraudFinding[] {
    const threshold = this.reversalCountThreshold();
    if (input.reversalCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-REV-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-REV-001',
          `${input.branchId}:${input.cashierId}:${input.windowStart.toISOString()}`,
        ),
        subjectType: 'LEDGER_ENTRY',
        subjectId: input.cashierId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        evidence: {
          reversalCount: input.reversalCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  evaluateCardReplacementFrequency(
    input: CardReplacementRuleInput,
  ): FraudFinding[] {
    const threshold = this.cardReplacementCountThreshold();
    if (input.replacementCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-REPL-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-REPL-001',
          `${input.customerId}:${input.windowStart.toISOString()}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.cardId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        customerId: input.customerId,
        receiptId: input.cardId,
        evidence: {
          replacementCount: input.replacementCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  evaluateAuthFailures(input: AuthFailureRuleInput): FraudFinding[] {
    const threshold = this.authFailureCountThreshold();
    if (input.failureCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-AUTH-001',
        severity: 'HIGH',
        dedupeKey: this.dedupeKey(
          'FR-AUTH-001',
          `${input.userId}:${input.windowStart.toISOString()}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.userId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        evidence: {
          failureCount: input.failureCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private purchaseFlagThresholdKobo(): number {
    return (
      this.configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ??
      DEFAULT_PURCHASE_FLAG_THRESHOLD_KOBO
    );
  }

  private purchaseApprovalThresholdKobo(): number {
    return (
      this.configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
      DEFAULT_PURCHASE_APPROVAL_THRESHOLD_KOBO
    );
  }

  private redemptionApprovalThresholdKobo(): number {
    return (
      this.configService.get<number>('REDEMPTION_APPROVAL_THRESHOLD_KOBO') ??
      DEFAULT_REDEMPTION_APPROVAL_THRESHOLD_KOBO
    );
  }

  private cardDailyCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_CARD_DAILY_COUNT_THRESHOLD') ?? 5
    );
  }

  private cashierMinSampleSize(): number {
    return this.configService.get<number>('FRAUD_CASHIER_MIN_SAMPLE_SIZE') ?? 5;
  }

  private cashierValueRatioThresholdBps(): number {
    return (
      this.configService.get<number>(
        'FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS',
      ) ?? 15000
    );
  }

  private roundedValueMinSample(): number {
    return (
      this.configService.get<number>('FRAUD_ROUNDED_VALUE_MIN_SAMPLE') ?? 5
    );
  }

  private roundedValueUnitKobo(): number {
    return (
      this.configService.get<number>('FRAUD_ROUNDED_VALUE_UNIT_KOBO') ?? 1000
    );
  }

  private reversalCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_REVERSAL_COUNT_THRESHOLD') ?? 3
    );
  }

  private cardReplacementCountThreshold(): number {
    return (
      this.configService.get<number>(
        'FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD',
      ) ?? 3
    );
  }

  private authFailureCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_AUTH_FAILURE_COUNT_THRESHOLD') ?? 5
    );
  }

  private dedupeKey(ruleCode: string, subjectId: string): string {
    return `${ruleCode}:${subjectId}`;
  }
}
