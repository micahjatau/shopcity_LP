import type { CSSProperties } from 'react';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Button, Input, Alert, Separator } from '../../../components/ui';
import { Money, StatusBadge } from '../../../components/shopcity';
import {
  EarnTransactionForm,
  RedeemTransactionForm,
  WorkflowSection,
} from '../../../components/workflows';

export default function CashierPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="earn" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Cashier shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Fast earn, redeem, lookup and sync entry points.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <ConnectionStatus />
          <SyncQueueIndicator />
        </div>
      </header>

      <OfflineIndicator />

      <WorkflowSection
        title="Primary cashier actions"
        description="The shell now exposes real earn and redeem forms alongside lookup and sync entry points."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {[
            { title: 'Lookup', body: 'Scan card, receipt or customer reference.' },
            { title: 'Earn', body: 'Submit a contract-backed earn transaction.' },
            { title: 'Redeem', body: 'Submit a contract-backed redemption.' },
            { title: 'Customers', body: 'Check identity, cards and loyalty balance.' },
            { title: 'Sync', body: 'Track local queue and reconciliation state.' },
          ].map((item) => (
            <article key={item.title} style={cardStyle}>
              <strong>{item.title}</strong>
              <p style={muted}>{item.body}</p>
            </article>
          ))}
        </div>
      </WorkflowSection>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <article style={cardStyle} aria-label="Lookup and status">
          <h2 style={{ marginTop: 0 }}>Lookup and status</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <Input placeholder="Scan card serial or receipt" aria-label="Lookup" />
            <Alert tone="info" title="Session-aware shell">
              The backend remains authoritative for final earn and redeem state.
            </Alert>
          </div>
        </article>

        <article style={cardStyle} aria-label="Earn transaction">
          <h2 style={{ marginTop: 0 }}>Earn transaction</h2>
          <EarnTransactionForm />
        </article>

        <article style={cardStyle} aria-label="Redeem transaction">
          <h2 style={{ marginTop: 0 }}>Redeem transaction</h2>
          <RedeemTransactionForm />
        </article>

        <article style={cardStyle} aria-label="Shift snapshot">
          <h2 style={{ marginTop: 0 }}>Shift snapshot</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <div style={statRow}>
              <span>Current earned</span>
              <Money amountKobo={152500} emphasis="positive" />
            </div>
            <div style={statRow}>
              <span>Pending sync</span>
              <StatusBadge label="3 saved locally" tone="warning" />
            </div>
            <div style={statRow}>
              <span>Sync health</span>
              <StatusBadge label="Stable" tone="success" />
            </div>
          </div>
          <Separator style={{ margin: 'var(--sc-spacing-4) 0' }} />
          <Button variant="secondary">Open sync queue</Button>
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
