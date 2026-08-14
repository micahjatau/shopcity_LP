import type { CSSProperties } from 'react';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert, Button, Dialog, Sheet } from '../../../components/ui';
import {
  PilotHealthPanel,
  ReportsWorkspace,
  WorkflowSection,
} from '../../../components/workflows';
import { StatusBadge } from '../../../components/shopcity';

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

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Operations summary</h2>
          <ReportsWorkspace />
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Admin routes</h2>
          <WorkflowSection
            title="Cross-branch and system-level screens"
            description="These screens are reserved for tenant-wide review and administration."
          >
            <div
              style={{
                display: 'grid',
                gap: 'var(--sc-spacing-4)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              {[
                {
                  title: 'Operations',
                  body: 'Release health, queue state and operational incident signals.',
                },
                { title: 'Audit', body: 'Actor, branch, device and timeline tracing.' },
                {
                  title: 'Users & Devices',
                  body: 'Role assignment and device administration boundaries.',
                },
                { title: 'Settings', body: 'Tenant configuration and platform controls.' },
              ].map((item) => (
                <article key={item.title} style={cardStyle}>
                  <strong>{item.title}</strong>
                  <p style={muted}>{item.body}</p>
                </article>
              ))}
            </div>
            <div style={statusRow}>
              <StatusBadge label="Contract-backed data pending" tone="warning" />
              <StatusBadge label="Role-scoped" tone="info" />
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
              <Button variant="secondary">Manage devices</Button>
            </div>
          </WorkflowSection>
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Operational notices</h2>
          <Alert tone="info" title="Admin workspace">
            Tenant-wide operations, audit and device controls remain separate from cashier and supervisor tasks.
          </Alert>
          <Sheet open title="Release note">
            <p>Contract-backed admin surfaces should remain data-driven as the backend endpoints land.</p>
          </Sheet>
          <Dialog open={false} title="Hidden dialog">No-op</Dialog>
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

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
