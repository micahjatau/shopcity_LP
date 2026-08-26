'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { shellNavigationByRole } from '../../../components/shell-navigation';
import {
  ApprovalsPanel,
  FraudFlagsPanel,
  ReportsWorkspace,
  WorkflowSection,
} from '../../../components/workflows';

const supervisorRouteBodyByHref: Record<string, string> = {
  '/supervisor/customers': 'Search customer detail and cards.',
  '/supervisor/cards': 'Assign, replace, and update status.',
  '/supervisor/transactions': 'Open a transaction and inspect it.',
  '/supervisor/approvals': 'Review pending decisions.',
  '/supervisor/fraud': 'Investigate flags and evidence.',
  '/supervisor/reports': 'Compare live queue health and reports.',
};

const supervisorRouteCards = shellNavigationByRole.SUPERVISOR.flatMap(
  (section) => section.items,
)
  .filter((item) => item.href !== '/supervisor')
  .map((item) => ({
    href: item.href,
    label: item.label,
    body:
      supervisorRouteBodyByHref[item.href] ??
      'Route-backed supervisor workspace.',
    featured: item.href === '/supervisor/customers',
  }));

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

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Supervisor scope">
          <h2 style={{ marginTop: 0 }}>Scope</h2>
          <p style={muted}>
            Supervisor work stays route-backed: launch the review lane you need,
            then use this shell for a quick status glance.
          </p>
        </article>

        <article style={cardStyle} aria-label="Primary review lanes">
          <h2 style={{ marginTop: 0 }}>Primary lanes</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {['Approvals', 'Fraud', 'Reports'].map((label) => (
              <div key={label} style={noteStyle}>
                <strong>{label}</strong>
                <p style={muted}>
                  {label === 'Approvals'
                    ? 'Pending decisions and evidence.'
                    : label === 'Fraud'
                      ? 'Flags and supporting evidence.'
                      : 'Queue health and reconciliation.'}
                </p>
              </div>
            ))}
          </div>
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

      <article style={cardStyle} aria-label="Reports review">
        <ReportsWorkspace
          canRefreshReports={false}
          canUseAuditReport={false}
          canUseMaterializationState={true}
          canUsePilotOperationsSummary={false}
        />
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
