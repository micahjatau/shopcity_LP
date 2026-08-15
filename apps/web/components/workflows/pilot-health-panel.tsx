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

export function PilotHealthPanel() {
  const [summary, setSummary] = useState<any | null>(null);
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

  const items = useMemo(
    () =>
      summary
        ? [
            {
              label: 'Outbox backlog',
              value:
                summary.outbox?.backlogCount ?? summary.outbox?.pendingCount ?? '—',
              tone: summary.outbox?.hasBacklog ? ('warning' as const) : ('success' as const),
              detail: summary.outbox?.lastDispatchAt ? `Last dispatch ${summary.outbox.lastDispatchAt}` : 'No backlog detected',
            },
            {
              label: 'SMS delivery',
              value: summary.sms?.failedCount ?? summary.sms?.queuedCount ?? '—',
              tone: summary.sms?.failedCount ? ('danger' as const) : ('success' as const),
              detail: summary.sms?.queuedCount ? `${summary.sms.queuedCount} queued` : 'Delivery queue clear',
            },
            {
              label: 'Offline sync',
              value: summary.offlineSync?.failedCount ?? summary.offlineSync?.pendingCount ?? '—',
              tone: summary.offlineSync?.failedCount ? ('danger' as const) : ('warning' as const),
              detail: summary.offlineSync?.pendingCount ? `${summary.offlineSync.pendingCount} pending` : 'No offline backlog',
            },
            {
              label: 'Report freshness',
              value: summary.reports?.staleCount ?? summary.reports?.freshCount ?? '—',
              tone: summary.reports?.staleCount ? ('warning' as const) : ('success' as const),
              detail: summary.reports?.freshCount ? `${summary.reports.freshCount} fresh` : 'No freshness warnings',
            },
          ]
        : [],
    [summary],
  );

  const overallTone = useMemo(() => {
    if (!summary) return 'neutral' as const;
    if (summary.outbox?.hasBacklog || summary.sms?.failedCount || summary.offlineSync?.failedCount) {
      return 'warning' as const;
    }
    if (summary.reports?.staleCount) return 'info' as const;
    return 'success' as const;
  }, [summary]);

  return (
    <section
      style={cardStyle}
    >
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <StatusBadge label={summary ? 'Live' : 'Loading'} tone={overallTone} />
          {summary?.reconciliation ? <StatusBadge label="Reconciliation available" tone="info" /> : null}
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

      <div style={routeRow}>
        {routeLinks.map(([href, label]) => (
          <Link key={href} href={href} style={routeLink}>
            {label}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {items.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Waiting for live operations data</strong>
            <p style={muted}>Health, queue, and report signals will appear once the backend responds.</p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.label}
              style={metricCardStyle}
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

      {summary?.reconciliation ? (
        <div style={reconciliationStyle}>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Reconciliation</strong>
            <StatusBadge label={summary.reconciliation.unhealthy ? 'Needs review' : 'Healthy'} tone={summary.reconciliation.unhealthy ? 'warning' : 'success'} />
          </div>
          <pre style={preStyle}>
            {JSON.stringify(summary.reconciliation, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

const cardStyle: CSSProperties = {
  borderRadius: 'var(--sc-radius-xl)',
  padding: 'var(--sc-spacing-5)',
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const routeLink: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-2) var(--sc-spacing-3)',
  background: 'var(--sc-color-neutral-0)',
  textDecoration: 'none',
};

const emptyStateStyle: CSSProperties = {
  border: '1px dashed var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-4)',
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const metricCardStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-4)',
  background: 'var(--sc-color-semantic-surfaceSubtle)',
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const metricRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
};

const reconciliationStyle: CSSProperties = {
  borderRadius: 'var(--sc-radius-lg)',
  border: '1px solid var(--sc-color-semantic-border)',
  padding: 'var(--sc-spacing-4)',
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
};

const preStyle: CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
};

const muted: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};
