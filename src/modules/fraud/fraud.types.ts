export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type FraudFlagStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type FraudSubjectType = 'RECEIPT' | 'LEDGER_ENTRY' | 'REDEMPTION';

export type FraudRuleCode =
  | 'FR-DUP-001'
  | 'FR-HV-001'
  | 'FR-HV-002'
  | 'FR-HV-003';

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

export interface FraudFlagDecisionInput {
  tenantId: string;
  flagId: string;
  actorId: string;
  reason: string;
}
