'use client';

import { Check, Copy } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { formatReportMoney } from '../../lib/reports/supervisor-report-metrics';
import type { ReportProblem } from '../../lib/reports/report-errors';

export function CopyableChip({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <button
      type="button"
      className="report-copy-chip"
      onClick={() => void copyValue()}
      aria-label={`Copy ${label}: ${value}`}
      title={`Copy ${label}`}
    >
      <span>{label}</span>
      <code>{value}</code>
      {copied ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      <span className="report-sr-only" aria-live="polite">
        {copied
          ? `${label} copied`
          : copyError
            ? `Could not copy ${label}. Select the value manually.`
            : ''}
      </span>
    </button>
  );
}

export function ReportProblemNotice({
  problem,
  retryAfterSeconds = 0,
  onRetry,
}: Readonly<{
  problem: ReportProblem;
  retryAfterSeconds?: number;
  onRetry?: () => void;
}>) {
  const titleId = useId();
  return (
    <section
      className={`report-problem${problem.status === 403 ? ' report-problem--forbidden' : ''}${problem.status === 429 ? ' report-problem--limited' : ''}`}
      role="alert"
      aria-labelledby={titleId}
    >
      <div>
        <h3 id={titleId}>{problem.title}</h3>
        <p>{problem.detail}</p>
        {problem.status === 429 ? (
          <p className="report-problem__countdown" aria-live="polite">
            {retryAfterSeconds > 0
              ? `Try again in ${retryAfterSeconds} seconds.`
              : 'You can try again now.'}
          </p>
        ) : null}
      </div>
      <div className="report-problem__actions">
        {problem.requestId ? (
          <CopyableChip label="Reference" value={problem.requestId} />
        ) : null}
        {onRetry && retryAfterSeconds === 0 && problem.status !== 403 ? (
          <button
            className="report-problem__retry"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function formatReportTimestamp(
  value: string,
  timezone = 'Africa/Lagos',
): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(date);
}

export function formatReportBusinessDate(
  value: string,
  timezone = 'Africa/Lagos',
): string {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value;
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(new Date(`${day}T12:00:00Z`));
}

export function formatSupervisorReportFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    loyaltyPurchaseValueKobo: 'Loyalty purchase value',
    purchaseValueKobo: 'Purchase value',
    creditIssuedKobo: 'Credit issued',
    creditRedeemedKobo: 'Credit redeemed',
    creditExpiredKobo: 'Credit expired',
    outstandingLiabilityKobo: 'Outstanding credit',
    currentBalanceKobo: 'Current balance',
    endingBalanceKobo: 'Ending balance',
    confirmedKobo: 'Confirmed value',
    branchId: 'Branch ID',
    customerId: 'Customer ID',
    cashierId: 'Cashier ID',
  };
  return (
    labels[field] ??
    field
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (value) => value.toUpperCase())
  );
}

export function SupervisorReportValue({
  field,
  value,
}: Readonly<{ field: string; value: unknown }>) {
  if (value === null || value === undefined || value === '') {
    return <span className="report-value--missing">Not provided</span>;
  }

  if (Array.isArray(value)) {
    return value.length ? (
      <ul className="report-value__list">
        {value.map((item, index) => (
          <li key={`${field}-${index}`}>
            <SupervisorReportValue field={field} value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <span className="report-value--missing">No entries</span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, child]) => child !== null && child !== undefined && child !== '',
    );
    return entries.length ? (
      <dl className="report-value__definition-list">
        {entries.map(([key, child]) => (
          <div key={`${field}-${key}`}>
            <dt>{formatSupervisorReportFieldLabel(key)}</dt>
            <dd>
              <SupervisorReportValue field={key} value={child} />
            </dd>
          </div>
        ))}
      </dl>
    ) : (
      <span className="report-value--missing">No details provided</span>
    );
  }

  if (typeof value === 'number') {
    if (/kobo$/i.test(field) || /_kobo$/i.test(field)) {
      return (
        <>{formatReportMoney(Number.isSafeInteger(value) ? value : null)}</>
      );
    }
    return (
      <>
        {Number.isSafeInteger(value)
          ? new Intl.NumberFormat('en-NG').format(value)
          : String(value)}
      </>
    );
  }

  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>;

  const stringValue = String(value);
  if (/(?:Date$|^from$|^to$|^asOf$)/i.test(field)) {
    return <>{formatReportBusinessDate(stringValue)}</>;
  }
  if (/(?:At|Timestamp|GeneratedAt|OccurredAt)$/i.test(field)) {
    return <>{formatReportTimestamp(stringValue)}</>;
  }
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(stringValue)) {
    return <code className="report-value__identifier">{stringValue}</code>;
  }
  return <>{stringValue}</>;
}

export function ReportLiveMessage({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <p className="report-live-message" role="status" aria-live="polite">
      {children}
    </p>
  );
}
