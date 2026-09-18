import Link from 'next/link';
import { CashierOverviewContext } from '../../../components/workflows/cashier-overview-context';
import { CashierOverviewLookup } from '../../../components/workflows/cashier-overview-lookup';

const cashierActions = [
  {
    title: 'Capture Purchase',
    href: '/cashier/earn',
    body: 'Record a POS receipt so ShopCity Credit can be issued.',
  },
  {
    title: 'Redeem Credit',
    href: '/cashier/redeem',
    body: 'Apply available ShopCity Credit to a customer basket.',
  },
  {
    title: 'Find Customer',
    href: '/cashier/lookup',
    body: 'Search by card serial and verify the customer wallet.',
  },
] as const;

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
        <Link href="/cashier/lookup" className="cashier-primary-action">
          Find Customer
        </Link>
      </header>
      <CashierOverviewContext />
      <CashierOverviewLookup />

      <section
        className="cashier-launcher"
        aria-labelledby="cashier-launcher-title"
      >
        <div>
          <h2 id="cashier-launcher-title">Quick actions</h2>
          <p className="cashier-muted">
            Start the same workflows from the prototype dashboard.
          </p>
        </div>
        <div className="cashier-action-grid">
          {cashierActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="cashier-action-card"
            >
              <strong>{action.title}</strong>
              <span>{action.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .cashier-overview {
          display: grid;
          gap: 24px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .cashier-overview-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 6px;
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

        .cashier-action-grid {
          display: grid;
          gap: var(--sc-spacing-3);
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .cashier-launcher {
          display: grid;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          background: var(--sc-color-neutral-0);
          box-shadow: none;
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

        .cashier-action-card {
          display: grid;
          gap: var(--sc-spacing-2);
          min-height: 116px;
          align-content: space-between;
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          background: var(--sc-color-neutral-0);
          padding: 20px 22px;
          box-shadow: none;
        }

        .cashier-action-card strong {
          color: var(--sc-color-brand-700);
          font-size: var(--sc-font-size-lg);
        }

        .cashier-action-card span {
          color: var(--sc-color-semantic-textSecondary);
          line-height: var(--sc-line-height-base);
        }

        .cashier-action-card {
          color: inherit;
          text-decoration: none;
          transition: border-color 120ms ease, transform 120ms ease;
        }

        .cashier-action-card:hover,
        .cashier-primary-action:hover {
          border-color: var(--sc-color-brand-500);
          transform: translateY(-1px);
        }

        .cashier-primary-action {
          align-self: start;
          min-height: 40px;
          border: 1px solid var(--sc-color-brand-700);
          border-radius: 999px;
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: border-color 120ms ease, transform 120ms ease;
        }

        .cashier-action-card:focus-visible,
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

          .cashier-action-grid {
            grid-template-columns: 1fr;
          }

          .cashier-primary-action {
            width: 100%;
            text-align: center;
          }

          .cashier-context-sync {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </section>
  );
}
