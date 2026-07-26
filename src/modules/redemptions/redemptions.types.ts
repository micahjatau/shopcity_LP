export interface RedemptionPolicyInput {
  requestedAmountKobo: bigint;
  basketAmountKobo: bigint;
  activeBalanceKobo: bigint;
}

export interface RedemptionPolicyResult {
  minimumRedemptionKobo: bigint;
  basketCapKobo: bigint;
  maximumAllowedKobo: bigint;
  approvalThresholdKobo: bigint;
  requiresApproval: boolean;
  policyVersion: string;
}
