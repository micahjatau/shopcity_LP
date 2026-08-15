'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert } from '../../../components/ui';
import { StatusBadge } from '../../../components/shopcity';
import {
  ApprovalsPanel,
  FraudFlagsPanel,
  WorkflowSection,
} from '../../../components/workflows';

const supervisorRoutes = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
  ['/supervisor/reports', 'Reports'],
] as const;

const supervisorRouteCards = [
  {
    href: '/supervisor/transactions',
    label: 'Transactions',
    body: 'Start with the queue, then drill into a single item.',
    featured: true,
  },
  {
    href: '/supervisor/approvals',
    label: 'Approvals',
    body: 'Review evidence-led decisions and pending actions.',
  },
  {
    href: '/supervisor/fraud',
    label: 'Fraud',
    body: 'Investigate flags, severity, and supporting evidence.',
  },
  {
    href: '/supervisor/reports',
    label: 'Reports',
    body: 'Compare the report view against live queue health.',
  },
] as const;

const supervisorNotes = [
  [
    'Review lanes',
    'Transactions, approvals, fraud, and reports each keep their own focused route.',
  ],
  [
    'Detail-led work',
    'Use the dedicated workspaces for selected-item context and contract-backed review.',
  ],
  [
    'Operational scope',
    'The supervisor shell stays focused on queue health and investigative action.',
  ],
] as const;

export default function SupervisorPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="lookup" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Supervisor shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Approvals, fraud review, transaction detail and reports.
        </p>
        <div style={statusRow}>
          <StatusBadge
            label={`${supervisorRoutes.length} routes`}
            tone="success"
          />
          <StatusBadge label="Investigative" tone="info" />
          <StatusBadge label="Route-backed" tone="neutral" />
        </div>
      </header>

      <WorkflowSection
        title="Review lanes"
        description="Jump straight into the route-backed workspace for the item you need to investigate."
      >
        <div style={routeGrid}>
          {supervisorRouteCards.map((route) => (
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

      <Alert tone="info" title="Supervisor landing page">
        Investigative detail and queue actions live in the dedicated review
        routes.
      </Alert>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Supervisor overview">
          <h2 style={{ marginTop: 0 }}>Overview</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {supervisorNotes.map(([title, body]) => (
              <div key={title} style={noteStyle}>
                <strong>{title}</strong>
                <p style={muted}>{body}</p>
              </div>
            ))}
          </div>
        </article>

        <article style={cardStyle} aria-label="Supervisor status">
          <h2 style={{ marginTop: 0 }}>Status</h2>
          <div style={statusRow}>
            <StatusBadge label="Route-backed" tone="success" />
            <StatusBadge label="Contract-driven" tone="info" />
            <StatusBadge label="Investigative" tone="neutral" />
          </div>
          <p style={muted}>
            Queue pressure, fraud review, and report reconciliation stay visible
            without duplicating the workspaces here.
          </p>
        </article>
      </div>

      <div style={panelGrid}>
        <article style={cardStyle} aria-label="Approvals review">
          <ApprovalsPanel />
        </article>
        <article style={cardStyle} aria-label="Fraud review">
          <FraudFlagsPanel />
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

const panelGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
