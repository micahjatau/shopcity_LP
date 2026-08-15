'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert, Sheet } from '../../../components/ui';
import {
  AdminOperationsPanel,
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
          Operations, audit, users, devices, branches and settings.
        </p>
      </header>

      <WorkflowSection
        title="Admin routes"
        description="Each admin function now has a route-backed entry point."
      >
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <Link href="/admin/operations">Operations</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/devices">Devices</Link>
          <Link href="/admin/cards">Cards</Link>
          <Link href="/admin/branches">Branches</Link>
          <Link href="/admin/audit">Audit</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/adjustments">Adjustments</Link>
        </div>
      </WorkflowSection>

      <PilotHealthPanel />

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        <article style={cardStyle} aria-label="Operations summary">
          <h2 style={{ marginTop: 0 }}>Operations summary</h2>
          <ReportsWorkspace />
        </article>

        <article style={cardStyle} aria-label="Admin contracts">
          <h2 style={{ marginTop: 0 }}>Admin contracts</h2>
          <AdminOperationsPanel />
        </article>

        <article style={cardStyle} aria-label="Admin workspace map">
          <h2 style={{ marginTop: 0 }}>Workspace map</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            {[
              ['Operations', 'Release health, queue state and operational incident signals.'],
              ['Audit', 'Actor, branch, device and timeline tracing.'],
              ['Users & Devices', 'Role assignment and device administration boundaries.'],
              ['Cards', 'Lookup, assign, replace, and block workflows.'],
              ['Branches', 'Branch create and edit surfaces.'],
            ].map(([title, body]) => (
              <article key={title} style={cardStyle}>
                <strong>{title}</strong>
                <p style={muted}>{body}</p>
              </article>
            ))}
          </div>
          <div style={statusRow}>
            <StatusBadge label="Contract-backed data" tone="success" />
            <StatusBadge label="Role-scoped" tone="info" />
          </div>
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Operational notices</h2>
          <Alert tone="info" title="Admin workspace">
            Tenant-wide operations, audit and device controls remain separate from cashier and supervisor tasks.
          </Alert>
          <Sheet open title="Release note">
            <p>
              Contract-backed admin surfaces should remain data-driven as the backend endpoints land.
            </p>
          </Sheet>
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
