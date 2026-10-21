'use client';

import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loyaltyControllerGetTransactionV1,
  reportsControllerListCashierTodayV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table, useDialogLifecycle } from '../ui';
import { Money, parseNaira, ShopCityCard, StatusBadge } from '../shopcity';
import { TransactionCreditBreakdown } from './transaction-credit-breakdown';

type ActivityItem = ReportsControllerListCashierTodayV1200DataItemsItem;
type DetailRecord = LoyaltyControllerGetTransactionV1200Data;
type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; record: DetailRecord }
  | { status: 'error' };

type DisplayStatus = 'approved' | 'failed' | 'pending' | 'reversed' | 'unknown';

const TRANSACTION_PAGE_SIZE = 5;

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
  if (
    ['PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'AWAITING_APPROVAL'].includes(
      normalized,
    )
  ) {
    return 'pending';
  }
  return 'unknown';
}

function statusLabel(status: DisplayStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

function statusTone(status: DisplayStatus) {
  if (status === 'approved') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'reversed') return 'info';
  return 'neutral';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCashierDate(
  value: string | null | undefined,
  timeZone: string,
  format: 'table' | 'detail',
) {
  if (!value || !timeZone) return formatDate(value);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not available';

  if (format === 'table') {
    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone,
    })
      .format(date)
      .replaceAll('/', '-');
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    })
      .format(date)
      .replace(/\s/g, '')
      .toLowerCase();
    return `${datePart}, ${timePart}`;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

