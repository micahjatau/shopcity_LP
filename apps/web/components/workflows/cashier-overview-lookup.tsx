'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money, CashierTableToolbar, ShopCityCard } from '../shopcity';
import { TransactionCreditBreakdown } from './transaction-credit-breakdown';

type TodayTransaction = ReportsControllerListCashierTodayV1200DataItemsItem;

function statusTone(status: TodayTransaction['status']) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'CONFIRMED') {
    return 'approved';
  }
  if (
    normalized.includes('FAIL') ||
    normalized.includes('REJECT') ||
    normalized.includes('DENIED')
  ) {
    return 'failed';
  }
  return 'pending';
}

function statusLabel(status: TodayTransaction['status']) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'CONFIRMED')
    return 'Approved';
  if (normalized.includes('REJECT') || normalized.includes('DENIED')) {
    return 'Denied';
  }
  if (normalized.includes('FAIL')) return 'Failed';
  if (normalized.includes('PENDING')) return 'Pending';
  return status;
}

export function CashierOverviewLookup() {
  const [todayTransactions, setTodayTransactions] = useState<
    TodayTransaction[] | null
  >(null);
  const [todayMessage, setTodayMessage] = useState('Loading today’s activity…');
  const [activityError, setActivityError] = useState(false);
  const [search, setSearch] = useState('');
  const [timezone, setTimezone] = useState('Africa/Lagos');

  useEffect(() => {
    let ignore = false;
    async function loadTodayTransactions() {
      try {
        const response = await reportsControllerListCashierTodayV1(
          undefined,
          createApiRequest({ csrf: true }),
        );
        if (response.status !== 200) {
          throw new Error('activity request failed');
        }
        if (!ignore) {
          setTodayTransactions(response.data.data.items);
          setTimezone(response.data.data.timezone || 'Africa/Lagos');
          setTodayMessage('');
          setActivityError(false);
        }
      } catch {
        if (!ignore) {
          setTodayTransactions(null);
          setTodayMessage('Today’s activity is temporarily unavailable.');
          setActivityError(true);
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
    return loaded.filter(
      (transaction) =>
        transaction.receiptNumber?.toLowerCase().includes(normalizedSearch) ||
        transaction.customerName?.toLowerCase().includes(normalizedSearch),
    );
  }, [search, todayTransactions]);
  const earnTransactions = loadedTransactions.filter(
    (transaction) => transaction.operation === 'EARN',
  );
  const redeemTransactions = loadedTransactions.filter(
    (transaction) => transaction.operation === 'REDEEM',
  );
  const creditIssuedKobo = loadedTransactions.reduce(
    (sum, transaction) =>
      sum +
      Number(
        transaction.earnedAmountKobo ??
          (transaction.operation === 'EARN'
            ? transaction.loyaltyAmountKobo
            : 0) ??
          0,
      ),
    0,
  );
  const activityLoaded = todayTransactions !== null;
  const hasPendingActivity = loadedTransactions.some((transaction) =>
    ['PENDING', 'PENDING_APPROVAL', 'AWAITING_APPROVAL', 'PROCESSING'].includes(
      String(transaction.status ?? '')
        .trim()
        .toUpperCase(),
    ),
  );
  const creditIssuedAvailable = activityLoaded && !hasPendingActivity;

  return (
    <section
      className="cashier-overview-lookup"
      aria-labelledby="cashier-today-title"
      data-od-id="overview-activity"
    >
      <h2
        className="section-label"
        id="cashier-today-title"
        data-od-id="activity-heading"
      >
        Today&apos;s Activity
      </h2>
      <p
        className={`cashier-overview-notice notice${activityError ? ' error' : ''}`}
        role="status"
      >
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
          <div className="metric-value">
            {activityLoaded ? loadedTransactions.length : '—'}
          </div>
          <div className="metric-note">Loaded from cashier activity</div>
        </ShopCityCard>
        <ShopCityCard
          as="article"
          variant="metric"
          className="cashier-metric"
          data-od-id="metric-earn"
        >
          <div className="metric-label">Purchases captured</div>
          <div className="metric-value">
            {activityLoaded ? earnTransactions.length : '—'}
          </div>
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
            {creditIssuedAvailable ? (
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
          data-od-id="metric-redeem"
        >
          <div className="metric-label">Redemptions</div>
          <div className="metric-value">
            {activityLoaded ? redeemTransactions.length : '—'}
          </div>
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
          title={
            <span id="recent-heading" data-od-id="recent-heading">
              Recent Transactions
            </span>
          }
          description="Today’s bounded cashier activity feed"
          searchLabel="Search recent transactions"
          searchPlaceholder="Search customer or receipt"
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
        />
        <div className="table-wrap">
          <table className="cashier-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Receipt No.</th>
                <th>Amount</th>
                <th>Credit</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.length ? (
                visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      {transaction.customerName || 'Customer unavailable'}
                    </td>
                    <td>{transaction.receiptNumber}</td>
                    <td className="amount">
                      {transaction.purchaseAmountKobo == null ? (
                        'Unavailable'
                      ) : (
                        <Money amountKobo={transaction.purchaseAmountKobo} />
                      )}
                    </td>
                    <td className="amount transaction-credit">
                      <TransactionCreditBreakdown
                        operation={transaction.operation}
                        status={transaction.status}
                        loyaltyAmountKobo={transaction.loyaltyAmountKobo}
                        redeemedAmountKobo={transaction.redeemedAmountKobo}
                        earnedAmountKobo={transaction.earnedAmountKobo}
                      />
                    </td>
                    <td>
                      <span
                        className={`status-pill status-pill--${statusTone(transaction.status)}`}
                      >
                        {statusLabel(transaction.status)}
                      </span>
                    </td>
                    <td>
                      <time dateTime={transaction.occurredAt}>
                        {new Intl.DateTimeFormat('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: timezone,
                        })
                          .format(new Date(transaction.occurredAt))
                          .replaceAll('/', '-')}
                      </time>
                    </td>
                  </tr>
                ))
              ) : todayTransactions ? (
                <tr>
                  <td colSpan={6}>
                    <div className="cashier-empty">
                      {search ? (
                        <>
                          <span>No matching transactions.</span>{' '}
                          <span>Try a customer name or receipt number.</span>
                        </>
                      ) : (
                        <strong>No transactions recorded today.</strong>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>
            {visibleTransactions.length} loaded transaction
            {visibleTransactions.length === 1 ? '' : 's'}
          </span>
          <Link href="/cashier/transactions">View today’s transactions →</Link>
        </div>
      </ShopCityCard>
    </section>
  );
}
