'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { reportsControllerGetPilotOperationsSummaryV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { StatusBadge } from '../shopcity';
import { AdminOperationsHealthTrend } from './admin-operations-health-trend';

const routeLinks = [
  ['/admin/operations', 'Admin operations'],
  ['/admin/reports', 'Admin reports'],
  ['/supervisor', 'Supervisor'],
  ['/supervisor/reports', 'Supervisor reports'],
] as const;

type PilotHealthPanelProps = {
  compact?: boolean;
  cardStyleVariant?: 'default' | 'adminOverview';
};

type PilotSummary = {
  generatedAt?: string;
  release?: {
    version?: string;
    sha?: string;
    sentryConfigured?: boolean;
  };
  outbox?: { backlogCount?: number; staleCount?: number };
  sms?: { failedCount?: number };
  offlineSync?: { failureCount?: number };
  fraud?: { openCount?: number };
  reports?: { staleCount?: number };
  reconciliation?: { healthy?: boolean; mismatchCount?: number };
};

type OperationalAttention = {
  active: string[];
  unavailable: string[];
};

function isNonNegativeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function formatGeneratedAt(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
    timeZoneName: 'short',
  }).format(date);
}

function summarizeOperationalAttention(
  summary: PilotSummary,
  adminOverviewCopy = false,
): OperationalAttention {
  const active: string[] = [];
  const unavailable: string[] = [];
  const addCount = (
    value: unknown,
    unavailableLabel: string,
    describe: (count: number) => string,
  ) => {
    if (!isNonNegativeCount(value)) {
      unavailable.push(unavailableLabel);
      return;
    }
    if (value > 0) active.push(describe(value));
  };

  addCount(
    summary.outbox?.backlogCount,
    adminOverviewCopy ? 'pending events' : 'outbox backlog',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 system event is waiting'
          : `${count} system events are waiting`
        : count === 1
          ? '1 pending outbox event'
          : `${count} pending outbox events`,
  );
  addCount(
    summary.outbox?.staleCount,
    adminOverviewCopy ? 'overdue events' : 'stale outbox count',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 system event is overdue'
          : `${count} system events are overdue`
        : count === 1
          ? '1 stale outbox event'
          : `${count} stale outbox events`,
  );
  addCount(
    summary.sms?.failedCount,
    adminOverviewCopy ? 'SMS delivery' : 'SMS failures',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 SMS message failed'
          : `${count} SMS messages failed`
        : count === 1
          ? '1 failed SMS message'
          : `${count} failed SMS messages`,
  );
  addCount(
    summary.offlineSync?.failureCount,
    adminOverviewCopy ? 'device sync' : 'offline sync failures',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 device sync failed'
          : `${count} device syncs failed`
        : count === 1
          ? '1 offline sync failure'
          : `${count} offline sync failures`,
  );
  addCount(
    summary.fraud?.openCount,
    adminOverviewCopy ? 'fraud alerts' : 'open fraud count',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 fraud alert needs review'
          : `${count} fraud alerts need review`
        : count === 1
          ? '1 open fraud flag'
          : `${count} open fraud flags`,
  );
  addCount(
    summary.reports?.staleCount,
    adminOverviewCopy ? 'report updates' : 'stale reports',
    (count) =>
      adminOverviewCopy
        ? count === 1
          ? '1 report needs an update'
          : `${count} reports need an update`
        : count === 1
          ? '1 stale report materialization'
          : `${count} stale report materializations`,
  );

  const mismatchCount = summary.reconciliation?.mismatchCount;
  if (isNonNegativeCount(mismatchCount)) {
    if (mismatchCount > 0) {
      active.push(
        adminOverviewCopy
          ? mismatchCount === 1
            ? '1 financial record mismatch needs review'
            : `${mismatchCount} financial record mismatches need review`
          : mismatchCount === 1
            ? '1 reconciliation mismatch'
            : `${mismatchCount} reconciliation mismatches`,
      );
    } else if (summary.reconciliation?.healthy === false) {
      active.push(
        adminOverviewCopy
          ? 'Financial records need review'
          : 'Reconciliation requires review',
      );
    }
  } else {
    unavailable.push(
      adminOverviewCopy
        ? 'financial record mismatches'
        : 'reconciliation mismatch count',
    );
    if (summary.reconciliation?.healthy === false) {
      active.push(
        adminOverviewCopy
          ? 'Financial records need review'
          : 'Reconciliation requires review',
      );
    }
  }
  if (typeof summary.reconciliation?.healthy !== 'boolean') {
    unavailable.push(
      adminOverviewCopy ? 'financial record status' : 'reconciliation status',
    );
  }

  return { active, unavailable: [...new Set(unavailable)] };
}

