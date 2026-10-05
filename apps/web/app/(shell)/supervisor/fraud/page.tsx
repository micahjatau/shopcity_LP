import { FraudFlagsPanel } from '../../../../components/workflows';
import { CashierPageHeader } from '../../../../components/shopcity';

export default function SupervisorFraudPage() {
  return (
    <section className="supervisor-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Fraud"
        description="Review flagged activity and record an acknowledgment or resolution."
      />
      <FraudFlagsPanel />
    </section>
  );
}
