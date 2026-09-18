'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  loyaltyControllerGetTransactionV1,
  reportsControllerListCashierTodayV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table } from '../ui';
import { Money, StatusBadge } from '../shopcity';

type ActivityItem = ReportsControllerListCashierTodayV1200DataItemsItem;

type DetailRecord = LoyaltyControllerGetTransactionV1200Data & {
  status?: string;
  customer?: { fullName?: string };
  cardSerialNumber?: string;
  posReceiptNumber?: string;
  creditKobo?: number;
  amountKobo?: number;
};

export function TransactionDashboard() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [message, setMessage] = useState('Loading today’s cashier activity…');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [detail, setDetail] = useState<DetailRecord | null>(null);

  async function load() {
    setBusy(true);
    setMessage('Loading today’s cashier activity…');
    try {
      const response = await reportsControllerListCashierTodayV1(
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error('activity unavailable');
      setItems(response.data.data.items);
      setMessage(
        `${response.data.data.items.length} bounded live receipt${response.data.data.items.length === 1 ? '' : 's'} loaded.`,
      );
    } catch {
      setItems([]);
      setMessage('Today’s cashier activity is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDetail(item: ActivityItem) {
    setSelected(item);
    setDetail(null);
    try {
      const response = await loyaltyControllerGetTransactionV1(
        item.id,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200)
        setDetail(response.data.data as DetailRecord);
    } catch {
      // Keep the bounded report row visible when detail is unavailable.
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const minimumKobo = Number(minAmount || 0) * 100;
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.receiptNumber ?? ''} ${item.id}`
          .toLowerCase()
          .includes(normalized);
      const matchesStatus =
        !statusFilter ||
        String(item.status).toUpperCase().includes(statusFilter);
      const matchesOperation =
        !operationFilter || item.operation === operationFilter;
      const matchesAmount =
        !minimumKobo || Number(item.loyaltyAmountKobo ?? 0) >= minimumKobo;
      return matchesQuery && matchesStatus && matchesOperation && matchesAmount;
    });
  }, [items, minAmount, operationFilter, query, statusFilter]);

  return (
    <section
      className="transaction-dashboard"
      data-od-id="transactions-dashboard"
    >
      <p className="cashier-workflow-notice" role="status">
        {message}
      </p>
      <div className="transaction-toolbar" data-od-id="transaction-filters">
        <Input
          aria-label="Search receipt number"
          placeholder="Search receipt number"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'REVERSED', label: 'Reversed' },
          ]}
        />
        <Select
          aria-label="Filter by operation"
          value={operationFilter}
          onChange={(event) => setOperationFilter(event.target.value)}
          options={[
            { value: '', label: 'All operations' },
            { value: 'EARN', label: 'Earn' },
            { value: 'REDEEM', label: 'Redeem' },
          ]}
        />
        <Input
          aria-label="Minimum amount in naira"
          type="number"
          min="0"
          placeholder="Min amount"
          value={minAmount}
          onChange={(event) => setMinAmount(event.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          loading={busy}
        >
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
          Refresh data
        </Button>
      </div>
      <section
        className="transaction-table-card"
        data-od-id="transactions-table"
      >
        {visibleItems.length ? (
          <Table>
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Operation</th>
                <th>Loyalty amount</th>
                <th>Transaction ID</th>
                <th>Date &amp; time</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  onClick={() => void openDetail(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void openDetail(item);
                    }
                  }}
                >
                  <td>{item.receiptNumber ?? '—'}</td>
                  <td>{item.operation ?? '—'}</td>
                  <td>
                    {item.loyaltyAmountKobo == null ? (
                      '—'
                    ) : (
                      <Money amountKobo={item.loyaltyAmountKobo} />
                    )}
                  </td>
                  <td>
                    {String(item.id).slice(0, 14)}
                    {String(item.id).length > 14 ? '…' : ''}
                  </td>
                  <td>{new Date(item.occurredAt).toLocaleString('en-NG')}</td>
                  <td>
                    <StatusBadge label={item.status ?? 'UNKNOWN'} tone="info" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Alert tone="warning" title="No transactions found">
            Adjust the filters or refresh the bounded cashier activity feed.
          </Alert>
        )}
        <p className="cashier-workflow-hint">
          {visibleItems.length} loaded transaction
          {visibleItems.length === 1 ? '' : 's'} · bounded report scope
        </p>
      </section>
      {selected ? (
        <dialog
          open
          className="transaction-detail-modal"
          aria-labelledby="transaction-detail-title"
        >
          <div className="transaction-detail-modal__head">
            <div>
              <p className="section-label">Transaction detail</p>
              <h2 id="transaction-detail-title">
                {detail?.posReceiptNumber ??
                  selected.receiptNumber ??
                  'Transaction'}
              </h2>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          </div>
          {detail ? (
            <Table>
              <tbody>
                <tr>
                  <th>Customer</th>
                  <td>
                    {detail.customer?.fullName ?? detail.customerId ?? '—'}
                  </td>
                </tr>
                <tr>
                  <th>Amount</th>
                  <td>
                    {detail.amountKobo == null ? (
                      '—'
                    ) : (
                      <Money amountKobo={detail.amountKobo} />
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Credit</th>
                  <td>
                    {detail.creditKobo == null ? (
                      '—'
                    ) : (
                      <Money amountKobo={detail.creditKobo} />
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>{detail.state ?? detail.status ?? '—'}</td>
                </tr>
                <tr>
                  <th>Transaction ID</th>
                  <td>{detail.transactionId ?? selected.id}</td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <p role="status">Loading authoritative transaction detail…</p>
          )}
        </dialog>
      ) : null}
      <style>{`
        .transaction-dashboard {
          display: grid;
          gap: 22px;
          max-width: var(--sc-prototype-contentMaxWidth);
          margin: 0 auto;
        }

        .transaction-toolbar {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(135px, 1fr)) auto;
          gap: 14px;
          align-items: center;
        }

        .transaction-toolbar .sc-button {
          min-height: 38px;
          border-radius: 9px;
        }

        .transaction-toolbar .sc-button--primary {
          background: var(--sc-prototype-accent);
        }

        .transaction-table-card {
          overflow: hidden;
          border: 1px solid var(--sc-prototype-border);
          border-radius: var(--sc-prototype-flowPanelRadius);
          background: var(--sc-prototype-surface);
          padding: 18px 24px;
        }

        .transaction-table-card table {
          width: 100%;
          min-width: 760px;
        }

        .transaction-detail-modal {
          width: min(720px, calc(100vw - 32px));
          border: 1px solid var(--sc-prototype-border);
          border-radius: var(--sc-prototype-flowPanelRadius);
          padding: 24px;
        }

        .transaction-detail-modal__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        @media (max-width: 900px) {
          .transaction-toolbar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .transaction-toolbar {
            grid-template-columns: 1fr;
          }

          .transaction-table-card {
            padding: 14px;
          }
        }
      `}</style>
    </section>
  );
}
