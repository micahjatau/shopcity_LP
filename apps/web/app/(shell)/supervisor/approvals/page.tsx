import { ApprovalsPanel } from '../../../../components/workflows';
import { CashierPageHeader } from '../../../../components/shopcity';

export default function SupervisorApprovalsPage() {
  return (
    <section className="supervisor-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Approvals"
        description="Review pending transactions and recent decisions."
      />
      <ApprovalsPanel />
    </section>
  );
}
