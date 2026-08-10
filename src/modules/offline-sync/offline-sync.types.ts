export type OfflineSyncRecordStatus =
  'CONFIRMED' | 'PENDING_APPROVAL' | 'REJECTED' | 'RETRYABLE';

export interface OfflineEarnBatchRecordInput {
  localId: string;
  idempotencyKey: string;
  cashierId: string;
  branchId: string;
  cardBarcode: string;
  receiptNumber: string;
  receiptWeekStart: string;
  purchaseAmountKobo: number;
  occurredAtLocal: string;
}

export interface OfflineEarnBatchRequest {
  deviceId: string;
  records: OfflineEarnBatchRecordInput[];
}

export interface OfflineEarnBatchRecordResult {
  localId: string;
  status: OfflineSyncRecordStatus;
  transactionId: string | null;
  approvalId: string | null;
  creditEarnedKobo: number | null;
  errorCode: string | null;
  retryable: boolean;
}

export interface OfflineEarnBatchResponse {
  deviceId: string;
  records: OfflineEarnBatchRecordResult[];
}

export type OfflineSyncAttemptResponseJson = {
  localId: string;
  status: OfflineSyncRecordStatus;
  transactionId: string | null;
  approvalId: string | null;
  creditEarnedKobo: number | null;
  errorCode: string | null;
  retryable: boolean;
};
