import Link from 'next/link';
import { CashierOverviewLookup } from '../../../components/workflows/cashier-overview-lookup';

export default function CashierPage() {
  return (
    <section className="cashier-overview" data-od-id="overview-main">
      <header className="cashier-overview-header" data-od-id="overview-heading">
        <div className="sc-page-head__copy">
          <h1 data-od-id="overview-title">Hi, Cashier!</h1>
          <p>Welcome back to your dashboard</p>
        </div>
        <div className="cashier-overview-actions" data-od-id="overview-actions">
          <span
            className="cashier-secondary-action cashier-secondary-action--disabled"
            aria-label="Register customer requires supervisor or administrator access"
            title="Customer registration is restricted to supervisor and administrator roles"
            data-od-id="register-customer"
          >
            Register Customer
          </span>
          <Link
            href="/cashier/lookup"
            className="cashier-primary-action"
            data-od-id="find-customer"
          >
            Find Customer
          </Link>
        </div>
      </header>
      <CashierOverviewLookup />
    </section>
  );
}
