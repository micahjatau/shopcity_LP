import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PilotHealthPanel, ReportsWorkspace } from '../../../../components/workflows';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/cards', 'Cards'],
  ['/admin/branches', 'Branches'],
  ['/admin/audit', 'Audit'],
  ['/admin/adjustments', 'Adjustments'],
  ['/admin/reports', 'Reports'],
] as const;

const workspaceNotes = [
  [
    'Health',
    'Pilot readiness, release signals, and queue pressure stay visible before operator actions.',
  ],
  [
    'Reporting',
    'Operational reporting should remain contract-backed and traceable to live backend data.',
  ],
  [
    'Controls',
    'Use the dedicated admin routes for user, device, branch, audit, and adjustment changes.',
  ],
] as const;

export default function AdminOperationsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Operations</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Live pilot operations summary and operational reporting.
        </p>
        <div style={statusRow}>
          <StatusBadge label={`${routeLinks.length} routes`} tone="success" />
          <StatusBadge label="Health + reports" tone="info" />
          <StatusBadge label="Route-backed" tone="neutral" />
        </div>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Admin operations at a glance">
        Keep review, reporting, and control actions on separate route-backed surfaces.
      </Alert>

      <section style={cardStyle} aria-label="Admin route links">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={routeLink}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Pilot health">
          <h2 style={{ marginTop: 0 }}>Health</h2>
          <p style={muted}>
            Pilot readiness, release signals, and queue pressure stay visible before operator actions.
          </p>
          <PilotHealthPanel />
        </article>

        <article style={cardStyle} aria-label="Operational reporting">
          <h2 style={{ marginTop: 0 }}>Reporting</h2>
          <p style={muted}>
            Operational reporting should remain contract-backed and traceable to live backend data.
          </p>
          <ReportsWorkspace />
        </article>

        <article style={cardStyle} aria-label="Operations notes">
          <h2 style={{ marginTop: 0 }}>Workspace notes</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {workspaceNotes.map(([title, body]) => (
              <div key={title} style={noteCardStyle}>
                <strong>{title}</strong>
                <p style={muted}>{body}</p>
              </div>
            ))}
          </div>
          <div style={statusRow}>
            <StatusBadge label="Route-backed" tone="success" />
            <StatusBadge label="Contract-driven" tone="info" />
            <StatusBadge label="Role-scoped" tone="neutral" />
          </div>
        </article>
      </div>
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

const noteCardStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-3)',
  background: 'var(--sc-color-neutral-0)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
