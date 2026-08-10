import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  FraudFinding,
  FraudReceiptInput,
  FraudRedemptionInput,
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

  private dedupeKey(ruleCode: string, subjectId: string): string {
    return `${ruleCode}:${subjectId}`;
  }
}
