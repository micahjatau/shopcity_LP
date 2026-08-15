import Link from 'next/link';
import { ApprovalsPanel } from '../../../../components/workflows';

export default function SupervisorApprovalsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Approvals</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Detail-led approval review with live backend data.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>
      <ApprovalsPanel />
    </section>
  );
}
