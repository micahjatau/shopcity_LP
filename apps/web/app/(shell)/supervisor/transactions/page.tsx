import { TransactionWorkspace } from '../../../../components/workflows/transaction-workspace';

export default function SupervisorTransactionsPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <TransactionWorkspace
        backHref="/supervisor"
        backLabel="Back to supervisor"
        presentation="supervisor"
      />
    </section>
  );
}
