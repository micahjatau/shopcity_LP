import { TransactionWorkspace } from '../../../../components/workflows/transaction-workspace';
import { TransactionDashboard } from '../../../../components/workflows/transaction-dashboard';

export default function SupervisorTransactionsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <TransactionDashboard />
      <TransactionWorkspace
        backHref="/supervisor"
        backLabel="Back to supervisor"
      />
    </section>
  );
}