export function TransactionDashboard() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState('Loading today’s cashier activity…');
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportTimeZone, setReportTimeZone] = useState('Africa/Lagos');
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
  });
  const [copyNotice, setCopyNotice] = useState('');
  const requestGeneration = useRef(0);
  const listRequestGeneration = useRef(0);
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(Boolean(selected), closeDetail, modalRef);

  const load = useCallback(async (requestedPage = 1) => {
    const generation = listRequestGeneration.current + 1;
    listRequestGeneration.current = generation;
    setBusy(true);
    setLoadError(false);
    setMessage('Loading today’s cashier activity…');
    try {
      const response = await reportsControllerListCashierTodayV1(
        { page: requestedPage, limit: TRANSACTION_PAGE_SIZE },
        createApiRequest({ csrf: true }),
      );
      if (listRequestGeneration.current !== generation) return;
      if (response.status !== 200) throw new Error('activity unavailable');
      const data = response.data.data;
      const count = data.totalCount ?? data.items.length;
      const pageCount = Math.max(1, Math.ceil(count / TRANSACTION_PAGE_SIZE));
      if (count > 0 && requestedPage > pageCount) {
        void load(pageCount);
        return;
      }
      setItems(data.items);
      setTotalCount(count);
      setReportTimeZone(data.timezone || 'Africa/Lagos');
      setPage(count === 0 ? 1 : (data.page ?? requestedPage));
      setMessage(
        `${count} bounded live receipt${count === 1 ? '' : 's'} available today.`,
      );
    } catch {
      if (listRequestGeneration.current !== generation) return;
      setItems([]);
      setTotalCount(0);
      setLoadError(true);
      setMessage('Today’s cashier activity is temporarily unavailable.');
    } finally {
      if (listRequestGeneration.current === generation) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  function closeDetail() {
    requestGeneration.current += 1;
    setSelected(null);
    setDetailState({ status: 'idle' });
    setCopyNotice('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function openDetail(item: ActivityItem, trigger: HTMLTableRowElement) {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    triggerRef.current = trigger;
    setCopyNotice('');
    setSelected(item);
    setDetailState({ status: 'loading' });

    try {
      const response = await loyaltyControllerGetTransactionV1(
        item.transactionId ?? item.id,
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

  async function copyCardSerialNumber(cardSerialNumber: string) {
    try {
      await navigator.clipboard.writeText(cardSerialNumber);
      setCopyNotice('Virtual card number copied.');
    } catch {
      setCopyNotice('Unable to copy the virtual card number.');
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const minimumAmountKobo = minimumAmount.trim()
      ? parseNaira(minimumAmount)
      : null;
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.receiptNumber, item.customerName, item.id].some((value) =>
          value.trim().toLowerCase().includes(normalized),
        );
      const displayStatus = normalizeStatus(item.status);
      const matchesStatus = !statusFilter || displayStatus === statusFilter;
      const matchesOperation =
        !operationFilter ||
        (operationFilter === 'EARN'
          ? item.operation === 'EARN' || item.earnedAmountKobo != null
          : item.operation === operationFilter);
      const matchesMinimum =
        minimumAmountKobo === null ||
        (item.purchaseAmountKobo ?? 0) >= minimumAmountKobo;
      return (
        matchesQuery && matchesStatus && matchesOperation && matchesMinimum
      );
    });
  }, [items, minimumAmount, operationFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / TRANSACTION_PAGE_SIZE));
  const pagedItems = visibleItems;

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    if (page !== 1) void load(1);
  }

  return (
    <section
      className="transaction-dashboard cashier-transactions-page"
      data-od-id="transactions-view"
      aria-labelledby="cashier-transactions-title"
    >
      <header
        className="cashier-transactions-page__header"
        data-od-id="transactions-heading"
      >
        <div>
          <h1 id="cashier-transactions-title">Transactions</h1>
          <p>Captured receipts and the credit issued against them.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void load(page)}
          loading={busy}
        >
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
          Refresh transactions
        </Button>
      </header>
      <p className="sr-only" role="status">
        {message}
      </p>
      <ShopCityCard
        as="section"
        variant="table"
        className="transaction-table-card"
        data-od-id="transactions-table"
        aria-label="Cashier today transactions"
      >
        <div className="transaction-toolbar" data-od-id="transaction-filters">
          <label
            className="transaction-search-control"
            htmlFor="cashier-transactions-search"
          >
            <Image
              src="/brand/cashier/cashier-transactions-search.png"
              alt=""
              aria-hidden="true"
              width={15}
              height={15}
            />
            <Input
              id="cashier-transactions-search"
              type="search"
              aria-label="Search receipt, customer name, or transaction ID"
              className="transaction-search-control__input"
              placeholder="Search"
              value={query}
              onChange={(event) => updateFilter(setQuery, event.target.value)}
            />
          </label>
          <div className="transaction-filter-group">
            <Select
              className="transaction-filter-select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) =>
                updateFilter(setStatusFilter, event.target.value)
              }
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'approved', label: 'Approved' },
                { value: 'failed', label: 'Failed' },
                { value: 'pending', label: 'Pending' },
                { value: 'reversed', label: 'Reversed' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
            <Select
              className="transaction-filter-select"
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
            <Input
              className="transaction-filter-input"
              aria-label="Minimum purchase amount in naira"
              type="number"
              min="0"
              placeholder="Min. Amount"
              value={minimumAmount}
              onChange={(event) =>
                updateFilter(setMinimumAmount, event.target.value)
              }
            />
          </div>
        </div>
        <div
          className="transaction-table-scroll"
          role="region"
          aria-label="Transaction results"
          /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
          tabIndex={0}
        >
          <Table>
            <thead>
              <tr>
                <th scope="col">Receipt No.</th>
                <th scope="col">Name</th>
                <th scope="col">Receipt amount</th>
                <th scope="col">Credit</th>
                <th scope="col">Date &amp; Time</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length ? (
                pagedItems.map((item) => {
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
                      <td className="transaction-table-receipt-number">
                        {item.receiptNumber}
                      </td>
                      <td className="transaction-table-customer-name">
                        {item.customerName || 'Not provided'}
                      </td>
                      <td>
                        {item.purchaseAmountKobo == null ? (
                          'Not provided'
                        ) : (
                          <Money amountKobo={item.purchaseAmountKobo} />
                        )}
                      </td>
                      <td>
                        <TransactionCreditBreakdown
                          operation={item.operation}
                          status={item.status}
                          loyaltyAmountKobo={item.loyaltyAmountKobo}
                          redeemedAmountKobo={item.redeemedAmountKobo}
                          earnedAmountKobo={item.earnedAmountKobo}
                        />
                      </td>
                      <td>
                        {formatCashierDate(
                          item.occurredAt,
                          reportTimeZone,
                          'table',
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          className="transaction-table-status"
                          label={statusLabel(displayStatus)}
                          tone={statusTone(displayStatus)}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div
                      className="transaction-empty-state"
                      role={loadError ? 'alert' : 'status'}
                    >
                      <strong>
                        {loadError
                          ? 'Transactions unavailable'
                          : 'No transactions found'}
                      </strong>
                      <p>
                        {loadError
                          ? 'The bounded cashier activity feed could not be loaded.'
                          : 'Adjust the filters or refresh the bounded cashier activity feed.'}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="compact"
                        onClick={() => void load()}
                        loading={busy}
                      >
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        {totalCount > 0 ? (
          <footer className="transaction-table-footer">
            <p className="transaction-table-count" aria-live="polite">
              Page {page} · {totalCount} transactions today
            </p>
            <nav
              className="transaction-pagination"
              aria-label="Transaction results pagination"
            >
              <button
                className="transaction-pagination-button"
                type="button"
                onClick={() => void load(page - 1)}
                disabled={page <= 1 || busy}
                aria-label="Previous transaction page"
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <p className="transaction-pagination-status" aria-live="polite">
                Page {page} of {totalPages}
              </p>
              <button
                className="transaction-pagination-button"
                type="button"
                onClick={() => void load(page + 1)}
                disabled={page >= totalPages || busy}
                aria-label="Next transaction page"
              >
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </nav>
          </footer>
        ) : null}
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
                <h2 id="transaction-detail-title">
                  Transaction {selected.receiptNumber || '—'}
                </h2>
                <p className="transaction-detail-modal__note">
                  Details for transaction{' '}
                  {selected.receiptNumber || selected.id}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                className="transaction-detail-close-button"
                aria-label="Close transaction detail"
                onClick={closeDetail}
              >
                <Image
                  src="/brand/cashier/cashier-transaction-detail-close.svg"
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                />
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
                    <dd>{selected.customerName || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Receipt amount</dt>
                    <dd>
                      {detailState.record.purchaseAmountKobo == null ? (
                        selected.purchaseAmountKobo == null ? (
                          'Not provided'
                        ) : (
                          <Money amountKobo={selected.purchaseAmountKobo} />
                        )
                      ) : (
                        <Money
                          amountKobo={detailState.record.purchaseAmountKobo}
                        />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Credit redeemed</dt>
                    <dd>
                      {detailState.record.redeemedAmountKobo == null ? (
                        'Not recorded'
                      ) : (
                        <Money
                          amountKobo={detailState.record.redeemedAmountKobo}
                        />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Credit earned</dt>
                    <dd>
                      {(() => {
                        const earnedKobo =
                          detailState.record.settlementEffects?.find(
                            (effect) => effect.type === 'EARN',
                          )?.amountKobo ??
                          (detailState.record.type === 'EARN'
                            ? detailState.record.creditKobo
                            : null);
                        return earnedKobo === null ? (
                          'Not recorded'
                        ) : (
                          <Money amountKobo={earnedKobo} />
                        );
                      })()}
                    </dd>
                  </div>
                  <div>
                    <dt>Amount paid after redemption</dt>
                    <dd>
                      {detailState.record.netPaidAmountKobo == null ? (
                        'Not available'
                      ) : (
                        <Money
                          amountKobo={detailState.record.netPaidAmountKobo}
                        />
                      )}
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
                    <dt>Virtual Card Number</dt>
                    <dd className="transaction-detail-card-number">
                      {detailState.record.cardSerialNumber ? (
                        <>
                          <span>{detailState.record.cardSerialNumber}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="compact"
                            className="transaction-detail-copy-button"
                            aria-label="Copy virtual card number"
                            onClick={() =>
                              void copyCardSerialNumber(
                                detailState.record.cardSerialNumber ?? '',
                              )
                            }
                          >
                            <Image
                              src="/brand/cashier/cashier-confirmation-copy.svg"
                              alt=""
                              aria-hidden="true"
                              width={16}
                              height={16}
                            />
                          </Button>
                        </>
                      ) : (
                        'Not provided'
                      )}
                    </dd>
                    {copyNotice ? (
                      <dd
                        className="transaction-detail-copy-notice"
                        role="status"
                      >
                        {copyNotice}
                      </dd>
                    ) : null}
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge
                        className="transaction-detail-status"
                        label={statusLabel(
                          normalizeStatus(detailState.record.state),
                        )}
                        tone={statusTone(
                          normalizeStatus(detailState.record.state),
                        )}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Occurred at</dt>
                    <dd>
                      {formatCashierDate(
                        detailState.record.occurredAt,
                        reportTimeZone,
                        'detail',
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Date/Time</dt>
                    <dd>
                      {formatCashierDate(
                        detailState.record.capturedAt,
                        reportTimeZone,
                        'detail',
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="transaction-detail-context">
                  <div
                    className="transaction-receipt-preview"
                    role="status"
                    aria-label="Receipt image unavailable"
                  >
                    Receipt image not provided by the Cashier transaction
                    service.
                  </div>
                  <section
                    className="transaction-audit"
                    aria-labelledby="transaction-audit-title"
                  >
                    <h3 id="transaction-audit-title">Audit Trail</h3>
                    <p className="transaction-audit-unavailable">
                      Audit events are not included in the Cashier transaction
                      response.
                    </p>
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
