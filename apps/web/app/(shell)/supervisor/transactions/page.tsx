import { TransactionWorkspace } from '../../../../components/workflows/transaction-workspace';

export default function SupervisorTransactionsPage() {
  return (
    <TransactionWorkspace
      backHref="/supervisor"
      backLabel="Back to supervisor"
    />
  );
}
