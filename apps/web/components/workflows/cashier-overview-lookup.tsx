'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money } from '../shopcity';

type TodayTransaction = ReportsControllerListCashierTodayV1200DataItemsItem;

export function CashierOverviewLookup() {
  const [todayTransactions, setTodayTransactions] = useState<
    TodayTransaction[] | null
  >(null);
  const [todayMessage, setTodayMessage] = useState('Loading today’s activity…');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadTodayTransactions() {
      try {
        const response = await reportsControllerListCashierTodayV1(
          createApiRequest({ csrf: true }),
        );
        if (response.status !== 200) {
          throw new Error('activity request failed');
        }
        if (!ignore) {
          setTodayTransactions(response.data.data.items);
          setTodayMessage('');
        }
      } catch {
        if (!ignore) {
          setTodayTransactions(null);
          setTodayMessage('Today’s activity is temporarily unavailable.');
        }
      }
    }

    void loadTodayTransactions();
    return () => {
      ignore = true;
    };
  }, []);

  const loadedTransactions = todayTransactions ?? [];
  const visibleTransactions = useMemo(() => {
    const loaded = todayTransactions ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return loaded;
    }
    return loaded.filter((transaction) =>
      transaction.receiptNumber?.toLowerCase().includes(normalizedSearch),
    );
  }, [search, todayTransactions]);
  const earnTransactions = loadedTransactions.filter(
    (transaction) => transaction.operation === 'EARN',
  );
  const redeemTransactions = loadedTransactions.filter(
    (transaction) => transaction.operation === 'REDEEM',
  );
  const creditIssuedKobo = earnTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.loyaltyAmountKobo ?? 0),
    0,
  );

  return (
    <section
      className="cashier-overview-lookup"
      aria-labelledby="cashier-today-title"
    >
      <h2 className="section-label" id="cashier-today-title">
        Today&apos;s Activity
      </h2>
      <p className="cashier-overview-notice" role="status">
        {todayMessage}
      </p>
      <div className="cashier-metrics" data-od-id="activity-metrics">
        <article className="cashier-metric">
          <div className="metric-label">Receipts loaded</div>
          <div className="metric-value">{loadedTransactions.length || '—'}</div>
          <div className="metric-note">Loaded from cashier activity</div>
        </article>
        <article className="cashier-metric">
          <div className="metric-label">Purchases captured</div>
          <div className="metric-value">{earnTransactions.length || '—'}</div>
          <div className="metric-note">Captured receipts</div>
        </article>
        <article className="cashier-metric">
          <div className="metric-label">Credit issued</div>
          <div className="metric-value">
            {creditIssuedKobo > 0 ? (
              <Money amountKobo={creditIssuedKobo} />
            ) : (
              '—'
            )}
          </div>
          <div className="metric-note">Issued by the server</div>
        </article>
        <article className="cashier-metric">
          <div className="metric-label">Credit redeemed</div>
          <div className="metric-value">{redeemTransactions.length || '—'}</div>
          <div className="metric-note">Redeemed transactions</div>
        </article>
      </div>

      <section
        className="cashier-today-card"
        aria-labelledby="recent-heading"
        data-od-id="recent-transactions"
      >
        <div className="table-head">
          <div>
            <h2 id="recent-heading">Recent Transactions</h2>
            {todayMessage ? (
              <p className="cashier-muted">{todayMessage}</p>
            ) : (
              <p className="cashier-muted">
                Live activity from your cashier account
              </p>
            )}
          </div>
          <label className="table-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search recent transactions"
              placeholder="Search receipt"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {visibleTransactions.length ? (
          <div className="table-wrap">
            <table className="cashier-table">
              <thead>
                <tr>
                  <th>Customer / receipt</th>
                  <th>Operation</th>
                  <th>Credit</th>
                  <th>Status</th>
                  <th>Date &amp; time</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>#{transaction.receiptNumber}</td>
                    <td>{transaction.operation}</td>
                    <td
                      className="amount"
                      aria-label={
                        transaction.loyaltyAmountKobo === null
                          ? undefined
                          : `${transaction.operation === 'EARN' ? 'Credit added' : 'Credit redeemed'}: ${transaction.loyaltyAmountKobo} kobo`
                      }
                    >
                      {transaction.loyaltyAmountKobo === null ? (
                        'Pending calculation'
                      ) : (
                        <>
                          <span aria-hidden="true">
                            {transaction.operation === 'EARN' ? '+' : '−'}
                          </span>{' '}
                          <Money amountKobo={transaction.loyaltyAmountKobo} />
                        </>
                      )}
                    </td>
                    <td>
                      <span className="status-pill">{transaction.status}</span>
                    </td>
                    <td>
                      <time dateTime={transaction.occurredAt}>
                        {new Intl.DateTimeFormat('en-NG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(transaction.occurredAt))}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : todayTransactions ? (
          <p className="cashier-empty">
            {search
              ? 'No matching transactions.'
              : 'No transactions recorded today.'}
          </p>
        ) : null}
        <div className="table-foot">
          <span>
            {visibleTransactions.length} loaded transaction
            {visibleTransactions.length === 1 ? '' : 's'}
          </span>
          <Link href="/supervisor/transactions">View all transactions →</Link>
        </div>
      </section>

      <style>{`
        .cashier-overview-lookup {
          display: grid;
          gap: 22px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .cashier-overview-notice {
          margin: -8px 0 0;
          color: var(--sc-color-semantic-textSecondary);
          font-size: 14px;
        }

        .cashier-overview-lookup h2,
        .cashier-today-card h2 {
          margin: 0;
        }

        .section-label {
          color: var(--sc-color-neutral-800);
          font-family: var(--sc-prototype-fontDisplaySans);
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 -10px;
        }

        .cashier-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .cashier-metric,
        .cashier-today-card {
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
        }

        .cashier-metric {
          min-height: 133px;
          padding: 20px 24px;
        }

        .cashier-metric:first-child {
          border-color: var(--sc-color-brand-700);
        }

        .metric-label {
          color: var(--sc-color-neutral-800);
          font-size: 15px;
          margin-bottom: 23px;
        }

        .metric-value {
          color: var(--sc-color-brand-700);
          font-family: var(--sc-prototype-fontDisplaySans);
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }

        .metric-note {
          color: var(--sc-color-semantic-textSecondary);
          font-size: 11px;
          margin-top: 4px;
        }

        .cashier-today-card {
          display: grid;
          gap: 0;
          overflow: hidden;
          padding: 16px;
        }

        .table-foot {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 8px 0;
          color: var(--sc-color-semantic-textSecondary);
          font-size: 12px;
        }

        .table-foot a {
          color: var(--sc-color-brand-700);
          font-weight: 600;
        }

        .table-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 13px;
          border-bottom: 1px solid var(--sc-color-semantic-border);
        }

        .table-search {
          width: min(220px, 42vw);
          height: 26px;
          border-radius: 999px;
          background: var(--sc-color-neutral-50);
          color: var(--sc-color-semantic-textSecondary);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          font-size: 11px;
        }

        .table-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: currentColor;
          font-size: 11px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .cashier-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .cashier-table th,
        .cashier-table td {
          text-align: left;
          padding: 13px 24px;
          border-bottom: 1px solid var(--sc-color-semantic-border);
          white-space: nowrap;
        }

        .cashier-table th {
          color: var(--sc-color-neutral-700);
          background: var(--sc-color-neutral-50);
          font-size: 12px;
          font-weight: 500;
        }

        .cashier-table td {
          color: var(--sc-color-semantic-textSecondary);
          font-size: 13px;
        }

        .cashier-table td:first-child,
        .cashier-table .amount {
          color: var(--sc-color-neutral-900);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          color: var(--sc-color-success-700);
          background: var(--sc-color-success-50);
          padding: 4px 9px;
          font-size: 11px;
        }

        .status-pill::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .cashier-empty {
          padding: 45px;
          text-align: center;
          color: var(--sc-color-semantic-textSecondary);
        }

        @media (max-width: 920px) {
          .cashier-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .table-head {
            align-items: stretch;
            flex-direction: column;
          }

          .table-search {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .cashier-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
