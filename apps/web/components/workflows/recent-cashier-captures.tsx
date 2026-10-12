'use client';

import { useEffect, useState } from 'react';
import {
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money } from '../shopcity';

type CashierActivityItem = ReportsControllerListCashierTodayV1200DataItemsItem;

type RecentCapturesState =
  | { status: 'loading'; items: [] }
  | { status: 'loaded'; items: CashierActivityItem[] }
  | { status: 'error'; items: [] };

function getCaptureStatus(status: string) {
  const value = status.toUpperCase();
  if (value === 'APPROVED' || value === 'CONFIRMED') {
    return { label: 'Approved', tone: 'approved' };
  }
  if (value.includes('DENIED') || value.includes('REJECT')) {
    return { label: 'Denied', tone: 'denied' };
  }
  if (value.includes('FAIL')) return { label: 'Failed', tone: 'denied' };
  if (value.includes('PENDING')) return { label: 'Pending', tone: 'pending' };
  return { label: status, tone: 'pending' };
}

export function RecentCashierCaptures() {
  const [state, setState] = useState<RecentCapturesState>({
    status: 'loading',
    items: [],
  });

  useEffect(() => {
    let active = true;

    async function loadRecentCaptures() {
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
            .filter((item) => item.operation === 'EARN')
            .slice(0, 6),
        });
      } catch {
        if (active) setState({ status: 'error', items: [] });
      }
    }

    void loadRecentCaptures();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="cashier-recent-captures"
      aria-labelledby="cashier-recent-captures-title"
      data-od-id="capture-recent-list"
    >
      <h3 id="cashier-recent-captures-title">Recently captured</h3>
      {state.status === 'loading' ? (
        <p className="cashier-recent-captures__message" role="status">
          Loading recent purchases…
        </p>
      ) : state.status === 'error' ? (
        <p className="cashier-recent-captures__message" role="status">
          Recent purchases are temporarily unavailable.
        </p>
      ) : state.items.length === 0 ? (
        <p className="cashier-recent-captures__message">
          No purchases captured today.
        </p>
      ) : (
        <ul className="cashier-recent-captures__list">
          {state.items.map((item) => {
            const captureStatus = getCaptureStatus(item.status);
            return (
              <li className="cashier-recent-captures__item" key={item.id}>
                <div className="cashier-recent-captures__customer">
                  <strong>{item.customerName}</strong>
                  <span>Receipt {item.receiptNumber}</span>
                </div>
                <div className="cashier-recent-captures__result">
                  <strong
                    className={`cashier-recent-captures__amount cashier-recent-captures__amount--${captureStatus.tone}`}
                  >
                    {typeof item.loyaltyAmountKobo === 'number' ? (
                      <Money amountKobo={item.loyaltyAmountKobo} />
                    ) : (
                      'Credit unavailable'
                    )}
                  </strong>
                  <span
                    className={`cashier-recent-captures__status cashier-recent-captures__status--${captureStatus.tone}`}
                  >
                    {captureStatus.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
