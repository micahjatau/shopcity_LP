import type { CSSProperties } from 'react';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Accordion, Button, Tabs } from '../../../components/ui';
import {
  ApprovalBadge,
  FraudSeverityBadge,
  TransactionStateBadge,
} from '../../../components/shopcity';
import {
  ApprovalsPanel,
  ReportsWorkspace,
  WorkflowSection,
} from '../../../components/workflows';

export default function SupervisorPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="lookup" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Supervisor shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Approvals, fraud review, customer support and reports.
        </p>
      </header>

      <WorkflowSection
        title="Attention queue"
        description="The supervisor shell now surfaces contract-backed approval and reporting panels."
      >
        <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
          <div style={statRow}>
            <span>High-value approval</span>
            <ApprovalBadge state="PENDING" />
          </div>
          <div style={statRow}>
            <span>Fraud review</span>
            <FraudSeverityBadge severity="HIGH" />
          </div>
          <div style={statRow}>
            <span>Transaction state</span>
            <TransactionStateBadge state="CONFIRMED" />
          </div>
        </div>
      </WorkflowSection>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Approvals panel</h2>
          <ApprovalsPanel />
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Review lanes</h2>
          <Tabs
            defaultValue="overview"
            items={[
              { value: 'overview', label: 'Overview', panel: <p style={muted}>Branch health, queue pressure and freshness signals.</p> },
              { value: 'transactions', label: 'Transactions', panel: <p style={muted}>Search, inspect and trace recent branch activity.</p> },
              { value: 'fraud', label: 'Fraud', panel: <p style={muted}>Rule matches, reviews and escalation notes.</p> },
            ]}
          />
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Reports workspace</h2>
          <ReportsWorkspace />
        </article>
      </div>

      <Accordion
        items={[
          {
            value: 'support',
            label: 'Supervisor support notes',
            content: <p style={muted}>Use the approval queue and reports workspace for the primary review tasks.</p>,
          },
          {
            value: 'actions',
            label: 'Action shortcuts',
            content: (
              <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
                <Button variant="primary">Review approvals</Button>
                <Button variant="secondary">Inspect fraud queue</Button>
                <Button variant="secondary">Open reports</Button>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};

const statRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
  alignItems: 'center',
};
