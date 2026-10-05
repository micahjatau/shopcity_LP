'use client';

import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { CashierPageHeader } from '../../../components/shopcity';

export default function SupervisorPage() {
  return (
    <section className="supervisor-page" data-od-id="overview-main">
      <ScannerContextScope context="lookup" />
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Hi, Supervisor!"
        description="Welcome back to your dashboard"
        dataOdId="overview-heading"
      />
    </section>
  );
}
