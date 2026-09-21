import { TransactionDashboard } from '../../../../components/workflows/transaction-dashboard';

export default function CashierTransactionsPage() {
  return (
    <section
      className="cashier-transactions-page"
      aria-labelledby="cashier-transactions-title"
    >
      <header className="cashier-transactions-page__header">
        <p className="cashier-transactions-page__eyebrow">
          Operations · Live ledger
        </p>
        <h1 id="cashier-transactions-title">Transactions</h1>
        <p>Captured receipts and the credit issued against them.</p>
      </header>
      <TransactionDashboard />
    </section>
  );
}
