'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { cardsControllerLookupCardV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Input } from '../ui';
import { Money } from '../shopcity';

type TodayTransaction = {
  id: string;
  occurredAt: string;
  operation: 'EARN' | 'REDEEM';
  amountKobo: number;
  receiptNumber: string;
  status: string;
};

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
        const response = await fetch(
          '/api/v1/reports/cashier-today',
          createApiRequest({ csrf: true }),
        );
        if (!response.ok) throw new Error('activity request failed');
        const payload = (await response.json()) as {
          data?: { items?: TodayTransaction[] };
        };
        const items = Array.isArray(payload.data?.items)
          ? payload.data.items.filter(
              (item): item is TodayTransaction =>
                typeof item?.id === 'string' &&
                typeof item.occurredAt === 'string' &&
                (item.operation === 'EARN' || item.operation === 'REDEEM') &&
                typeof item.amountKobo === 'number' &&
                typeof item.receiptNumber === 'string' &&
                typeof item.status === 'string',
            )
          : [];
        if (!ignore) {
          setTodayTransactions(items);
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

      <section
        className="cashier-today-card"
        aria-labelledby="cashier-today-title"
      >
        <div>
          <h3 id="cashier-today-title">Recent today</h3>
          {todayMessage ? (
            <p className="cashier-muted">{todayMessage}</p>
          ) : null}
        </div>
        {todayTransactions?.length ? (
          <ul>
            {todayTransactions.map((transaction) => (
              <li key={transaction.id}>
                <time dateTime={transaction.occurredAt}>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(transaction.occurredAt))}
                </time>
                <span>#{transaction.receiptNumber}</span>
                <strong>{transaction.operation}</strong>
                <Money amountKobo={transaction.amountKobo} />
                <span>{transaction.status}</span>
              </li>
            ))}
          </ul>
        ) : todayTransactions ? (
          <p className="cashier-muted">No transactions recorded today.</p>
        ) : null}
      </section>

      <style>{`
        .cashier-overview-lookup {
          display: grid;
          gap: var(--sc-spacing-4);
          border: 1px solid var(--sc-color-brand-200);
          border-radius: var(--sc-radius-lg);
          background: var(--sc-color-brand-50);
          padding: var(--sc-spacing-5);
        }

        .cashier-overview-lookup h2,
        .cashier-today-card h3 {
          margin: 0;
        }

        .cashier-today-card {
          display: grid;
          gap: var(--sc-spacing-3);
          border-top: 1px solid var(--sc-color-semantic-border);
          padding-top: var(--sc-spacing-4);
        }

        .cashier-today-card ul {
          display: grid;
          gap: var(--sc-spacing-2);
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .cashier-today-card li {
          display: grid;
          grid-template-columns: auto 1fr auto auto auto;
          gap: var(--sc-spacing-3);
          align-items: center;
          border-bottom: 1px solid var(--sc-color-semantic-border);
          padding-block: var(--sc-spacing-2);
          font-size: var(--sc-font-size-sm);
        }

        .cashier-today-card li span:last-child {
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
          border: 1px solid var(--sc-color-brand-700);
          border-radius: var(--sc-radius-full);
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-3) var(--sc-spacing-5);
          font-weight: 700;
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

        @media (max-width: 600px) {
          .cashier-today-card li {
            grid-template-columns: auto 1fr auto;
          }

          .cashier-today-card li strong,
          .cashier-today-card li span:last-child {
            grid-column: span 1;
          }
        }

        .cashier-verified-card {
          grid-template-columns: 1.3fr 1fr;
          align-items: center;
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: var(--sc-radius-md);
          background: var(--sc-color-neutral-0);
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

        @media (max-width: 800px) {
          .cashier-scan-controls,
          .cashier-verified-card,
          .cashier-verified-actions,
          .cashier-today-card li {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
