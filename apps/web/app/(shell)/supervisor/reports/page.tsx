import Link from 'next/link';
import { ReportsWorkspace } from '../../../../components/workflows';

export default function SupervisorReportsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Selectable reports with filters, freshness, refresh, and export.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>
      <ReportsWorkspace />
    </section>
  );
}
