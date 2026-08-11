export type RedemptionSnapshotStatus =
  'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';

export type SmsSnapshotStatus =
  'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

export type ApprovalSnapshotStatus =
  'PENDING' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';

export function redemptionStatusAt(
  input: {
    requestedAt: Date;
    confirmedAt: Date | null;
    reversedAt: Date | null;
    status: string;
    expiresAt?: Date | null;
  },
  asOf: Date,
): RedemptionSnapshotStatus {
  if (input.requestedAt > asOf) {
    return 'PENDING_APPROVAL';
  }

  if (input.reversedAt && input.reversedAt <= asOf) {
    return 'REVERSED';
  }

  if (input.confirmedAt && input.confirmedAt <= asOf) {
    return 'CONFIRMED';
  }

  if (input.status === 'REJECTED') {
    return 'REJECTED';
  }

  if (input.status === 'EXPIRED') {
    return 'REJECTED';
  }

  if (input.expiresAt && input.expiresAt <= asOf) {
    return 'REJECTED';
  }

  return 'PENDING_APPROVAL';
}

export function smsStatusAt(
  input: {
    queuedAt: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    suppressedAt: Date | null;
    status: string;
  },
  asOf: Date,
): SmsSnapshotStatus {
  if (input.queuedAt > asOf) {
    return 'QUEUED';
  }

  if (input.suppressedAt && input.suppressedAt <= asOf) {
    return 'SUPPRESSED';
  }

  if (input.deliveredAt && input.deliveredAt <= asOf) {
    return 'DELIVERED';
  }

  if (input.failedAt && input.failedAt <= asOf) {
    return 'FAILED';
  }

  if (input.sentAt && input.sentAt <= asOf) {
    return 'SENT';
  }

  return 'QUEUED';
}

export function approvalStatusAt(
  input: {
    requestedAt: Date;
    decidedAt: Date | null;
    executedAt: Date | null;
    expiresAt: Date;
    status: string;
  },
  asOf: Date,
): ApprovalSnapshotStatus {
  if (input.requestedAt > asOf) {
    return 'PENDING';
  }

  if (input.executedAt && input.executedAt <= asOf) {
    return 'EXECUTED';
  }

  if (input.decidedAt && input.decidedAt <= asOf) {
    if (input.status === 'REJECTED') {
      return 'REJECTED';
    }

    return 'APPROVED';
  }

  if (input.expiresAt <= asOf) {
    return 'EXPIRED';
  }

  return 'PENDING';
}
