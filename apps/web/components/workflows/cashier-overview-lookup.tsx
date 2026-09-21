'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money, CashierTableToolbar, ShopCityCard } from '../shopcity';

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
        <ShopCityCard
          as="article"
          variant="metric"
          className="cashier-metric"
          data-od-id="metric-receipts"
        >
          <div className="metric-label">Receipts loaded</div>
          <div className="metric-value">{loadedTransactions.length || '—'}</div>
          <div className="metric-note">Loaded from cashier activity</div>
        </ShopCityCard>
        <ShopCityCard
          as="article"
          variant="metric"
          className="cashier-metric"
          data-od-id="metric-earn"
        >
          <div className="metric-label">Purchases captured</div>
          <div className="metric-value">{earnTransactions.length || '—'}</div>
          <div className="metric-note">Captured receipts</div>
        </ShopCityCard>
        <ShopCityCard
          as="article"
          variant="metric"
          className="cashier-metric"
          data-od-id="metric-issued"
        >
          <div className="metric-label">Credit issued</div>
          <div className="metric-value">
            {creditIssuedKobo > 0 ? (
              <Money amountKobo={creditIssuedKobo} />
            ) : (
              '—'
            )}
          </div>
          <div className="metric-note">Issued by the server</div>
        </ShopCityCard>
        <ShopCityCard
          as="article"
          variant="metric"
          className="cashier-metric"
          data-od-id="metric-redeemed"
        >
          <div className="metric-label">Credit redeemed</div>
          <div className="metric-value">{redeemTransactions.length || '—'}</div>
          <div className="metric-note">Redeemed transactions</div>
        </ShopCityCard>
      </div>

      <ShopCityCard
        as="section"
        variant="table"
        className="cashier-today-card"
        aria-labelledby="recent-heading"
        data-od-id="recent-transactions"
      >
        <CashierTableToolbar
          title={<span id="recent-heading">Recent Transactions</span>}
          description={
            todayMessage || 'Live activity from your cashier account'
          }
          searchLabel="Search recent transactions"
          searchPlaceholder="Search receipt"
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
        />
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
          <Link href="/cashier/transactions">View all transactions →</Link>
        </div>
      </ShopCityCard>
    </section>
  );
}
