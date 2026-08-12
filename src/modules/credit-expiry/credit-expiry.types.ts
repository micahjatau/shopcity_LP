export interface ExpireDueCreditInput {
  now: Date;
  batchSize: number;
}

export interface ExpirySweepResult {
  examined: number;
  expiredLots: number;
  expiredAmountKobo: bigint;
}

export interface LockedDueCreditLot {
  id: string;
  tenantId: string;
  customerId: string;
  remainingAmountKobo: bigint;
  expiresAt: Date;
}
