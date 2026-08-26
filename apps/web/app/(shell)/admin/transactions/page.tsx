import Link from 'next/link';
import type { CSSProperties } from 'react';
import { TransactionWorkspace } from '../../../../components/workflows/transaction-workspace';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/approvals', 'Approvals'],
  ['/admin/fraud', 'Fraud'],
  ['/admin/reports', 'Reports'],
] as const;

export default function AdminTransactionsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Transactions</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Transaction detail and compensating reversal review.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Transaction route context">
        Inspect a transaction and create an immutable compensating reversal
        where permitted.
      </Alert>

      <section style={cardStyle} aria-label="Related routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Immutable reversal flow" tone="success" />
          <StatusBadge label="Backend contract" tone="info" />
          <StatusBadge label="Admin scope" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Transaction workspace">
        <h2 style={{ marginTop: 0 }}>Transaction workspace</h2>
        <TransactionWorkspace relatedRoutes={routeLinks} />
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
