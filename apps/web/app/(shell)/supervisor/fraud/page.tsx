import Link from 'next/link';
import type { CSSProperties } from 'react';
import { FraudFlagsPanel } from '../../../../components/workflows';
import { Alert } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/reports', 'Reports'],
] as const;

export default function SupervisorFraudPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Fraud</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Evidence-led fraud review and decisioning.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>

      <Alert tone="info" title="Fraud route context">
        Keep evidence review, acknowledgment, and resolution on this dedicated route.
      </Alert>

      <section style={cardStyle} aria-label="Related routes">
        <h2 style={{ marginTop: 0 }}>Route map</h2>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Evidence-led" tone="success" />
          <StatusBadge label="Backend list" tone="info" />
          <StatusBadge label="Selected item detail" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Fraud workspace">
        <h2 style={{ marginTop: 0 }}>Fraud workspace</h2>
        <FraudFlagsPanel />
      </section>
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

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
