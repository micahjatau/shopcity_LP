'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { shellNavigationByRole } from '../../../components/shell-navigation';
import { StatusBadge } from '../../../components/shopcity';
import {
  AdminOperationsPanel,
  WorkflowSection,
} from '../../../components/workflows';

const adminRouteBodyByHref: Record<string, string> = {
  '/admin/operations': 'Queue health and fast-path control.',
  '/admin/transactions': 'Review transactions and reversals.',
  '/admin/approvals': 'Review the approval queue.',
  '/admin/fraud': 'Investigate fraud flags and evidence.',
  '/admin/customers': 'Search and manage customers.',
  '/admin/cards': 'Track card lifecycle and assignment.',
  '/admin/adjustments': 'Handle ledger corrections.',
  '/admin/reports': 'Open operational reporting.',
  '/admin/audit': 'Review system and operator history.',
  '/admin/users': 'Manage access and identities.',
  '/admin/devices': 'Track devices and sync readiness.',
  '/admin/branches': 'Manage branch policy and scope.',
};

const adminRouteCards = shellNavigationByRole.ADMIN.flatMap((section) =>
  section.items,
)
  .filter((item) => item.href !== '/admin')
  .map((item) => ({
    href: item.href,
    label: item.label,
    body: adminRouteBodyByHref[item.href] ?? 'Route-backed admin workspace.',
    featured: item.href === '/admin/operations',
  }));

const adminRoutes = shellNavigationByRole.ADMIN.flatMap((section) =>
  section.items,
);

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

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Admin scope">
          <h2 style={{ marginTop: 0 }}>Scope</h2>
          <div style={statusRow}>
            <StatusBadge label="Route-backed" tone="success" />
            <StatusBadge label="Contract-driven" tone="info" />
            <StatusBadge label="Role-scoped" tone="neutral" />
          </div>
          <p style={muted}>
            Admin work stays route-backed: launch the workspace you need, then
            use this shell for a quick status glance.
          </p>
        </article>

        <article style={cardStyle} aria-label="Primary admin lanes">
          <h2 style={{ marginTop: 0 }}>Primary lanes</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {['Operations', 'Users', 'Audit'].map((label) => (
              <div key={label} style={noteStyle}>
                <strong>{label}</strong>
                <p style={muted}>
                  {label === 'Operations'
                    ? 'Queue health and control work.'
                    : label === 'Users'
                      ? 'Access and identity management.'
                      : 'System and operator history.'}
                </p>
              </div>
            ))}
          </div>
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
