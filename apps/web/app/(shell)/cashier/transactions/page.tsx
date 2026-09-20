import { TransactionDashboard } from '../../../../components/workflows/transaction-dashboard';

export default function CashierTransactionsPage() {
  return (
    <section
      className="cashier-transactions-page"
      aria-labelledby="cashier-transactions-title"
    >
      <header className="cashier-transactions-page__header">
        <p className="cashier-transactions-page__eyebrow">Cashier workspace</p>
        <h1 id="cashier-transactions-title">Transactions</h1>
        <p>
          Review today&apos;s cashier activity and open an authoritative
          transaction summary.
        </p>
      </header>
      <TransactionDashboard />
    </section>
  );
}
