'use client';

import { useEffect, useState } from 'react';
import {
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { formatMoney } from '../shopcity/money';

type CashierActivityItem = ReportsControllerListCashierTodayV1200DataItemsItem;
type StatusTone = 'approved' | 'pending' | 'denied' | 'neutral';

type RecentRedemptionsState =
  | { status: 'loading'; items: [] }
  | { status: 'loaded'; items: CashierActivityItem[] }
  | { status: 'error'; items: [] };

const MAX_VISIBLE_REDEMPTIONS = 6;

function getRedemptionStatus(status: string): {
  label: string;
  tone: StatusTone;
} {
  const normalizedStatus =
    typeof status === 'string' ? status.trim().toUpperCase() : '';
  switch (normalizedStatus) {
    case 'APPROVED':
    case 'CONFIRMED':
      return { label: 'Approved', tone: 'approved' };
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return { label: 'Pending', tone: 'pending' };
    case 'DENIED':
    case 'REJECTED':
      return { label: 'Denied', tone: 'denied' };
    case 'FAILED':
      return { label: 'Failed', tone: 'denied' };
    case 'EXPIRED':
      return { label: 'Expired', tone: 'neutral' };
    case 'REVERSED':
      return { label: 'Reversed', tone: 'neutral' };
    default:
      return { label: 'Outcome unavailable', tone: 'neutral' };
  }
}

function getRedemptionAmount(item: CashierActivityItem): {
  label: string;
  amountKobo: number | null;
} {
  const status =
    typeof item.status === 'string' ? item.status.trim().toUpperCase() : '';
  const confirmed = status === 'CONFIRMED' || status === 'APPROVED';
  const reversed = status === 'REVERSED';
  const amountKobo = confirmed
    ? item.redeemedAmountKobo
    : item.loyaltyAmountKobo;

  if (
    typeof amountKobo !== 'number' ||
    !Number.isSafeInteger(amountKobo) ||
    amountKobo < 0
  ) {
    return { label: 'Amount unavailable', amountKobo: null };
  }

  return {
    label: confirmed ? 'Redeemed' : reversed ? 'Reversed' : 'Requested',
    amountKobo,
  };
}

function formatRedemptionAmount(amountKobo: number) {
  const formatted = formatMoney(amountKobo);
  return amountKobo % 100 === 0 ? formatted.replace(/\.00$/, '') : formatted;
}

export function RecentCashierRedemptions() {
  const [state, setState] = useState<RecentRedemptionsState>({
    status: 'loading',
    items: [],
  });

  useEffect(() => {
    let active = true;

    async function loadRecentRedemptions() {
      try {
        const response = await reportsControllerListCashierTodayV1(
          undefined,
          createApiRequest({ csrf: true }),
        );
        if (!active) return;
        if (response.status !== 200) {
          setState({ status: 'error', items: [] });
          return;
        }

        setState({
          status: 'loaded',
          items: response.data.data.items
            .filter((item) => item.operation === 'REDEEM')
            .slice(0, MAX_VISIBLE_REDEMPTIONS),
        });
      } catch {
        if (active) setState({ status: 'error', items: [] });
      }
    }

    void loadRecentRedemptions();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="cashier-recent-redemptions"
      aria-labelledby="cashier-recent-redemptions-title"
      data-od-id="redeem-recent-table"
    >
      <h3 id="cashier-recent-redemptions-title">Recently redeemed</h3>
      {state.status === 'loading' ? (
        <p className="cashier-recent-redemptions__message" role="status">
          Loading recent redemptions…
        </p>
      ) : state.status === 'error' ? (
        <p className="cashier-recent-redemptions__message" role="status">
          Recent redemptions are temporarily unavailable.
        </p>
      ) : state.items.length === 0 ? (
        <p className="cashier-recent-redemptions__message">
          No recent redemptions found.
        </p>
      ) : (
        <div className="cashier-recent-redemptions__table-scroll">
          <table className="cashier-recent-redemptions__table">
            <caption className="sr-only">
              Recent redemption activity from the current cashier’s activity
              feed
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Customer and receipt</th>
                <th scope="col">Amount</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((item) => {
                const outcome = getRedemptionStatus(item.status);
                const amount = getRedemptionAmount(item);
                const customerName =
                  typeof item.customerName === 'string'
                    ? item.customerName.trim()
                    : '';
                const receiptNumber =
                  typeof item.receiptNumber === 'string'
                    ? item.receiptNumber.trim()
                    : '';
                const formattedAmount =
                  amount.amountKobo === null
                    ? null
                    : formatRedemptionAmount(amount.amountKobo);

                return (
                  <tr key={item.id}>
                    <th
                      scope="row"
                      className="cashier-recent-redemptions__customer"
                    >
                      <strong>{customerName || 'Customer unavailable'}</strong>
                      <span>
                        {receiptNumber
                          ? `Receipt ${receiptNumber}`
                          : 'Receipt unavailable'}
                      </span>
                    </th>
                    <td className="cashier-recent-redemptions__amount">
                      <span className="cashier-recent-redemptions__amount-kind">
                        {amount.label}
                      </span>
                      {formattedAmount ? (
                        <span
                          className={`sc-money cashier-recent-redemptions__amount-value cashier-recent-redemptions__amount-value--${outcome.tone}`}
                          aria-label={formattedAmount}
                        >
                          {formattedAmount}
                        </span>
                      ) : null}
                    </td>
                    <td className="cashier-recent-redemptions__outcome">
                      <span
                        className={`cashier-recent-redemptions__status cashier-recent-redemptions__status--${outcome.tone}`}
                      >
                        {outcome.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
