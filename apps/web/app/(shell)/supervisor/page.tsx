'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import {
  ApprovalsPanel,
  FraudFlagsPanel,
  ReportsWorkspace,
  WorkflowSection,
} from '../../../components/workflows';
import { CashierPageHeader } from '../../../components/shopcity';

const supervisorRouteBodyByHref: Record<string, string> = {
  '/supervisor/customers': 'Search customer detail and cards.',
  '/supervisor/cards': 'Assign, replace, and update status.',
  '/supervisor/transactions': 'Open a transaction and inspect it.',
  '/supervisor/approvals': 'Review pending decisions.',
  '/supervisor/fraud': 'Investigate flags and evidence.',
  '/supervisor/reports': 'Filter operational reports and inspect results.',
};

const supervisorRouteCards = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/customers', 'Customers'],
  ['/supervisor/cards', 'Cards'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
  ['/supervisor/reports', 'Reports'],
].map(([href, label]) => ({
  href,
  label,
  body: supervisorRouteBodyByHref[href] ?? 'Route-backed supervisor workspace.',
  featured: href === '/supervisor/customers',
}));

export default function SupervisorPage() {
  return (
    <section className="supervisor-page">
      <ScannerContextScope context="lookup" />
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Supervisor workspace"
        description="Review operational work across approvals, fraud, transactions, and reports."
      />

      <WorkflowSection
        title="Review work"
        description="Choose a workspace to review the relevant records and available actions."
      >
        <div style={routeGrid}>
          {supervisorRouteCards.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              style={route.featured ? featuredRouteLink : routeLink}
            >
              <strong>{route.label}</strong>
              <span style={routeBody}>{route.body}</span>
            </Link>
          ))}
        </div>
      </WorkflowSection>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Supervisor scope">
          <h2 className="supervisor-page__section-title">Workspace guide</h2>
          <p style={muted}>
            Open the workspace for the records and review tasks you need.
          </p>
        </article>

        <article style={cardStyle} aria-label="Primary review lanes">
          <h2 className="supervisor-page__section-title">Review areas</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {['Approvals', 'Fraud', 'Reports'].map((label) => (
              <div key={label} style={noteStyle}>
                <strong>{label}</strong>
                <p style={muted}>
                  {label === 'Approvals'
                    ? 'Pending decisions and evidence.'
                    : label === 'Fraud'
                      ? 'Flags and supporting evidence.'
                      : 'Operational reports and available details.'}
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
