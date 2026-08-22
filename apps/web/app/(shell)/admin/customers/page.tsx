import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CustomerWorkspace } from '../../../../components/workflows/customer-workspace';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/cards', 'Cards'],
  ['/admin/branches', 'Branches'],
  ['/admin/reports', 'Reports'],
] as const;

export default function AdminCustomersPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Customers</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Admin customer and card management.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Customer route context">
        Search, inspect, and manage customer and card state from a dedicated
        admin route.
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
          <StatusBadge label="Detail-led" tone="success" />
          <StatusBadge label="Backend contract" tone="info" />
          <StatusBadge label="Admin scope" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Customer workspace">
        <h2 style={{ marginTop: 0 }}>Customer workspace</h2>
        <CustomerWorkspace canManage />
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