function getReleaseMetadata(release: PilotSummary['release']): string[] {
  if (!release) return [];

  const metadata: string[] = [];
  if (typeof release.version === 'string' && release.version.trim()) {
    metadata.push(`Version ${release.version.trim()}`);
  }
  if (typeof release.sha === 'string' && release.sha.trim()) {
    metadata.push(`Build ${release.sha.trim().slice(0, 7)}`);
  }
  if (typeof release.sentryConfigured === 'boolean') {
    metadata.push(
      `Error monitoring ${release.sentryConfigured ? 'on' : 'off'}`,
    );
  }
  return metadata;
}

export function PilotHealthPanel({
  compact = false,
  cardStyleVariant = 'default',
}: PilotHealthPanelProps = {}) {
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [message, setMessage] = useState(
    cardStyleVariant === 'adminOverview'
      ? 'Loading system health…'
      : 'Loading pilot health…',
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await reportsControllerGetPilotOperationsSummaryV1(
          createApiRequest({ csrf: true }),
        );
        if (ignore) return;

        if (response.status === 200) {
          setSummary(response.data.data);
          setMessage(
            cardStyleVariant === 'adminOverview'
              ? 'System health loaded.'
              : 'Pilot health loaded from live backend data.',
          );
          return;
        }

        setSummary(null);
        setMessage(
          cardStyleVariant === 'adminOverview'
            ? `System health unavailable (HTTP ${response.status}).`
            : `Pilot health unavailable (${response.status}).`,
        );
      } catch {
        if (!ignore) {
          setSummary(null);
          setMessage(
            cardStyleVariant === 'adminOverview'
              ? 'System health unavailable.'
              : 'Pilot health unavailable.',
          );
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [cardStyleVariant]);

  const reconciliationHealthy = summary?.reconciliation?.healthy === true;
  const outbox = summary?.outbox ?? {};
  const sms = summary?.sms ?? {};
  const offlineSync = summary?.offlineSync ?? {};
  const fraud = summary?.fraud ?? {};
  const reports = summary?.reports ?? {};
  const adminOverviewCopy = cardStyleVariant === 'adminOverview';

  const items = useMemo(
    () =>
      summary
        ? [
            {
              label: adminOverviewCopy ? 'Pending events' : 'Outbox backlog',
              value: outbox.backlogCount ?? '—',
              tone:
                (outbox.backlogCount ?? 0) > 0 || (outbox.staleCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (outbox.staleCount ?? 0) > 0
                  ? adminOverviewCopy
                    ? `${outbox.staleCount} events are overdue`
                    : `${outbox.staleCount} stale`
                  : adminOverviewCopy
                    ? 'No events waiting'
                    : 'No backlog detected',
            },
            {
              label: adminOverviewCopy ? 'SMS delivery' : 'SMS failures',
              value: sms.failedCount ?? '—',
              tone:
                (sms.failedCount ?? 0) > 0
                  ? ('danger' as const)
                  : ('success' as const),
              detail:
                (sms.failedCount ?? 0) > 0
                  ? adminOverviewCopy
                    ? 'Check SMS delivery'
                    : 'Investigate SMS delivery'
                  : adminOverviewCopy
                    ? 'No failed messages'
                    : 'Delivery queue clear',
            },
            {
              label: adminOverviewCopy
                ? 'Sync issues'
                : 'Offline sync failures',
              value: offlineSync.failureCount ?? '—',
              tone:
                (offlineSync.failureCount ?? 0) > 0
                  ? ('danger' as const)
                  : ('success' as const),
              detail:
                (offlineSync.failureCount ?? 0) > 0
                  ? adminOverviewCopy
                    ? `${offlineSync.failureCount} sync failures`
                    : `${offlineSync.failureCount} failed`
                  : adminOverviewCopy
                    ? 'No sync issues'
                    : 'No offline backlog',
            },
            {
              label: adminOverviewCopy ? 'Open fraud alerts' : 'Fraud open',
              value: fraud.openCount ?? '—',
              tone:
                (fraud.openCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (fraud.openCount ?? 0) > 0
                  ? adminOverviewCopy
                    ? 'Alerts need review'
                    : 'Open fraud cases need review'
                  : 'No open fraud cases',
            },
            {
              label: adminOverviewCopy
                ? 'Reports to refresh'
                : 'Report freshness',
              value: reports.staleCount ?? '—',
              tone:
                (reports.staleCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (reports.staleCount ?? 0) > 0
                  ? adminOverviewCopy
                    ? `${reports.staleCount} need an update`
                    : `${reports.staleCount} stale`
                  : adminOverviewCopy
                    ? 'Reports are current'
                    : 'No freshness warnings',
            },
            {
              label: adminOverviewCopy ? 'Financial records' : 'Reconciliation',
              value:
                typeof summary.reconciliation?.mismatchCount === 'number'
                  ? summary.reconciliation.mismatchCount
                  : '—',
              tone: reconciliationHealthy
                ? ('success' as const)
                : ('danger' as const),
              detail: reconciliationHealthy
                ? adminOverviewCopy
                  ? 'Records match'
                  : 'Ledger and operational signals are aligned'
                : adminOverviewCopy
                  ? 'Records do not match; review needed'
                  : 'Ledger mismatch requires review',
            },
          ]
        : [],
    [
      fraud.openCount,
      offlineSync.failureCount,
      outbox.backlogCount,
      outbox.staleCount,
      reconciliationHealthy,
      reports.staleCount,
      sms.failedCount,
      summary,
      adminOverviewCopy,
    ],
  );

  const attention = summary
    ? summarizeOperationalAttention(summary, adminOverviewCopy)
    : null;
  const lastChecked = summary ? formatGeneratedAt(summary.generatedAt) : null;
  const releaseMetadata = summary ? getReleaseMetadata(summary.release) : [];

  const overallTone = useMemo(() => {
    if (!summary) return 'neutral' as const;
    if (
      !reconciliationHealthy ||
      (outbox.backlogCount ?? 0) > 0 ||
      (sms.failedCount ?? 0) > 0 ||
      (offlineSync.failureCount ?? 0) > 0
    ) {
      return 'warning' as const;
    }
    if ((reports.staleCount ?? 0) > 0) return 'info' as const;
    return 'success' as const;
  }, [
    offlineSync.failureCount,
    outbox.backlogCount,
    reconciliationHealthy,
    reports.staleCount,
    sms.failedCount,
    summary,
  ]);

  return (
    <section
      style={
        cardStyleVariant === 'adminOverview'
          ? adminOverviewPanelCardStyle
          : compact
            ? compactCardStyle
            : cardStyle
      }
    >
      <header
        style={{
          display: 'grid',
          gap: compact ? 'var(--sc-spacing-1)' : 'var(--sc-spacing-2)',
        }}
      >
        {cardStyleVariant === 'adminOverview' ? null : (
          <div
            style={{
              display: 'flex',
              gap: 'var(--sc-spacing-3)',
              flexWrap: 'wrap',
            }}
          >
            <StatusBadge
              label={summary ? 'Live' : 'Loading'}
              tone={overallTone}
            />
            {summary?.reconciliation ? (
              <StatusBadge
                label={reconciliationHealthy ? 'Reconciled' : 'Mismatch'}
                tone={reconciliationHealthy ? 'success' : 'danger'}
              />
            ) : null}
          </div>
        )}
        <h2 style={{ margin: 0 }}>
          {adminOverviewCopy ? 'System health' : 'Pilot health'}
        </h2>
        <p
          style={
            cardStyleVariant === 'adminOverview'
              ? adminOverviewPanelSubtitleStyle
              : {
                  margin: 'var(--sc-spacing-1) 0 0',
                  color: 'var(--sc-color-semantic-textSecondary)',
                }
          }
        >
          {cardStyleVariant === 'adminOverview' && lastChecked && summary ? (
            <>
              Last checked:{' '}
              <time dateTime={summary.generatedAt}>{lastChecked}</time>
            </>
          ) : (
            message
          )}
        </p>
      </header>

      {cardStyleVariant === 'adminOverview' && attention ? (
        <aside
          aria-label="Operational attention"
          aria-live="polite"
          style={
            attention.active.length > 0
              ? adminOverviewAttentionWarningStyle
              : adminOverviewAttentionStyle
          }
        >
          <h3 style={adminOverviewAttentionHeadingStyle}>
            {attention.active.length > 0
              ? 'Needs attention'
              : adminOverviewCopy
                ? attention.unavailable.length > 0
                  ? 'Status unavailable'
                  : 'All clear'
                : 'Operational attention'}
          </h3>
          {attention.active.length > 0 ? (
            <ul style={adminOverviewAttentionListStyle}>
              {attention.active.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : attention.unavailable.length === 0 ? (
            <p style={adminOverviewCardSubtextStyle}>
              {adminOverviewCopy
                ? 'No active issues.'
                : 'No active operational alerts.'}
            </p>
          ) : null}
          {attention.unavailable.length > 0 ? (
            <p style={adminOverviewCardSubtextStyle}>
              {adminOverviewCopy ? "Couldn't check: " : 'Unable to assess: '}
              {attention.unavailable.join(', ')}.
            </p>
          ) : null}
        </aside>
      ) : null}

      {compact ? null : (
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={routeLink}>
              {label}
            </Link>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gap: compact ? 'var(--sc-spacing-2)' : 'var(--sc-spacing-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {items.length === 0 ? (
          <div style={compact ? compactEmptyStateStyle : emptyStateStyle}>
            <strong>
              {adminOverviewCopy
                ? 'Waiting for system health data'
                : 'Waiting for live operations data'}
            </strong>
            <p
              style={
                cardStyleVariant === 'adminOverview'
                  ? adminOverviewCardSubtextStyle
                  : muted
              }
            >
              {adminOverviewCopy
                ? 'Health details will appear when available.'
                : 'Health, queue, and report signals will appear once the backend responds.'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.label}
              style={
                cardStyleVariant === 'adminOverview'
                  ? adminOverviewMetricCardStyle
                  : compact
                    ? compactMetricCardStyle
                    : metricCardStyle
              }
            >
              <p
                style={{
                  margin: 0,
                  color: 'var(--sc-color-semantic-textSecondary)',
                }}
              >
                {item.label}
              </p>
              <div style={metricRow}>
                <strong>{String(item.value)}</strong>
                {cardStyleVariant === 'adminOverview' ? null : (
                  <StatusBadge
                    label={
                      item.tone === 'warning'
                        ? 'Review'
                        : item.tone === 'danger'
                          ? 'Unhealthy'
                          : 'Healthy'
                    }
                    tone={item.tone}
                  />
                )}
              </div>
              <p
                style={
                  cardStyleVariant === 'adminOverview'
                    ? adminOverviewCardSubtextStyle
                    : muted
                }
              >
                {item.detail}
              </p>
            </article>
          ))
        )}
      </div>

      {cardStyleVariant === 'adminOverview' ? (
        <AdminOperationsHealthTrend />
      ) : null}

      {cardStyleVariant === 'adminOverview' && releaseMetadata.length > 0 ? (
        <p
          aria-label="Deployment configuration"
          style={adminOverviewCardSubtextStyle}
        >
          {releaseMetadata.join(' · ')}
        </p>
      ) : null}
    </section>
  );
}

const cardStyle: CSSProperties = {
  borderRadius: 'var(--sc-radius-xl)',
  padding: 'var(--sc-spacing-4)',
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
};

const adminOverviewAttentionStyle: CSSProperties = {
  border: '1px solid #e4e4e4',
  borderLeft: '3px solid #969696',
  borderRadius: '12px',
  padding: '12px 14px',
  background: '#f8f8f8',
  display: 'grid',
  gap: '8px',
};

const adminOverviewAttentionWarningStyle: CSSProperties = {
  ...adminOverviewAttentionStyle,
  borderColor: '#f0cccc',
  borderLeftColor: '#a62424',
  background: '#fff8f8',
};

const adminOverviewAttentionHeadingStyle: CSSProperties = {
  margin: 0,
  color: '#414141',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.3,
};

const adminOverviewAttentionListStyle: CSSProperties = {
  display: 'grid',
  gap: '4px',
  margin: 0,
  paddingLeft: '18px',
  color: '#414141',
  fontSize: '12px',
  lineHeight: 1.45,
};

const adminOverviewPanelCardStyle: CSSProperties = {
  minWidth: 0,
  border: '1px solid #e4e4e4',
  borderRadius: '16px',
  padding: '16px 20px',
  background: '#fff',
  boxShadow: 'none',
  display: 'grid',
  gap: '12px',
};

const compactCardStyle: CSSProperties = {
  ...cardStyle,
  padding: 'var(--sc-spacing-3)',
  gap: 'var(--sc-spacing-2)',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
};

const routeLink: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-2)',
  background: 'var(--sc-color-neutral-0)',
  textDecoration: 'none',
};

const emptyStateStyle: CSSProperties = {
  border: '1px dashed var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-3)',
  display: 'grid',
  gap: 'var(--sc-spacing-1)',
};

const compactEmptyStateStyle: CSSProperties = {
  ...emptyStateStyle,
  padding: 'var(--sc-spacing-2)',
};

const metricCardStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-3)',
  background: 'var(--sc-color-semantic-surfaceSubtle)',
  display: 'grid',
  gap: 'var(--sc-spacing-1)',
};

const adminOverviewMetricCardStyle: CSSProperties = {
  minWidth: 0,
  border: '1px solid #e4e4e4',
  borderRadius: '16px',
  background: '#fff',
  display: 'flex',
  minHeight: '121px',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 16px',
};

const compactMetricCardStyle: CSSProperties = {
  ...metricCardStyle,
  padding: 'var(--sc-spacing-2)',
};

const metricRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-2)',
};

const adminOverviewSupportingTextStyle: CSSProperties = {
  color: '#676767',
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: 1.45,
};

const adminOverviewPanelSubtitleStyle: CSSProperties = {
  ...adminOverviewSupportingTextStyle,
  margin: 'var(--sc-spacing-1) 0 0',
};

const adminOverviewCardSubtextStyle: CSSProperties = {
  ...adminOverviewSupportingTextStyle,
  margin: 0,
};

const muted: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};
