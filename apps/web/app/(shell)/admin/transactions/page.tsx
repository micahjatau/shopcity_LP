import { AdminTransactionsDashboard } from '../../../../components/workflows/supervisor-transactions-dashboard';

const relatedRoutes = [
  ['/admin/approvals', 'Approvals'],
  ['/admin/fraud', 'Fraud'],
  ['/admin/reports', 'Reports'],
] as const;

export default function AdminTransactionsPage() {
  return <AdminTransactionsDashboard relatedRoutes={relatedRoutes} />;
}
