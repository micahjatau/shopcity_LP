import { ApprovalsPanel } from '../../../../components/workflows';
import { CashierPageHeader } from '../../../../components/shopcity';

export default function SupervisorApprovalsPage() {
  return (
    <section className="supervisor-page supervisor-approval-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Approval Centre"
        description="Financial exceptions waiting on a supervisor or administrator decision."
      />
      <ApprovalsPanel variant="supervisor" />
    </section>
  );
}
