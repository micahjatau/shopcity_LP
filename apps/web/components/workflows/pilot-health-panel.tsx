'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { reportsControllerGetPilotOperationsSummaryV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { StatusBadge } from '../shopcity';

const routeLinks = [
  ['/admin/operations', 'Admin operations'],
  ['/admin/reports', 'Admin reports'],
  ['/supervisor', 'Supervisor'],
  ['/supervisor/reports', 'Supervisor reports'],
] as const;

type PilotSummary = {
  outbox?: { backlogCount?: number; staleCount?: number };
  sms?: { failedCount?: number };
  offlineSync?: { failureCount?: number };
  fraud?: { openCount?: number };
  reports?: { staleCount?: number };
  reconciliation?: { healthy?: boolean; mismatchCount?: number };
};

export function PilotHealthPanel({
  compact = false,
}: { compact?: boolean } = {}) {
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [message, setMessage] = useState('Loading pilot health…');

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
          setMessage('Pilot health loaded from live backend data.');
          return;
        }

        setSummary(null);
        setMessage(`Pilot health unavailable (${response.status}).`);
      } catch {
        if (!ignore) {
          setSummary(null);
          setMessage('Pilot health unavailable.');
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  const reconciliationHealthy = summary?.reconciliation?.healthy === true;
  const outbox = summary?.outbox ?? {};
  const sms = summary?.sms ?? {};
  const offlineSync = summary?.offlineSync ?? {};
  const fraud = summary?.fraud ?? {};
  const reports = summary?.reports ?? {};

  const items = useMemo(
    () =>
      summary
        ? [
            {
              label: 'Outbox backlog',
              value: outbox.backlogCount ?? '—',
              tone:
                (outbox.backlogCount ?? 0) > 0 || (outbox.staleCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (outbox.staleCount ?? 0) > 0
                  ? `${outbox.staleCount} stale`
                  : 'No backlog detected',
            },
            {
              label: 'SMS failures',
              value: sms.failedCount ?? '—',
              tone:
                (sms.failedCount ?? 0) > 0
                  ? ('danger' as const)
                  : ('success' as const),
              detail:
                (sms.failedCount ?? 0) > 0
                  ? 'Investigate SMS delivery'
                  : 'Delivery queue clear',
            },
            {
              label: 'Offline sync failures',
              value: offlineSync.failureCount ?? '—',
              tone:
                (offlineSync.failureCount ?? 0) > 0
                  ? ('danger' as const)
                  : ('success' as const),
              detail:
                (offlineSync.failureCount ?? 0) > 0
                  ? `${offlineSync.failureCount} failed`
                  : 'No offline backlog',
            },
            {
              label: 'Fraud open',
              value: fraud.openCount ?? '—',
              tone:
                (fraud.openCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (fraud.openCount ?? 0) > 0
                  ? 'Open fraud cases need review'
                  : 'No open fraud cases',
            },
            {
              label: 'Report freshness',
              value: reports.staleCount ?? '—',
              tone:
                (reports.staleCount ?? 0) > 0
                  ? ('warning' as const)
                  : ('success' as const),
              detail:
                (reports.staleCount ?? 0) > 0
                  ? `${reports.staleCount} stale`
                  : 'No freshness warnings',
            },
            {
              label: 'Reconciliation',
              value:
                typeof summary.reconciliation?.mismatchCount === 'number'
                  ? summary.reconciliation.mismatchCount
                  : '—',
              tone: reconciliationHealthy
                ? ('success' as const)
                : ('danger' as const),
              detail: reconciliationHealthy
                ? 'Ledger and operational signals are aligned'
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
    ],
  );

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
    <section style={compact ? compactCardStyle : cardStyle}>
      <header
        style={{
          display: 'grid',
          gap: compact ? 'var(--sc-spacing-1)' : 'var(--sc-spacing-2)',
        }}
      >
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
        <h2 style={{ margin: 0 }}>Pilot health</h2>
        <p
          style={{
            margin: 'var(--sc-spacing-1) 0 0',
            color: 'var(--sc-color-semantic-textSecondary)',
          }}
        >
          {message}
        </p>
      </header>

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
            <strong>Waiting for live operations data</strong>
            <p style={muted}>
              Health, queue, and report signals will appear once the backend
              responds.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.label}
              style={compact ? compactMetricCardStyle : metricCardStyle}
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
              </div>
              <p style={muted}>{item.detail}</p>
            </article>
          ))
        )}
      </div>
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

const muted: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};
