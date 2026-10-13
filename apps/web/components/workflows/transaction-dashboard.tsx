'use client';

import { RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loyaltyControllerGetTransactionV1,
  reportsControllerListCashierTodayV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table, useDialogLifecycle } from '../ui';
import { Money, parseNaira, ShopCityCard, StatusBadge } from '../shopcity';

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
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(Boolean(selected), closeDetail, modalRef);

  async function load() {
    setBusy(true);
    setLoadError(false);
    setMessage('Loading today’s cashier activity…');
    try {
      const response = await reportsControllerListCashierTodayV1(
        undefined,
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error('activity unavailable');
      setItems(response.data.data.items);
      setReportTimeZone(response.data.data.timezone || 'Africa/Lagos');
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
        !operationFilter || item.operation === operationFilter;
      const matchesMinimum =
        minimumAmountKobo === null ||
        (item.purchaseAmountKobo ?? 0) >= minimumAmountKobo;
      return (
        matchesQuery && matchesStatus && matchesOperation && matchesMinimum
      );
    });
  }, [items, minimumAmount, operationFilter, query, statusFilter]);

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
          onClick={() => void load()}
          loading={busy}
        >
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
          Refresh
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
                        {item.operation === 'REDEEM' ? (
                          <div className="transaction-table-credit-breakdown">
                            <div>
                              <span>Redeemed</span>
                              {item.redeemedAmountKobo == null ? (
                                displayStatus === 'pending' ? (
                                  'Awaiting approval'
                                ) : (
                                  'Not recorded'
                                )
                              ) : (
                                <Money
                                  amountKobo={item.redeemedAmountKobo}
                                  className={`transaction-table-credit transaction-table-credit--${displayStatus}`}
                                />
                              )}
                            </div>
                            <div>
                              <span>Earned</span>
                              {item.earnedAmountKobo == null ? (
                                displayStatus === 'pending' ? (
                                  'Awaiting approval'
                                ) : (
                                  'Not recorded'
                                )
                              ) : (
                                <Money
                                  amountKobo={item.earnedAmountKobo}
                                  className="transaction-table-credit transaction-table-credit--approved"
                                />
                              )}
                            </div>
                          </div>
                        ) : item.loyaltyAmountKobo == null ? (
                          'Not recorded'
                        ) : (
                          <Money
                            amountKobo={item.loyaltyAmountKobo}
                            className={`transaction-table-credit transaction-table-credit--${displayStatus}`}
                          />
                        )}
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
