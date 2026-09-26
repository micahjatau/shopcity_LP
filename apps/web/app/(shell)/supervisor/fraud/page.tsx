import Link from 'next/link';
import type { CSSProperties } from 'react';
import { FraudFlagsPanel } from '../../../../components/workflows';
import {
  StatusBadge,
  CashierPageHeader,
} from '../../../../components/shopcity';

const routeLinks = [
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/reports', 'Reports'],
] as const;

export default function SupervisorFraudPage() {
  return (
    <section className="supervisor-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Review fraud flags"
        description="Examine available evidence and use the existing review actions."
        actions={<Link href="/supervisor">Back to supervisor</Link>}
      />

      <section style={cardStyle} aria-label="Related routes">
        <h2 className="supervisor-page__section-title">Related workspaces</h2>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div style={statusRow}>
          <StatusBadge label="Evidence-led" tone="success" />
          <StatusBadge label="Backend list" tone="info" />
          <StatusBadge label="Selected item detail" tone="neutral" />
        </div>
      </section>

      <section style={cardStyle} aria-label="Fraud workspace">
        <h2 className="supervisor-page__section-title">Fraud records</h2>
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
