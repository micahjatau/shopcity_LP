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

const workspaceNotes = [
  [
    'Scoped filters',
    'Branch, timezone, and date-window controls keep the report focused on one operational slice.',
  ],
  [
    'Selected detail',
    'The workspace keeps the chosen report row and raw action response visible for follow-up.',
  ],
  [
    'Separation of concerns',
    'Transaction, approval, and fraud review remain on their own routes so reporting stays clean.',
  ],
] as const;

export default function SupervisorReportsPage() {
  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Selectable reports with filters, freshness, refresh, and export.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>

      <Alert tone="info" title="Reports route context">
        Reporting stays separate from transaction, approval, and fraud review so
        each workflow can stay focused.
      </Alert>

      <section style={cardStyle} aria-label="Related routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={routeLink}>
              {label}
            </Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Filterable" tone="success" />
          <StatusBadge label="Refreshable" tone="info" />
          <StatusBadge label="Exportable" tone="neutral" />
        </div>
      </section>

      <div style={gridStyle}>
        <section style={cardStyle} aria-label="Reports notes">
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

        <section style={cardStyle} aria-label="Reports workspace">
          <h2 style={{ marginTop: 0 }}>Reports workspace</h2>
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
