import Link from 'next/link';
import { ApprovalsPanel } from '../../../../components/workflows';
import { CashierPageHeader } from '../../../../components/shopcity';

export default function AdminApprovalsPage() {
  return (
    <section className="supervisor-page supervisor-approval-page admin-approval-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Approval Centre"
        description="Financial exceptions waiting on a supervisor or administrator decision."
        actions={
          <Link className="admin-parity-back-link" href="/admin">
            Back to admin
          </Link>
        }
      />
      <ApprovalsPanel variant="admin" presentation="supervisor" />
    </section>
  );
}
