import Link from 'next/link';
import { CashierOverviewLookup } from '../../../components/workflows/cashier-overview-lookup';

export default function CashierPage() {
  return (
    <section className="cashier-overview">
      <header className="cashier-overview-header">
        <div>
          <h1>Hi, Cashier!</h1>
          <p className="cashier-muted cashier-welcome">
            Welcome back to your dashboard
          </p>
        </div>
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
      </header>
      <CashierOverviewLookup />

      <style>{`
        .cashier-overview {
          display: grid;
          gap: 24px;
          max-width: 1088px;
          margin: 0 auto;
        }

        .cashier-overview-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .cashier-overview-header h1,
        .cashier-launcher h2 {
          margin: 0;
          letter-spacing: -0.04em;
        }

        .cashier-overview-header h1 {
          font-family: 'Avenir Next', 'Century Gothic', 'Trebuchet MS', var(--sc-font-family-sans);
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .cashier-welcome {
          color: var(--sc-color-brand-700);
          font-size: 15px;
        }

        .cashier-overview-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cashier-kicker,
        .cashier-context-label {
          margin: 0 0 var(--sc-spacing-2);
          color: var(--sc-color-brand-700);
          font-size: var(--sc-font-size-sm);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cashier-overview-status {
          display: flex;
          gap: var(--sc-spacing-3);
          flex-wrap: wrap;
          align-items: center;
        }


        .cashier-context-strip {
          display: grid;
          gap: var(--sc-spacing-3);
          grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
          align-items: center;
          border-block: 1px solid var(--sc-color-semantic-border);
          padding-block: var(--sc-spacing-3);
        }

        .cashier-context-item {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .cashier-context-item span,
        .cashier-context-item small {
          color: var(--sc-color-semantic-textSecondary);
          font-size: var(--sc-font-size-sm);
        }

        .cashier-context-item strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cashier-context-sync {
          white-space: nowrap;
          font-weight: 700;
        }

        .cashier-primary-action,
        .cashier-secondary-action {
          align-self: start;
          min-height: 34px;
          border: 1px solid var(--sc-color-brand-700);
          border-radius: 999px;
          padding: 0 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          text-decoration: none;
          transition: border-color 120ms ease, transform 120ms ease;
        }

        .cashier-primary-action {
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-brand-700);
        }

        .cashier-secondary-action {
          background: linear-gradient(90deg, var(--sc-color-brand-700), #d86200);
          color: var(--sc-color-neutral-0);
          border-color: transparent;
        }

        .cashier-secondary-action--disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .cashier-primary-action:hover {
          border-color: var(--sc-color-brand-500);
          transform: translateY(-1px);
        }

        .cashier-primary-action:focus-visible {
          outline: 3px solid var(--sc-color-warning-300);
          outline-offset: 3px;
        }

        .cashier-muted {
          margin: 0;
          color: var(--sc-color-semantic-textSecondary);
        }

        @media (max-width: 800px) {
          .cashier-context-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cashier-overview-actions,
          .cashier-primary-action,
          .cashier-secondary-action {
            width: 100%;
          }

          .cashier-context-sync {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </section>
  );
}
