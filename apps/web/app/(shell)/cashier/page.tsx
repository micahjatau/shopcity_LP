'use client';

import Link from 'next/link';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { WorkflowSection } from '../../../components/workflows';
import { useSessionBootstrapState } from '../../../components/session-bootstrap';

const cashierActions = [
  {
    title: 'Earn',
    href: '/cashier/earn',
    body: 'Credit a customer after confirming the purchase amount.',
  },
  {
    title: 'Redeem',
    href: '/cashier/redeem',
    body: 'Apply available loyalty credit with an authoritative review.',
  },
  {
    title: 'Find customer',
    href: '/cashier/lookup',
    body: 'Scan or enter a card serial to load customer context.',
  },
] as const;

export default function CashierPage() {
  const { deviceId, publicConfig, configStatus } = useSessionBootstrapState();
  const branch = publicConfig?.branch;
  const deviceLabel = deviceId ?? 'Device not provisioned';
  const branchLabel = branch?.name ?? branch?.id ?? 'Branch pending';

  return (
    <section className="cashier-overview">
      <ScannerContextScope context="lookup" />
      <header className="cashier-overview-header">
        <div>
          <p className="cashier-kicker">Cashier workspace</p>
          <h1>Ready for the next customer</h1>
          <p className="cashier-muted">
            Choose a task, confirm the customer context, and let the server
            provide the authoritative result.
          </p>
        </div>
        <div
          className="cashier-overview-status"
          aria-label="Cashier operating context"
        >
          <ConnectionStatus />
          <SyncQueueIndicator />
        </div>
      </header>

      <OfflineIndicator />

      <section className="cashier-context-grid" aria-label="Cashier context">
        <div className="cashier-context-card">
          <span className="cashier-context-label">Branch</span>
          <strong>{branchLabel}</strong>
          <span className="cashier-muted">
            {branch?.timezone ?? 'Timezone pending'}
          </span>
        </div>
        <div className="cashier-context-card">
          <span className="cashier-context-label">Device</span>
          <strong>{deviceLabel}</strong>
          <span className="cashier-muted">
            {deviceId
              ? 'Backend-associated session'
              : 'Offline work is blocked until ready'}
          </span>
        </div>
        <div className="cashier-context-card">
          <span className="cashier-context-label">Policy context</span>
          <strong>
            {configStatus === 'stale'
              ? 'Cached · refreshing'
              : configStatus === 'ready'
                ? 'Ready'
                : 'Pending'}
          </strong>
          <span className="cashier-muted">
            Only active restrictions appear in transaction review.
          </span>
        </div>
      </section>

      <WorkflowSection
        title="Choose a task"
        description="Start with the smallest workflow that matches what the customer needs."
      >
        <div className="cashier-action-grid">
          {cashierActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="cashier-action-card"
            >
              <strong>{action.title}</strong>
              <span>{action.body}</span>
            </Link>
          ))}
        </div>
      </WorkflowSection>

      <section className="cashier-recent-card" aria-label="Recent activity">
        <div>
          <h2>Recent activity</h2>
          <p className="cashier-muted">
            Recent activity will appear here when the scoped activity endpoint
            is available.
          </p>
        </div>
        <Link href="/cashier/sync">Open sync queue</Link>
      </section>

      <style>{`
        .cashier-overview {
          display: grid;
          gap: var(--sc-spacing-5);
        }

        .cashier-overview-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--sc-spacing-5);
          flex-wrap: wrap;
        }

        .cashier-overview-header h1,
        .cashier-recent-card h2 {
          margin: 0;
        }

        .cashier-kicker,
        .cashier-context-label {
          margin: 0 0 var(--sc-spacing-2);
          color: var(--sc-color-brand-700);
          font-size: var(--sc-font-size-sm);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cashier-overview-status {
          display: flex;
          gap: var(--sc-spacing-3);
          flex-wrap: wrap;
          align-items: center;
        }

        .cashier-context-grid,
        .cashier-action-grid {
          display: grid;
          gap: var(--sc-spacing-4);
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .cashier-context-card,
        .cashier-action-card,
        .cashier-recent-card {
          display: grid;
          gap: var(--sc-spacing-2);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: var(--sc-radius-lg);
          background: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-5);
          box-shadow: var(--sc-shadow-level1);
        }

        .cashier-action-card {
          color: inherit;
          text-decoration: none;
          transition: border-color 120ms ease, transform 120ms ease;
        }

        .cashier-action-card:hover {
          border-color: var(--sc-color-brand-500);
          transform: translateY(-2px);
        }

        .cashier-action-card:focus-visible,
        .cashier-recent-card a:focus-visible {
          outline: 3px solid var(--sc-color-warning-300);
          outline-offset: 3px;
        }

        .cashier-muted {
          margin: 0;
          color: var(--sc-color-semantic-textSecondary);
        }

        @media (max-width: 800px) {
          .cashier-context-grid,
          .cashier-action-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
