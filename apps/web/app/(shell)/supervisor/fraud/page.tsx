import Link from 'next/link';
import { FraudFlagsPanel } from '../../../../components/workflows';

export default function SupervisorFraudPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Fraud</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Evidence-led fraud review and decisioning.
        </p>
        <Link href="/supervisor">Back to supervisor</Link>
      </header>
      <FraudFlagsPanel />
    </section>
  );
}
