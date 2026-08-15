import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ReportsWorkspace } from '../../../../components/workflows';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/operations', 'Operations'],
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/cards', 'Cards'],
  ['/admin/branches', 'Branches'],
  ['/admin/audit', 'Audit'],
  ['/admin/adjustments', 'Adjustments'],
] as const;

export default function AdminReportsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Administrative reporting with filter, refresh, and export controls.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Reporting workspace">
        Reports stay contract-backed while controls for users, devices, and adjustments remain on their own routes.
      </Alert>

      <section style={cardStyle} aria-label="Related admin routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Contract-backed" tone="success" />
          <StatusBadge label="Export ready" tone="info" />
          <StatusBadge label="Refreshable" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Report workspace">
        <h2 style={{ marginTop: 0 }}>Operational reports</h2>
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
