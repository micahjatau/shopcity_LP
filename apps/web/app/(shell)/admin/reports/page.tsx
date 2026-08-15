'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
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

const workspaceNotes = [
  [
    'Report filters',
    'Choose report scope, branch, timezone, and date window before refreshing or exporting.',
  ],
  [
    'Selected row detail',
    'Each report now keeps a selected item and raw backend response visible for review.',
  ],
  [
    'Operational separation',
    'Control surfaces stay on dedicated admin routes so reporting remains focused.',
  ],
] as const;

export default function AdminReportsPage() {
  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Administrative reporting with filter, refresh, and export controls.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Reporting workspace">
        Reports stay contract-backed while controls for users, devices, and
        adjustments remain on their own routes.
      </Alert>

      <section style={cardStyle} aria-label="Related admin routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={routeGrid}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={routeLink}>
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

      <div style={gridStyle}>
        <section style={cardStyle} aria-label="Report notes">
          <h2 style={{ marginTop: 0 }}>Report notes</h2>
          <div style={noteGrid}>
            {workspaceNotes.map(([title, body]) => (
              <article key={title} style={noteStyle}>
                <strong>{title}</strong>
                <p style={muted}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={cardStyle} aria-label="Report workspace">
          <h2 style={{ marginTop: 0 }}>Operational reports</h2>
          <ReportsWorkspace />
        </section>
      </div>
    </section>
  );
}

const layoutGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const headerGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const routeGrid: CSSProperties = {
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

const noteGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
};

const noteStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-3)',
  background: 'var(--sc-color-neutral-0)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
