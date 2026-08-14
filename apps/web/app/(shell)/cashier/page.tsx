import type { CSSProperties } from 'react';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Button, Input } from '../../../components/ui';
import { Money, MoneyInput, StatusBadge } from '../../../components/shopcity';
import { WorkflowSection } from '../../../components/workflows';

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
        description="The shell keeps the most common working surfaces visible while backend wiring lands."
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
            { title: 'Earn', body: 'Capture purchase amount and receipt details.' },
            { title: 'Redeem', body: 'Review balance and policy before confirmation.' },
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
        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Earn preview</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <Input placeholder="Scan card serial or receipt" aria-label="Lookup" />
            <MoneyInput label="Earn amount" hint="Naira only; pasted formats are normalized" />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'var(--sc-spacing-3)',
              flexWrap: 'wrap',
              marginTop: 'var(--sc-spacing-4)',
            }}
          >
            <Button variant="primary">Prepare earn</Button>
            <Button variant="secondary">Open sync queue</Button>
          </div>
        </article>

        <article style={cardStyle}>
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
