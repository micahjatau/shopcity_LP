import { TransactionWorkspace } from '../../../../components/workflows/transaction-workspace';

const relatedRoutes = [
  ['/admin/approvals', 'Approvals'],
  ['/admin/fraud', 'Fraud'],
  ['/admin/reports', 'Reports'],
] as const;

export default function AdminTransactionsPage() {
  return (
    <TransactionWorkspace
      backHref="/admin"
      backLabel="Back to admin"
      presentation="supervisor"
      relatedRoutes={relatedRoutes}
    />
  );
}
