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
      <style>{`
        .cashier-transactions-page {
          display: grid;
          gap: 24px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .cashier-transactions-page__header {
          display: grid;
          gap: 8px;
        }

        .cashier-transactions-page__header h1,
        .cashier-transactions-page__header p {
          margin: 0;
        }

        .cashier-transactions-page__header h1 {
          color: var(--sc-color-brand-700);
          font-family: var(--sc-prototype-fontDisplaySans);
          font-size: clamp(30px, 4vw, 34px);
          letter-spacing: -0.04em;
          line-height: 1.05;
        }

        .cashier-transactions-page__header > p:last-child {
          color: var(--sc-color-brand-700);
          font-size: 15px;
        }

        .cashier-transactions-page__eyebrow {
          color: var(--sc-prototype-accent);
          font-family: var(--sc-font-family-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>
    </section>
  );
}
