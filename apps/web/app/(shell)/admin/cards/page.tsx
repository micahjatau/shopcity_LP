import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CustomerWorkspace } from '../../../../components/workflows/customer-workspace';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/customers', 'Customers'],
  ['/admin/devices', 'Devices'],
  ['/admin/branches', 'Branches'],
] as const;

export default function AdminCardsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Cards</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Card lifecycle and assignment review.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Card route context">
        Manage card assignment, replacement, and status from the shared customer
        workspace.
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
          <StatusBadge label="Lifecycle" tone="success" />
          <StatusBadge label="Backend contract" tone="info" />
          <StatusBadge label="Admin scope" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Card workspace">
        <h2 style={{ marginTop: 0 }}>Card workspace</h2>
        <CustomerWorkspace canManage mode="card" />
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
