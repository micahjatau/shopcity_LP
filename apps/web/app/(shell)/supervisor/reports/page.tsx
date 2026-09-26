import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ReportsWorkspace } from '../../../../components/workflows';
import {
  StatusBadge,
  CashierPageHeader,
} from '../../../../components/shopcity';

const routeLinks = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
] as const;

export default function SupervisorReportsPage() {
  return (
    <section className="supervisor-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Operational reports"
        description="Choose a report, apply available filters, and inspect its rows and freshness details."
        actions={<Link href="/supervisor">Back to supervisor</Link>}
      />

      <section style={cardStyle} aria-label="Related routes">
        <h2 className="supervisor-page__section-title">Related workspaces</h2>
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={routeLink}>
              {label}
            </Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Filterable" tone="success" />
          <StatusBadge label="Read-only materialization" tone="info" />
          <StatusBadge label="Exportable" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Reports workspace">
        <h2 className="supervisor-page__section-title">Available reports</h2>
        <ReportsWorkspace
          canRefreshReports={false}
          canUseAuditReport={false}
          canUseMaterializationState={true}
          canUsePilotOperationsSummary={false}
        />
      </section>
    </section>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
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

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
