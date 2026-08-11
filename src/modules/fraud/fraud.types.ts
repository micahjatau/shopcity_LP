export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type FraudFlagStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type FraudSubjectType = 'RECEIPT' | 'LEDGER_ENTRY' | 'REDEMPTION';

export type FraudRuleCode =
  | 'FR-DUP-001'
  | 'FR-HV-001'
  | 'FR-HV-002'
  | 'FR-HV-003'
  | 'FR-CARD-001'
  | 'FR-CASH-001'
  | 'FR-ROUND-001'
  | 'FR-REV-001'
  | 'FR-REPL-001'
  | 'FR-AUTH-001';

export interface FraudFinding {
  ruleCode: FraudRuleCode;
  severity: FraudSeverity;
  dedupeKey: string;
  subjectType: FraudSubjectType;
  subjectId: string;
  windowStart: Date;
  windowEnd?: Date | null;
  branchId?: string | null;
  cashierId?: string | null;
  customerId?: string | null;
  receiptId?: string | null;
  ledgerEntryId?: string | null;
  redemptionId?: string | null;
  evidence: Record<string, unknown>;
}

export interface FraudReceiptInput {
  tenantId: string;
  receiptId: string;
  branchId: string;
  customerId: string;
  cashierId: string;
  cardId: string;
  normalizedPosReceiptNumber: string;
  receiptWeekStart: Date;
  purchaseAmountKobo: bigint;
  occurredAt: Date;
}

export interface FraudRedemptionInput {
  tenantId: string;
  redemptionId: string;
  receiptId: string;
  branchId: string;
  customerId: string;
  cashierId: string;
  cardId: string;
  requestedAmountKobo: bigint;
  occurredAt: Date;
}

export interface CardFrequencyRuleInput {
  tenantId: string;
  branchId: string;
  cardId: string;
  customerId: string;
  receiptId: string;
  countInLocalDay: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface CashierAnomalyRuleInput {
  tenantId: string;
  branchId: string;
  cashierId: string;
  cashierCount: number;
  cashierValueKobo: bigint;
  peerMedianValueKobo: bigint;
  sampleSize: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface RoundedValueRuleInput {
  tenantId: string;
  branchId: string;
  cashierId: string;
  receiptId: string;
  roundedCount: number;
  sampleSize: number;
  unitKobo: bigint;
  windowStart: Date;
  windowEnd: Date;
}

export interface ReversalFrequencyRuleInput {
  tenantId: string;
  branchId: string;
  cashierId: string;
  reversalCount: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface CardReplacementRuleInput {
  tenantId: string;
  branchId: string;
  customerId: string;
  cardId: string;
  replacementCount: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface AuthFailureRuleInput {
  tenantId: string;
  userId: string;
  failureCount: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface FraudFlagDecisionInput {
  tenantId: string;
  flagId: string;
  actorId: string;
  reason: string;
}
