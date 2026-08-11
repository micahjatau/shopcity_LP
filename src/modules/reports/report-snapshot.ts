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
    rejectedAt?: Date | null;
    reversedAt: Date | null;
    expiresAt?: Date | null;
  },
  asOf: Date,
): RedemptionSnapshotStatus {
  if (input.requestedAt > asOf) {
    return 'PENDING_APPROVAL';
  }

  const transitions: Array<{
    status: RedemptionSnapshotStatus;
    occurredAt: Date;
  }> = [{ status: 'PENDING_APPROVAL', occurredAt: input.requestedAt }];

  if (input.confirmedAt) {
    transitions.push({ status: 'CONFIRMED', occurredAt: input.confirmedAt });
  }

  if (input.rejectedAt) {
    transitions.push({ status: 'REJECTED', occurredAt: input.rejectedAt });
  }

  if (input.reversedAt) {
    transitions.push({ status: 'REVERSED', occurredAt: input.reversedAt });
  }

  if (input.expiresAt) {
    transitions.push({ status: 'REJECTED', occurredAt: input.expiresAt });
  }

  return latestTransitionAt(transitions, asOf).status;
}

export function smsStatusAt(
  input: {
    queuedAt: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    suppressedAt: Date | null;
  },
  asOf: Date,
): SmsSnapshotStatus {
  if (input.queuedAt > asOf) {
    return 'QUEUED';
  }

  const transitions: Array<{ status: SmsSnapshotStatus; occurredAt: Date }> = [
    { status: 'QUEUED', occurredAt: input.queuedAt },
  ];

  if (input.sentAt) {
    transitions.push({ status: 'SENT', occurredAt: input.sentAt });
  }

  if (input.deliveredAt) {
    transitions.push({ status: 'DELIVERED', occurredAt: input.deliveredAt });
  }

  if (input.failedAt) {
    transitions.push({ status: 'FAILED', occurredAt: input.failedAt });
  }

  if (input.suppressedAt) {
    transitions.push({ status: 'SUPPRESSED', occurredAt: input.suppressedAt });
  }

  return latestTransitionAt(transitions, asOf).status;
}

function latestTransitionAt<T extends string>(
  transitions: Array<{ status: T; occurredAt: Date }>,
  asOf: Date,
): { status: T; occurredAt: Date } {
  const latest = transitions
    .filter((transition) => transition.occurredAt <= asOf)
    .sort(
      (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
    )[0];

  if (!latest) {
    return transitions[0];
  }

  return latest;
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
