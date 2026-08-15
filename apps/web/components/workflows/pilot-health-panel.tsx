'use client';

import { useEffect, useState } from 'react';
import { reportsControllerGetPilotOperationsSummaryV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { StatusBadge } from '../shopcity';

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

  const items = summary
    ? [
        {
          label: 'Outbox backlog',
          value: summary.outbox?.backlogCount ?? summary.outbox?.pendingCount ?? '—',
          tone: summary.outbox?.hasBacklog ? ('warning' as const) : ('success' as const),
        },
        {
          label: 'SMS delivery',
          value: summary.sms?.failedCount ?? summary.sms?.queuedCount ?? '—',
          tone: summary.sms?.failedCount ? ('danger' as const) : ('success' as const),
        },
        {
          label: 'Offline sync',
          value: summary.offlineSync?.failedCount ?? summary.offlineSync?.pendingCount ?? '—',
          tone: summary.offlineSync?.failedCount ? ('danger' as const) : ('warning' as const),
        },
        {
          label: 'Report freshness',
          value: summary.reports?.staleCount ?? summary.reports?.freshCount ?? '—',
          tone: summary.reports?.staleCount ? ('warning' as const) : ('success' as const),
        },
      ]
    : [];

  return (
    <section
      style={{
        borderRadius: 'var(--sc-radius-xl)',
        padding: 'var(--sc-spacing-5)',
        background: 'var(--sc-color-neutral-0)',
        border: '1px solid var(--sc-color-semantic-border)',
        boxShadow: 'var(--sc-shadow-level1)',
        display: 'grid',
        gap: 'var(--sc-spacing-4)',
      }}
    >
      <header>
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
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              border: '1px solid var(--sc-color-semantic-border)',
              borderRadius: 'var(--sc-radius-lg)',
              padding: 'var(--sc-spacing-4)',
            }}
          >
            <strong>Waiting for live operations data</strong>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.label}
              style={{
                border: '1px solid var(--sc-color-semantic-border)',
                borderRadius: 'var(--sc-radius-lg)',
                padding: 'var(--sc-spacing-4)',
                background: 'var(--sc-color-semantic-surfaceSubtle)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: 'var(--sc-color-semantic-textSecondary)',
                }}
              >
                {item.label}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--sc-spacing-3)',
                }}
              >
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
            </article>
          ))
        )}
      </div>
      {summary?.reconciliation ? (
        <div
          style={{
            borderRadius: 'var(--sc-radius-lg)',
            border: '1px solid var(--sc-color-semantic-border)',
            padding: 'var(--sc-spacing-4)',
          }}
        >
          <strong>Reconciliation</strong>
          <pre style={{ margin: 'var(--sc-spacing-2) 0 0', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(summary.reconciliation, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
