import Link from 'next/link';
import { PilotHealthPanel, ReportsWorkspace } from '../../../../components/workflows';

export default function AdminOperationsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Operations</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Live pilot operations summary and operational reporting.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <PilotHealthPanel />
      <ReportsWorkspace />
    </section>
  );
}
