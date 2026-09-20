import Link from 'next/link';
import { CashierPageHeader } from '../../../components/shopcity';
import { CashierOverviewLookup } from '../../../components/workflows/cashier-overview-lookup';

export default function CashierPage() {
  return (
    <section className="cashier-overview">
      <CashierPageHeader
        className="cashier-overview-header"
        title="Hi, Cashier!"
        description="Welcome back to your dashboard"
        actions={
          <div className="cashier-overview-actions">
            <span
              className="cashier-secondary-action cashier-secondary-action--disabled"
              aria-label="Register customer requires supervisor or administrator access"
              title="Customer registration is restricted to supervisor and administrator roles"
            >
              Register Customer
            </span>
            <Link href="/cashier/lookup" className="cashier-primary-action">
              Find Customer
            </Link>
          </div>
        }
      />
      <CashierOverviewLookup />

    </section>
  );
}
