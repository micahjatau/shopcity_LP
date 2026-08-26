import Link from 'next/link';
import { CashierOverviewContext } from '../../../components/workflows/cashier-overview-context';
import { CashierOverviewLookup } from '../../../components/workflows/cashier-overview-lookup';

const cashierActions = [
  {
    title: 'Earn',
    href: '/cashier/earn',
    body: 'Credit a customer after confirming the purchase amount.',
  },
  {
    title: 'Redeem',
    href: '/cashier/redeem',
    body: 'Apply available loyalty credit with an authoritative review.',
  },
  {
    title: 'Find customer',
    href: '/cashier/lookup',
    body: 'Scan or enter a card serial to load customer context.',
  },
] as const;

export default function CashierPage() {
  return (
    <section className="cashier-overview">
      <header className="cashier-overview-header">
        <div>
          <p className="cashier-kicker">Cashier workspace</p>
          <h1>Ready for the next customer</h1>
          <p className="cashier-muted">
            Scan or enter a card, verify the customer, then confirm the server
            result.
          </p>
        </div>
        <Link href="/cashier/lookup" className="cashier-primary-action">
          Scan or enter card
        </Link>
      </header>
      <CashierOverviewContext />
      <CashierOverviewLookup />

      <section
        className="cashier-launcher"
        aria-labelledby="cashier-launcher-title"
      >
        <div>
          <h2 id="cashier-launcher-title">Choose a task</h2>
          <p className="cashier-muted">
            The three cashier actions stay one tap away.
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
          gap: var(--sc-spacing-5);
        }

        .cashier-overview-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--sc-spacing-5);
          flex-wrap: wrap;
        }

        .cashier-overview-header h1,
        .cashier-launcher h2 {
          margin: 0;
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
          gap: var(--sc-spacing-4);
          border-top: 1px solid var(--sc-color-semantic-border);
          padding-top: var(--sc-spacing-4);
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
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: var(--sc-radius-lg);
          background: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-5);
          box-shadow: var(--sc-shadow-level1);
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
          border: 1px solid var(--sc-color-brand-700);
          border-radius: var(--sc-radius-full);
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-3) var(--sc-spacing-5);
          font-weight: 700;
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
