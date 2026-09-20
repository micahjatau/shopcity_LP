'use client';

import { RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loyaltyControllerGetTransactionV1,
  reportsControllerListCashierTodayV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table, useDialogLifecycle } from '../ui';
import { Money, ShopCityCard, StatusBadge } from '../shopcity';

type ActivityItem = ReportsControllerListCashierTodayV1200DataItemsItem;
type DetailRecord = LoyaltyControllerGetTransactionV1200Data;
type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; record: DetailRecord }
  | { status: 'error' };

type DisplayStatus = 'approved' | 'failed' | 'pending' | 'reversed' | 'unknown';

function normalizeStatus(status: string | null | undefined): DisplayStatus {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase();
  if (['APPROVED', 'CONFIRMED', 'POSTED', 'COMPLETED'].includes(normalized)) {
    return 'approved';
  }
  if (['FAILED', 'REJECTED', 'DECLINED'].includes(normalized)) {
    return 'failed';
  }
  if (['REVERSED', 'VOIDED'].includes(normalized)) {
    return 'reversed';
  }
  if (['PENDING', 'PROCESSING', 'AWAITING_APPROVAL'].includes(normalized)) {
    return 'pending';
  }
  return 'unknown';
}

function statusLabel(status: DisplayStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TransactionDashboard() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [creditFilter, setCreditFilter] = useState('');
  const [message, setMessage] = useState('Loading today’s cashier activity…');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
  });
  const requestGeneration = useRef(0);
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(Boolean(selected), closeDetail, modalRef);

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

  function closeDetail() {
    requestGeneration.current += 1;
    setSelected(null);
    setDetailState({ status: 'idle' });
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function openDetail(item: ActivityItem, trigger: HTMLTableRowElement) {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    triggerRef.current = trigger;
    setSelected(item);
    setDetailState({ status: 'loading' });

    try {
      const response = await loyaltyControllerGetTransactionV1(
        item.id,
        createApiRequest({ csrf: true }),
      );
      if (requestGeneration.current !== generation) return;
      if (response.status !== 200) {
        setDetailState({ status: 'error' });
        return;
      }
      setDetailState({ status: 'loaded', record: response.data.data });
    } catch {
      if (requestGeneration.current === generation) {
        setDetailState({ status: 'error' });
      }
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.receiptNumber, item.id].some(
          (value) => value.trim().toLowerCase() === normalized,
        );
      const displayStatus = normalizeStatus(item.status);
      const matchesStatus = !statusFilter || displayStatus === statusFilter;
      const matchesOperation =
        !operationFilter || item.operation === operationFilter;
      const matchesCredit =
        !creditFilter ||
        (creditFilter === 'issued'
          ? item.loyaltyAmountKobo !== null
          : item.loyaltyAmountKobo === null);
      return matchesQuery && matchesStatus && matchesOperation && matchesCredit;
    });
  }, [creditFilter, items, operationFilter, query, statusFilter]);

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
          aria-label="Search receipt number or transaction ID"
          placeholder="Search receipt or transaction ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'approved', label: 'Approved' },
            { value: 'failed', label: 'Failed' },
            { value: 'pending', label: 'Pending' },
            { value: 'reversed', label: 'Reversed' },
            { value: 'unknown', label: 'Unknown' },
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
        <Select
          aria-label="Filter by credit"
          value={creditFilter}
          onChange={(event) => setCreditFilter(event.target.value)}
          options={[
            { value: '', label: 'All credit states' },
            { value: 'issued', label: 'Credit recorded' },
            { value: 'pending', label: 'Credit pending' },
          ]}
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
      <ShopCityCard
        as="section"
        variant="table"
        className="transaction-table-card"
        data-od-id="transactions-table"
        aria-label="Cashier today transactions"
      >
        {visibleItems.length ? (
          <Table>
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Operation</th>
                <th>Credit</th>
                <th>Transaction ID</th>
                <th>Date &amp; time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const displayStatus = normalizeStatus(item.status);
                return (
                  <tr
                    key={item.id}
                    ref={(element) => {
                      if (selected?.id === item.id && element) {
                        triggerRef.current = element;
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open transaction ${item.receiptNumber}`}
                    onClick={(event) =>
                      void openDetail(item, event.currentTarget)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openDetail(item, event.currentTarget);
                      }
                    }}
                  >
                    <td>{item.receiptNumber}</td>
                    <td>{item.operation}</td>
                    <td>
                      {item.loyaltyAmountKobo == null ? (
                        'Not recorded'
                      ) : (
                        <Money amountKobo={item.loyaltyAmountKobo} />
                      )}
                    </td>
                    <td>{item.id}</td>
                    <td>{formatDate(item.occurredAt)}</td>
                    <td>
                      <StatusBadge
                        label={statusLabel(displayStatus)}
                        tone={
                          displayStatus === 'approved'
                            ? 'success'
                            : displayStatus === 'failed'
                              ? 'danger'
                              : displayStatus === 'pending'
                                ? 'warning'
                                : 'neutral'
                        }
                      />
                    </td>
                  </tr>
                );
              })}
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
      </ShopCityCard>
      {selected ? (
        <div
          className="transaction-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div
            ref={modalRef}
            className="transaction-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-detail-title"
          >
            <div className="transaction-detail-modal__head">
              <div>
                <p className="section-label">Transaction detail</p>
                <h2 id="transaction-detail-title">
                  {selected.receiptNumber || 'Transaction'}
                </h2>
                <p className="transaction-detail-modal__note">
                  Detail fields are limited to the authoritative transaction
                  response.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                aria-label="Close transaction detail"
                onClick={closeDetail}
              >
                <X aria-hidden="true" size={16} />
                Close
              </Button>
            </div>
            {detailState.status === 'loading' ? (
              <p role="status">Loading authoritative transaction detail…</p>
            ) : detailState.status === 'error' ? (
              <Alert tone="danger" title="Transaction detail unavailable">
                The authoritative detail could not be loaded. The bounded
                activity row remains unchanged.
              </Alert>
            ) : detailState.status === 'loaded' ? (
              <Table>
                <tbody>
                  <tr>
                    <th scope="row">Receipt number</th>
                    <td>
                      {detailState.record.posReceiptNumber ??
                        selected.receiptNumber}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Credit</th>
                    <td>
                      {detailState.record.creditKobo == null ? (
                        'Not provided'
                      ) : (
                        <Money amountKobo={detailState.record.creditKobo} />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Operation</th>
                    <td>{detailState.record.type}</td>
                  </tr>
                  <tr>
                    <th scope="row">Status</th>
                    <td>{detailState.record.state}</td>
                  </tr>
                  <tr>
                    <th scope="row">Transaction ID</th>
                    <td>{detailState.record.transactionId}</td>
                  </tr>
                  <tr>
                    <th scope="row">Captured at</th>
                    <td>{formatDate(detailState.record.capturedAt)}</td>
                  </tr>
                </tbody>
              </Table>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
