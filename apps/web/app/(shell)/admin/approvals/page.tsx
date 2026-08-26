import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ApprovalsPanel } from '../../../../components/workflows';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/transactions', 'Transactions'],
  ['/admin/fraud', 'Fraud'],
  ['/admin/reports', 'Reports'],
] as const;

export default function AdminApprovalsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Approvals</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Admin approval queue and decision review.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Approval route context">
        Review decisions happen here while transaction, fraud, and report detail
        stay on their own routes.
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
          <StatusBadge label="Decision-ready" tone="success" />
          <StatusBadge label="Backend list" tone="info" />
          <StatusBadge label="Admin scope" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Approval workspace">
        <h2 style={{ marginTop: 0 }}>Approval workspace</h2>
        <ApprovalsPanel />
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
