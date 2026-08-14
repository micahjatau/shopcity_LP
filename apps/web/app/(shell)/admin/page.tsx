import type { CSSProperties } from 'react';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Button } from '../../../components/ui';
import {
  PilotHealthPanel,
  WorkflowSection,
} from '../../../components/workflows';

export default function AdminPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="sync" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Admin shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Operations, audit, users, devices and settings.
        </p>
      </header>

      <PilotHealthPanel />

      <WorkflowSection
        title="Admin routes"
        description="Cross-branch and system-level screens for operations and review."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {['Operations', 'Audit', 'Users & Devices', 'Settings'].map(
            (item) => (
              <article key={item} style={cardStyle}>
                <strong>{item}</strong>
                <p style={muted}>Route placeholder</p>
              </article>
            ),
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <Button variant="primary">View operations</Button>
          <Button variant="secondary">Open audit trail</Button>
        </div>
      </WorkflowSection>
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
