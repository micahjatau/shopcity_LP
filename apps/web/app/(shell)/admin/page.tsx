'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert } from '../../../components/ui';
import { StatusBadge } from '../../../components/shopcity';
import {
  AdminOperationsPanel,
  WorkflowSection,
} from '../../../components/workflows';

const adminRoutes = [
  ['/admin/operations', 'Operations'],
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/cards', 'Cards'],
  ['/admin/branches', 'Branches'],
  ['/admin/audit', 'Audit'],
  ['/admin/reports', 'Reports'],
  ['/admin/adjustments', 'Adjustments'],
] as const;

const adminRouteCards = [
  {
    href: '/admin/operations',
    label: 'Operations',
    body: 'Queue health, control work, and the fast path into daily action.',
    featured: true,
  },
  {
    href: '/admin/users',
    label: 'Users',
    body: 'Role review, account access, and identity management.',
  },
  {
    href: '/admin/devices',
    label: 'Devices',
    body: 'Device registration, ownership, and sync readiness.',
  },
  {
    href: '/admin/cards',
    label: 'Cards',
    body: 'Card lifecycle and assignment detail.',
  },
  {
    href: '/admin/branches',
    label: 'Branches',
    body: 'Branch policy, scope, and localized operations.',
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    body: 'Review traceable system and operator history.',
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    body: 'Operational reporting, separated from control.',
  },
  {
    href: '/admin/adjustments',
    label: 'Adjustments',
    body: 'Explicit ledger corrections and approvals.',
  },
] as const;

const workspaceNotes = [
  [
    'Contract-backed controls',
    'User, device, branch, audit, and adjustment actions now live on dedicated routes.',
  ],
  [
    'Reporting separate from control',
    'Operational reporting is available without mixing it into the landing page.',
  ],
  [
    'Role-aware access',
    'The shell keeps the admin area clearly scoped from cashier and supervisor flows.',
  ],
] as const;

export default function AdminPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="sync" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Admin shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Operations, audit, users, devices, branches and settings.
        </p>
        <div style={statusRow}>
          <StatusBadge label={`${adminRoutes.length} routes`} tone="success" />
          <StatusBadge label="Contract-backed" tone="info" />
          <StatusBadge label="Role-scoped" tone="neutral" />
        </div>
      </header>

      <WorkflowSection
        title="Admin routes"
        description="Use the dedicated route-backed workspaces for each admin action."
      >
        <div style={routeGrid}>
          {adminRouteCards.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              style={'featured' in route ? featuredRouteLink : routeLink}
            >
              <strong>{route.label}</strong>
              <span style={routeBody}>{route.body}</span>
            </Link>
          ))}
        </div>
      </WorkflowSection>

      <Alert tone="info" title="Admin landing page">
        This shell is intentionally lightweight: use the focused workspaces for
        contract-backed review and changes.
      </Alert>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Admin workspace summary">
          <h2 style={{ marginTop: 0 }}>Workspace summary</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {workspaceNotes.map(([title, body]) => (
              <div key={title} style={noteStyle}>
                <strong>{title}</strong>
                <p style={muted}>{body}</p>
              </div>
            ))}
          </div>
        </article>

        <article style={cardStyle} aria-label="Admin status">
          <h2 style={{ marginTop: 0 }}>Status</h2>
          <div style={statusRow}>
            <StatusBadge label="Route-backed" tone="success" />
            <StatusBadge label="Contract-driven" tone="info" />
            <StatusBadge label="Role-scoped" tone="neutral" />
          </div>
          <p style={muted}>
            Detailed health and report information now live on the admin
            operations and reports routes.
          </p>
        </article>
      </div>

      <article style={cardStyle} aria-label="Admin operations review">
        <AdminOperationsPanel />
      </article>
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

const routeGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const routeLink: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-3)',
  background: 'var(--sc-color-neutral-0)',
  textDecoration: 'none',
  display: 'grid',
  gap: 'var(--sc-spacing-1)',
};

const featuredRouteLink: CSSProperties = {
  ...routeLink,
  gridColumn: 'span 2',
  padding: 'var(--sc-spacing-4)',
};

const routeBody: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  fontSize: 'var(--sc-font-size-sm)',
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
