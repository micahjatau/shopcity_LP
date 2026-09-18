'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  cardsControllerLookupCardV1,
  reportsControllerListCashierTodayV1,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Input } from '../ui';
import { Money } from '../shopcity';

type TodayTransaction = ReportsControllerListCashierTodayV1200DataItemsItem;

type LookupRecord = {
  customer?: {
    fullName?: string;
    maskedPhone?: string;
    earningEligible?: boolean;
    eligibilityReason?: string | null;
  };
  customerName?: string;
  serialNumber?: string;
  cardSerialNumber?: string;
  status?: string;
  cardStatus?: string;
  availableBalanceKobo?: number;
};

export function CashierOverviewLookup() {
  const [value, setValue] = useState('');
  const [record, setRecord] = useState<LookupRecord | null>(null);
  const [message, setMessage] = useState('Scan a card or enter its number.');
  const [pending, setPending] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState<
    TodayTransaction[] | null
  >(null);
  const [todayMessage, setTodayMessage] = useState('Loading today’s activity…');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const serial = value.trim();
    if (!serial) {
      setRecord(null);
      setMessage('Enter a card number first.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setRecord(null);
      setMessage('Lookup is unavailable offline. Reconnect and try again.');
      return;
    }

    setPending(true);
    setRecord(null);
    setMessage('Looking up customer and card context…');
    try {
      const response = await cardsControllerLookupCardV1(
        serial,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setRecord(response.data.data);
        setMessage('Customer verified. Choose the next action.');
      } else {
        setMessage(`Lookup unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Lookup could not be completed. Try again.');
    } finally {
      setPending(false);
    }
  }

  const serial = record?.serialNumber ?? record?.cardSerialNumber ?? value;
  const encodedCard = encodeURIComponent(serial.trim());
  const customer = record?.customer;
  const loadedTransactions = todayTransactions ?? [];
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
      aria-labelledby="cashier-scan-title"
    >
      <div>
        <p className="cashier-kicker">Ready for scan</p>
        <h2 id="cashier-scan-title">Find a customer</h2>
        <p className="cashier-muted">
          Scan a card or enter the card number to verify the customer before a
          transaction.
        </p>
      </div>
      <form
        onSubmit={(event) => void submit(event)}
        className="cashier-scan-form"
      >
        <label htmlFor="cashier-overview-card">
          Scan card or enter card number
        </label>
        <div className="cashier-scan-controls">
          <Input
            ref={inputRef}
            id="cashier-overview-card"
            aria-describedby="cashier-overview-lookup-message"
            autoComplete="off"
            placeholder="Scan or enter card number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={pending}
          />
          <button type="submit" disabled={pending || !value.trim()}>
            {pending ? 'Looking up…' : 'Look up'}
          </button>
        </div>
        <p
          id="cashier-overview-lookup-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </form>

      {record ? (
        <div className="cashier-verified-card" aria-label="Verified customer">
          <div>
            <strong>
              {customer?.fullName ?? record.customerName ?? 'Customer'}
            </strong>
            <span>{customer?.maskedPhone ?? 'Phone unavailable'}</span>
          </div>
          <div>
            <span>
              {record.status ?? record.cardStatus ?? 'Status unavailable'} ·{' '}
              {customer?.earningEligible === false
                ? (customer.eligibilityReason ?? 'Not eligible to earn')
                : 'Eligible'}
            </span>
            <strong>
              {typeof record.availableBalanceKobo === 'number' ? (
                <Money amountKobo={record.availableBalanceKobo} />
              ) : (
                'Balance unavailable'
              )}
            </strong>
          </div>
          <div className="cashier-verified-actions">
            <Link href={`/cashier/earn?card=${encodedCard}`}>Earn credit</Link>
            <Link href={`/cashier/redeem?card=${encodedCard}`}>
              Redeem credit
            </Link>
            <Link href={`/cashier/lookup?card=${encodedCard}`}>
              Open details
            </Link>
          </div>
        </div>
      ) : null}

      <p className="section-label" id="cashier-today-title">
        Today&apos;s Activity
      </p>
      <section
        className="cashier-metrics"
        aria-labelledby="cashier-today-title"
      >
        <article className="cashier-metric">
          <div className="metric-label">Receipts loaded</div>
          <div className="metric-value">{loadedTransactions.length || '—'}</div>
          <div className="metric-note">Latest cashier activity</div>
        </article>
        <article className="cashier-metric">
          <div className="metric-label">Purchases captured</div>
          <div className="metric-value">{earnTransactions.length || '—'}</div>
          <div className="metric-note">Earn operations</div>
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
          <div className="metric-note">From loaded receipts</div>
        </article>
        <article className="cashier-metric">
          <div className="metric-label">Credit redeemed</div>
          <div className="metric-value">{redeemTransactions.length || '—'}</div>
          <div className="metric-note">Redeem operations</div>
        </article>
      </section>

      <section className="cashier-today-card" aria-labelledby="recent-heading">
        <div className="table-head">
          <div>
            <h3 id="recent-heading">Recent Transactions</h3>
            {todayMessage ? (
              <p className="cashier-muted">{todayMessage}</p>
            ) : (
              <p className="cashier-muted">
                Live activity from your cashier account
              </p>
            )}
          </div>
          <Link href="/cashier/sync" className="table-link">
            Open sync queue
          </Link>
        </div>
        {todayTransactions?.length ? (
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
                {todayTransactions.map((transaction) => (
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
          <p className="cashier-empty">No transactions recorded today.</p>
        ) : null}
      </section>

      <style>{`
        .cashier-overview-lookup {
          display: grid;
          gap: 24px;
        }

        .cashier-overview-lookup h2,
        .cashier-today-card h3 {
          margin: 0;
        }

        .section-label {
          font-family: 'Avenir Next', 'Century Gothic', 'Trebuchet MS', var(--sc-font-family-sans);
          font-size: 21px;
          line-height: 1.2;
          margin: 0 0 -12px;
        }

        .cashier-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .cashier-metric,
        .cashier-today-card,
        .cashier-overview-lookup > div:first-child,
        .cashier-scan-form,
        .cashier-verified-card {
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
        }

        .cashier-overview-lookup > div:first-child,
        .cashier-scan-form {
          padding: 18px 24px;
        }

        .cashier-metric {
          min-height: 132px;
          padding: 20px 22px;
        }

        .cashier-metric:first-child {
          border-color: var(--sc-color-brand-700);
        }

        .metric-label {
          font-size: 15px;
          margin-bottom: 21px;
        }

        .metric-value {
          color: var(--sc-color-brand-700);
          font-family: 'Avenir Next', 'Century Gothic', 'Trebuchet MS', var(--sc-font-family-sans);
          font-size: 29px;
          font-weight: 650;
          letter-spacing: -0.03em;
        }

        .metric-note {
          color: var(--sc-color-semantic-textSecondary);
          font-size: 11px;
          margin-top: 3px;
        }

        .cashier-today-card {
          display: grid;
          gap: 0;
          overflow: hidden;
          padding: 16px;
        }

        .table-head {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 13px;
          border-bottom: 1px solid var(--sc-color-semantic-border);
        }

        .table-link {
          color: var(--sc-color-brand-700);
          font-weight: 600;
          font-size: 12px;
          text-decoration: none;
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
          padding: 12px 8px;
          border-bottom: 1px solid var(--sc-color-semantic-border);
          white-space: nowrap;
        }

        .cashier-table th {
          color: var(--sc-color-semantic-textSecondary);
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.03em;
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

        .cashier-scan-form,
        .cashier-scan-controls,
        .cashier-verified-card,
        .cashier-verified-actions {
          display: grid;
          gap: var(--sc-spacing-3);
        }

        .cashier-scan-form label {
          font-weight: 700;
        }

        .cashier-scan-controls {
          grid-template-columns: 1fr auto;
          align-items: stretch;
        }

        .cashier-scan-controls button,
        .cashier-verified-actions a {
          min-height: 40px;
          border: 1px solid var(--sc-color-brand-700);
          border-radius: 999px;
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: 0 18px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          text-align: center;
        }

        .cashier-scan-controls button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .cashier-scan-form p {
          margin: 0;
          color: var(--sc-color-semantic-textSecondary);
        }

        .cashier-verified-card {
          grid-template-columns: 1.3fr 1fr;
          align-items: center;
          padding: var(--sc-spacing-4);
        }

        .cashier-verified-card > div:not(.cashier-verified-actions) {
          display: grid;
          gap: 2px;
        }

        .cashier-verified-card span {
          color: var(--sc-color-semantic-textSecondary);
          font-size: var(--sc-font-size-sm);
        }

        .cashier-verified-actions {
          grid-column: 1 / -1;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        @media (max-width: 920px) {
          .cashier-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .cashier-scan-controls,
          .cashier-verified-card,
          .cashier-verified-actions {
            grid-template-columns: 1fr;
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
