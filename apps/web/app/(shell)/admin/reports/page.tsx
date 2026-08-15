import Link from 'next/link';
import { ReportsWorkspace } from '../../../../components/workflows';

export default function AdminReportsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Administrative reporting with filter, refresh, and export controls.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <ReportsWorkspace />
    </section>
  );
}
