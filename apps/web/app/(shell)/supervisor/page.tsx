import type { CSSProperties } from 'react';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Button } from '../../../components/ui';
import {
  ApprovalBadge,
  FraudSeverityBadge,
  TransactionStateBadge,
} from '../../../components/shopcity';
import { WorkflowSection } from '../../../components/workflows';

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
        description="These are the first items a supervisor should inspect."
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {[
          {
            title: 'Overview',
            body: 'Branch health, queue pressure and freshness signals.',
          },
          {
            title: 'Transactions',
            body: 'Search, inspect and trace recent branch activity.',
          },
          { title: 'Approvals', body: 'Pending earn and redeem decisions.' },
          { title: 'Fraud', body: 'Rule matches, reviews and escalation notes.' },
          { title: 'Reports', body: 'Freshness, export and reconciliation views.' },
        ].map((item) => (
          <article key={item.title} style={cardStyle}>
            <strong>{item.title}</strong>
            <p style={muted}>{item.body}</p>
          </article>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--sc-spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <Button variant="primary">Review approvals</Button>
        <Button variant="secondary">Open reports</Button>
        <Button variant="secondary">Inspect fraud queue</Button>
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
