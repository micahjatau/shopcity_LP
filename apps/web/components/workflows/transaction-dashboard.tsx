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
  const [minimumAmount, setMinimumAmount] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('Loading today’s cashier activity…');
  const [loadError, setLoadError] = useState(false);
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
    setLoadError(false);
    setMessage('Loading today’s cashier activity…');
    try {
      const response = await reportsControllerListCashierTodayV1(
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error('activity unavailable');
      setItems(response.data.data.items);
      setPage(1);
      setMessage(
        `${response.data.data.items.length} bounded live receipt${response.data.data.items.length === 1 ? '' : 's'} loaded.`,
      );
    } catch {
      setItems([]);
      setLoadError(true);
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
    const minimumAmountKobo = Number(minimumAmount || 0) * 100;
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.receiptNumber, item.id].some((value) =>
          value.trim().toLowerCase().includes(normalized),
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
      const matchesMinimum =
        !minimumAmountKobo ||
        (item.loyaltyAmountKobo ?? 0) >= minimumAmountKobo;
      return (
        matchesQuery &&
        matchesStatus &&
        matchesOperation &&
        matchesCredit &&
        matchesMinimum
      );
    });
  }, [
    creditFilter,
    items,
    minimumAmount,
    operationFilter,
    query,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / 10));
  const pagedItems = visibleItems.slice((page - 1) * 10, page * 10);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

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
          placeholder="Search receipt number"
          value={query}
          onChange={(event) => updateFilter(setQuery, event.target.value)}
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) =>
            updateFilter(setStatusFilter, event.target.value)
          }
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
          onChange={(event) =>
            updateFilter(setOperationFilter, event.target.value)
          }
          options={[
            { value: '', label: 'All operations' },
            { value: 'EARN', label: 'Earn' },
            { value: 'REDEEM', label: 'Redeem' },
          ]}
        />
        <Select
          aria-label="Filter by credit"
          value={creditFilter}
          onChange={(event) =>
            updateFilter(setCreditFilter, event.target.value)
          }
          options={[
            { value: '', label: 'All credit states' },
            { value: 'issued', label: 'Credit recorded' },
            { value: 'pending', label: 'Credit pending' },
          ]}
        />
        <Input
          aria-label="Minimum amount in naira"
          type="number"
          min="0"
          placeholder="Min amount"
          value={minimumAmount}
          onChange={(event) =>
            updateFilter(setMinimumAmount, event.target.value)
          }
        />
        <Button
          type="button"
          variant="secondary"
          size="compact"
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
              {pagedItems.map((item) => {
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
          <Alert
            tone={loadError ? 'danger' : 'warning'}
            title={
              loadError ? 'Transactions unavailable' : 'No transactions found'
            }
          >
            {loadError
              ? 'The bounded cashier activity feed could not be loaded.'
              : 'Adjust the filters or refresh the bounded cashier activity feed.'}
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => void load()}
              loading={busy}
            >
              Retry
            </Button>
          </Alert>
        )}
        <footer className="transaction-table-footer">
          <p className="cashier-workflow-hint">
            {visibleItems.length} loaded transaction
            {visibleItems.length === 1 ? '' : 's'} · bounded report scope
          </p>
          <div
            className="transaction-pagination"
            aria-label="Transaction pages"
          >
            <Button
              type="button"
              variant="ghost"
              size="compact"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </footer>
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
              <div className="transaction-detail-columns">
                <dl className="transaction-detail-list">
                  <div>
                    <dt>Customer</dt>
                    <dd>Not included in cashier report</dd>
                  </div>
                  <div>
                    <dt>Receipt amount</dt>
                    <dd>
                      {detailState.record.purchaseAmountKobo == null ? (
                        'Not provided'
                      ) : (
                        <Money
                          amountKobo={detailState.record.purchaseAmountKobo}
                        />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Credit amount</dt>
                    <dd>
                      <Money amountKobo={detailState.record.creditKobo} />
                    </dd>
                  </div>
                  <div>
                    <dt>Operation</dt>
                    <dd>{detailState.record.type}</dd>
                  </div>
                  <div>
                    <dt>Transaction ID</dt>
                    <dd>{detailState.record.transactionId}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{detailState.record.state || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Captured at</dt>
                    <dd>{formatDate(detailState.record.capturedAt)}</dd>
                  </div>
                </dl>
                <div className="transaction-detail-context">
                  <div className="transaction-receipt-preview">
                    Receipt image not included in the cashier report
                  </div>
                  <section
                    className="transaction-audit"
                    aria-labelledby="transaction-audit-title"
                  >
                    <h3 id="transaction-audit-title">Audit trail</h3>
                    <div className="transaction-audit-list">
                      <div>
                        <strong>Created</strong>
                        <span>{formatDate(detailState.record.occurredAt)}</span>
                      </div>
                      <div>
                        <strong>Captured by</strong>
                        <span>
                          {detailState.record.deviceId ?? 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <strong>Outcome</strong>
                        <span>
                          {detailState.record.state || 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
