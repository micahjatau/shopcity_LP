import type { CSSProperties } from 'react';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Button, Input } from '../../../components/ui';
import { Money, StatusBadge } from '../../../components/shopcity';
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
        description="These are the entry points that should stay visible on a POS screen."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {['Lookup', 'Earn', 'Redeem', 'Customers', 'Sync'].map((item) => (
            <article key={item} style={cardStyle}>
              <strong>{item}</strong>
              <p style={muted}>Route placeholder</p>
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
          <h2 style={{ marginTop: 0 }}>Scan or search</h2>
          <Input
            placeholder="Scan card serial or receipt"
            aria-label="Lookup"
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--sc-spacing-3)',
              flexWrap: 'wrap',
              marginTop: 'var(--sc-spacing-4)',
            }}
          >
            <Button variant="primary">Lookup customer</Button>
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
