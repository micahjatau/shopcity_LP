import { FraudFlagsPanel } from '../../../../components/workflows';
import { CashierPageHeader } from '../../../../components/shopcity';

export default function SupervisorFraudPage() {
  return (
    <section className="supervisor-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Flagged activity"
        description="Review patterns, check the context, and record the next step."
      />
      <FraudFlagsPanel presentation="supervisor" />
    </section>
  );
}
