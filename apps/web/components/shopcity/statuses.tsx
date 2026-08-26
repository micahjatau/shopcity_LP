'use client';

import { StatusBadge } from './status-badge';

export function TransactionStateBadge({ state }: { state: string }) {
  const map: Record<
    string,
    {
      label: string;
      tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
    }
  > = {
    CONFIRMED: { label: 'Confirmed', tone: 'success' },
    PENDING_APPROVAL: { label: 'Awaiting approval', tone: 'warning' },
    REJECTED: { label: 'Rejected', tone: 'danger' },
    RETRYABLE: { label: 'Retry required', tone: 'warning' },
    CAPTURED: { label: 'Recorded', tone: 'info' },
  };

  const entry = map[state] ?? { label: state, tone: 'neutral' };
  return <StatusBadge label={entry.label} tone={entry.tone} />;
}

export function ApprovalBadge({ state }: { state: string }) {
  return (
    <StatusBadge
      label={
        state === 'APPROVED'
          ? 'Approved'
          : state === 'REJECTED'
            ? 'Rejected'
            : 'Awaiting decision'
      }
      tone={
        state === 'APPROVED'
          ? 'success'
          : state === 'REJECTED'
            ? 'danger'
            : 'warning'
      }
    />
  );
}

export function FraudSeverityBadge({ severity }: { severity: string }) {
  const map: Record<
    string,
    'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
  > = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger',
  };
  return (
    <StatusBadge
      label={`${severity[0]}${severity.slice(1).toLowerCase()}`}
      tone={map[severity] ?? 'neutral'}
    />
  );
}

export function SmsStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    {
      label: string;
      tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
    }
  > = {
    QUEUED: { label: 'Queued', tone: 'neutral' },
    SENT: { label: 'Sent', tone: 'info' },
    DELIVERED: { label: 'Delivered', tone: 'success' },
    FAILED: { label: 'Delivery failed', tone: 'danger' },
    SUPPRESSED: { label: 'Not sent', tone: 'neutral' },
  };
  const entry = map[status] ?? { label: status, tone: 'neutral' };
  return <StatusBadge label={entry.label} tone={entry.tone} />;
}
