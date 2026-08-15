import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ReportsWorkspace } from '../../../../components/workflows';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
] as const;

export default function SupervisorReportsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Selectable reports with filters, freshness, refresh, and export.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>

      <Alert tone="info" title="Reports route context">
        Reporting stays separate from transaction, approval, and fraud review so each workflow can stay focused.
      </Alert>

      <section style={cardStyle} aria-label="Related routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Filterable" tone="success" />
          <StatusBadge label="Refreshable" tone="info" />
          <StatusBadge label="Exportable" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Reports workspace">
        <h2 style={{ marginTop: 0 }}>Reports workspace</h2>
        <ReportsWorkspace />
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

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
