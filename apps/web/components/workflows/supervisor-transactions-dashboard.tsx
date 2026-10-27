'use client';

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  loyaltyControllerGetTransactionV1,
  loyaltyControllerSearchTransactionsByReceiptV1,
  reversalsControllerReverseV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type LoyaltyControllerSearchTransactionsByReceiptV1200Data,
  type LoyaltyControllerSearchTransactionsByReceiptV1200DataItemsItem,
  type LoyaltyControllerSearchTransactionsByReceiptV1Status,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  Alert,
  Button,
  Input,
  Table,
  Textarea,
  useDialogLifecycle,
} from '../ui';
import {
  CashierPageHeader,
  Money,
  ShopCityCard,
  StatusBadge,
} from '../shopcity';

type SearchItem =
  LoyaltyControllerSearchTransactionsByReceiptV1200DataItemsItem;
type StaffOption =
  LoyaltyControllerSearchTransactionsByReceiptV1200Data['staffOptions'][number];
type DetailRecord = LoyaltyControllerGetTransactionV1200Data;
type ListState = 'idle' | 'loading' | 'loaded' | 'error';
type DetailState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'loaded'; record: DetailRecord };
type CursorStack = Array<string | undefined>;
type TransactionColumnResize = Readonly<{
  index: number;
  startX: number;
  startWidths: number[];
}>;

const TRANSACTION_COLUMN_LABELS = [
  'Receipt No.',
  'Name',
  'Receipt amount',
  'Credit',
  'Date & time',
  'Status',
] as const;
const DEFAULT_TRANSACTION_COLUMN_WIDTHS = [
  136, 176, 146, 112, 196, 116,
] as const;
const MIN_TRANSACTION_COLUMN_WIDTHS = [112, 124, 126, 92, 150, 104] as const;

function resizeAdjacentColumnWidths(
  widths: number[],
  index: number,
  delta: number,
) {
  if (index < 0 || index >= widths.length - 1) return widths;
  const pairWidth = widths[index] + widths[index + 1];
  const nextWidth = Math.max(
    MIN_TRANSACTION_COLUMN_WIDTHS[index],
    Math.min(
      pairWidth - MIN_TRANSACTION_COLUMN_WIDTHS[index + 1],
      widths[index] + delta,
    ),
  );
  return widths.map((width, columnIndex) =>
    columnIndex === index
      ? nextWidth
      : columnIndex === index + 1
        ? pairWidth - nextWidth
        : width,
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalizeReceipt(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function nairaToKobo(value: string): string | undefined | null {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match || match[1].length > 17) return null;

  const amountKobo =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  if (amountKobo > 9223372036854775807n) return null;
  return amountKobo.toString();
}

function statusTone(
  status: string,
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status.trim().toUpperCase()) {
    case 'CONFIRMED':
    case 'POSTED':
    case 'COMPLETED':
    case 'APPROVED':
      return 'success';
    case 'REVERSED':
    case 'REVERSAL':
      return 'danger';
    case 'FAILED':
    case 'REJECTED':
    case 'DECLINED':
      return 'danger';
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PROCESSING':
      return 'warning';
    default:
      return 'neutral';
  }
}

function statusLabel(status: string) {
  const normalized = status.trim().replaceAll('_', ' ').toLowerCase();
  return normalized
    ? normalized[0].toUpperCase() + normalized.slice(1)
    : 'Unknown';
}

type TransactionFilterOption = Readonly<{ value: string; label: string }>;

function SupervisorTransactionFilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly TransactionFilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    if (event.key === 'ArrowUp')
      nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="supervisor-customer-directory__status-filter supervisor-transaction-filter-dropdown"
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        className="supervisor-customer-directory__filter supervisor-customer-directory__status-trigger"
        aria-label={`${label}, ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <Filter aria-hidden="true" size={15} />
        <span className="supervisor-transaction-filter-dropdown__value">
          {selectedOption.label}
        </span>
        <ChevronDown aria-hidden="true" size={14} />
      </Button>
      {open ? (
        <div
          id={`${id}-options`}
          className="supervisor-customer-directory__status-menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={value === option.value}
              tabIndex={activeIndex === index ? 0 : -1}
              className="supervisor-customer-directory__status-option"
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {value === option.value ? (
                <Check aria-hidden="true" size={14} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SupervisorTransactionsDashboard() {
  const [columnWidths, setColumnWidths] = useState<number[]>(() => [
    ...DEFAULT_TRANSACTION_COLUMN_WIDTHS,
  ]);
  const [query, setQuery] = useState('');
  const [searchedReceipt, setSearchedReceipt] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    LoyaltyControllerSearchTransactionsByReceiptV1Status | ''
  >('');
  const [staffFilter, setStaffFilter] = useState('');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [filterError, setFilterError] = useState('');
  const [filtersDirty, setFiltersDirty] = useState(false);
  const [listState, setListState] = useState<ListState>('loading');
  const [message, setMessage] = useState('Loading branch transactions…');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<CursorStack>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
  });
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reversalMessage, setReversalMessage] = useState('');
  const [reversalError, setReversalError] = useState(false);
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [reversalSubmitted, setReversalSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchGeneration = useRef(0);
  const initialListRequestStarted = useRef(false);
  const detailGeneration = useRef(0);
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const columnResizeRef = useRef<TransactionColumnResize | null>(null);
  const reversalKeyRef = useRef<{
    transactionId: string;
    reason: string;
    key: string;
  } | null>(null);

  useDialogLifecycle(Boolean(selected), closeDetail, modalRef);

  function resizeColumnWithKeyboard(
    index: number,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    let delta: number | undefined;
    if (event.key === 'ArrowLeft') delta = -12;
    if (event.key === 'ArrowRight') delta = 12;
    if (event.key === 'Home')
      delta = MIN_TRANSACTION_COLUMN_WIDTHS[index] - columnWidths[index];
    if (event.key === 'End')
      delta =
        columnWidths[index] +
        columnWidths[index + 1] -
        MIN_TRANSACTION_COLUMN_WIDTHS[index + 1] -
        columnWidths[index];
    if (delta === undefined) return;
    event.preventDefault();
    const resizeDelta = delta;
    setColumnWidths((current) =>
      resizeAdjacentColumnWidths(current, index, resizeDelta),
    );
  }

  function startColumnResize(
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (
      event.button !== undefined &&
      event.button !== 0 &&
      event.pointerType !== 'touch'
    )
      return;
    event.preventDefault();
    columnResizeRef.current = {
      index,
      startX: event.clientX,
      startWidths: [...columnWidths],
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveColumnResize(
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const resize = columnResizeRef.current;
    if (!resize || resize.index !== index) return;
    setColumnWidths(
      resizeAdjacentColumnWidths(
        resize.startWidths,
        index,
        event.clientX - resize.startX,
      ),
    );
  }

  function endColumnResize() {
    columnResizeRef.current = null;
  }

  async function loadReceiptResults(
    receiptNumber: string,
    cursor?: string,
    preserveItems = false,
  ) {
    const generation = searchGeneration.current + 1;
    searchGeneration.current = generation;
    const minimumReceiptAmountKobo = nairaToKobo(minimumAmount);
    if (minimumReceiptAmountKobo === null) {
      setSearching(false);
      setFiltersDirty(true);
      setFilterError(
        'Enter a valid minimum amount with up to two decimal places.',
      );
      return;
    }
    setFilterError('');
    const normalizedReceiptNumber = receiptNumber.trim();

    setSearching(true);
    setListState('loading');
    if (!preserveItems) {
      setItems([]);
      setHasMore(false);
      setNextCursor(null);
    }
    setMessage(
      normalizedReceiptNumber
        ? `Searching for receipt ${normalizedReceiptNumber}…`
        : 'Loading branch transactions…',
    );

    try {
      const response = await loyaltyControllerSearchTransactionsByReceiptV1(
        {
          ...(normalizedReceiptNumber
            ? { receiptNumber: normalizedReceiptNumber }
            : {}),
          limit: 10,
          cursor,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(staffFilter ? { staffId: staffFilter } : {}),
          ...(minimumReceiptAmountKobo
            ? { minReceiptAmountKobo: minimumReceiptAmountKobo }
            : {}),
        },
        createApiRequest({ csrf: true }),
      );
      if (searchGeneration.current !== generation) return;
      if (response.status !== 200)
        throw new Error('receipt search unavailable');

      const result = response.data.data;
      setItems(result.items);
      setStaffOptions(result.staffOptions);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setListState('loaded');
      setMessage(
        normalizedReceiptNumber
          ? `${result.items.length} transaction${result.items.length === 1 ? '' : 's'} found for receipt ${normalizedReceiptNumber}.`
          : `${result.items.length} branch transaction${result.items.length === 1 ? '' : 's'} loaded.`,
      );
    } catch {
      if (searchGeneration.current !== generation) return;
      if (!preserveItems) {
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
      }
      setListState('error');
      setMessage('The branch transaction list is temporarily unavailable.');
    } finally {
      if (searchGeneration.current === generation) setSearching(false);
    }
  }

  useEffect(() => {
    if (initialListRequestStarted.current) return;
    initialListRequestStarted.current = true;
    void loadReceiptResults('');
    // The first request intentionally uses the initial empty filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const receiptNumber = query.trim();
    setSearchedReceipt(receiptNumber);
    setFiltersDirty(false);
    setCursorStack([undefined]);
    setPageIndex(0);
    void loadReceiptResults(receiptNumber);
  }

  function loadNextPage() {
    if (!hasMore || !nextCursor || searching || filtersDirty) {
      return;
    }
    const cursor = nextCursor;
    setCursorStack((current) => [...current.slice(0, pageIndex + 1), cursor]);
    setPageIndex((current) => current + 1);
    void loadReceiptResults(searchedReceipt, cursor);
  }

  function loadPreviousPage() {
    if (pageIndex <= 0 || searching || filtersDirty) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    void loadReceiptResults(searchedReceipt, cursorStack[previousIndex]);
  }

  function refreshResults() {
    if (
      listState === 'idle' ||
      listState === 'loading' ||
      searching ||
      filtersDirty
    )
      return;
    void loadReceiptResults(searchedReceipt, cursorStack[pageIndex], true);
  }

  function closeDetail() {
    if (submittingReversal) return;
    detailGeneration.current += 1;
    setSelected(null);
    setDetailState({ status: 'idle' });
    setReason('');
    setConfirmation('');
    setReversalMessage('');
    setReversalError(false);
    setReversalSubmitted(false);
    reversalKeyRef.current = null;
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function openDetail(item: SearchItem, trigger: HTMLTableRowElement) {
    const generation = detailGeneration.current + 1;
    detailGeneration.current = generation;
    triggerRef.current = trigger;
    setSelected(item);
    setDetailState({ status: 'loading' });
    setReason('');
    setConfirmation('');
    setReversalMessage('');
    setReversalError(false);
    setReversalSubmitted(false);
    reversalKeyRef.current = null;

    try {
      const response = await loyaltyControllerGetTransactionV1(
        item.transactionId,
        createApiRequest({ csrf: true }),
      );
      if (detailGeneration.current !== generation) return;
      if (response.status !== 200) {
        setDetailState({ status: 'error' });
        return;
      }

      const record = response.data.data;
      if (
        record.transactionId !== item.transactionId ||
        normalizeReceipt(record.posReceiptNumber) !==
          normalizeReceipt(item.receiptNumber)
      ) {
        setDetailState({ status: 'error' });
        return;
      }
      setDetailState({ status: 'loaded', record });
    } catch {
      if (detailGeneration.current === generation) {
        setDetailState({ status: 'error' });
      }
    }
  }

  async function submitReversal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (detailState.status !== 'loaded' || !selected || reversalSubmitted)
      return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReversalError(true);
      setReversalMessage('Enter a reason before requesting a reversal.');
      return;
    }
    if (confirmation.trim().toUpperCase() !== 'REVERSE') {
      setReversalError(true);
      setReversalMessage('Type REVERSE to confirm the reversal request.');
      return;
    }

    const requestGeneration = detailGeneration.current;
    const previousKey = reversalKeyRef.current;
    const idempotencyKey =
      previousKey?.transactionId === selected.transactionId &&
      previousKey.reason === trimmedReason
        ? previousKey.key
        : crypto.randomUUID();
    reversalKeyRef.current = {
      transactionId: selected.transactionId,
      reason: trimmedReason,
      key: idempotencyKey,
    };

    setSubmittingReversal(true);
    setReversalError(false);
    setReversalMessage('Submitting reversal request…');
    try {
      const response = await reversalsControllerReverseV1(
        selected.transactionId,
        { reason: trimmedReason },
        createApiRequest({ csrf: true, idempotencyKey }),
      );
      if (detailGeneration.current !== requestGeneration) return;
      if (response.status !== 201) {
        setReversalError(true);
        setReversalMessage(
          `The reversal was not confirmed (${response.status}). Review the transaction and try again if appropriate.`,
        );
        return;
      }

      setReversalSubmitted(true);
      setReason('');
      setConfirmation('');
      const reversalData = response.data.data as Record<string, unknown>;
      setReversalMessage(
        typeof reversalData.receiptId === 'string'
          ? `Receipt settlement reversed together: Earn ${String(reversalData.originalEarnTransactionId)} and redemption ${String(reversalData.originalRedemptionTransactionId)}.`
          : 'Reversal confirmed by the transaction service.',
      );
      reversalKeyRef.current = null;
      const generation = detailGeneration.current;
      void loyaltyControllerGetTransactionV1(
        selected.transactionId,
        createApiRequest({ csrf: true }),
      )
        .then((refreshResponse) => {
          if (
            detailGeneration.current !== generation ||
            refreshResponse.status !== 200
          ) {
            return;
          }
          const refreshedRecord = refreshResponse.data.data;
          if (
            refreshedRecord.transactionId === selected.transactionId &&
            normalizeReceipt(refreshedRecord.posReceiptNumber) ===
              normalizeReceipt(selected.receiptNumber)
          ) {
            setDetailState({ status: 'loaded', record: refreshedRecord });
          }
        })
        .catch(() => undefined);
      void loadReceiptResults(searchedReceipt, cursorStack[pageIndex], true);
    } catch {
      if (detailGeneration.current === requestGeneration) {
        setReversalError(true);
        setReversalMessage(
          'The reversal could not be confirmed. The same request can be retried safely.',
        );
      }
    } finally {
      if (detailGeneration.current === requestGeneration) {
        setSubmittingReversal(false);
      }
    }
  }

  const currentPage = pageIndex + 1;
  const statusFilterOptions: readonly TransactionFilterOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'REVERSED', label: 'Reversed' },
  ];
  const staffFilterOptions: readonly TransactionFilterOption[] = [
    { value: '', label: 'All Staff' },
    ...staffOptions.map((option) => ({
      value: option.id,
      label: option.label,
    })),
  ];

  return (
    <section
      className="supervisor-page transaction-dashboard supervisor-transactions-dashboard"
      data-od-id="transactions-view"
      aria-labelledby="supervisor-transactions-title"
    >
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        dataOdId="transactions-heading"
        title={<span id="supervisor-transactions-title">Transactions</span>}
        description="Review branch transactions and filter by receipt number."
        actions={
          <button
            className="supervisor-transaction-refresh"
            type="button"
            onClick={refreshResults}
            disabled={
              listState === 'idle' ||
              listState === 'loading' ||
              searching ||
              filtersDirty
            }
            aria-label="Refresh transactions"
            title="Refresh transactions"
          >
            <span className="supervisor-transaction-refresh-content">
              <RefreshCw aria-hidden="true" size={14} />
              {listState === 'loading' ? 'Refreshing' : 'Refresh'}
            </span>
          </button>
        }
      />

      <ShopCityCard
        as="section"
        variant="table"
        className="transaction-table-card supervisor-transaction-table-card"
        data-od-id="transactions-table"
        aria-label="Supervisor transaction results"
      >
        <form
          className="supervisor-transaction-search"
          data-od-id="transaction-filters"
          role="search"
          onSubmit={search}
        >
          <label
            className="supervisor-transaction-filter supervisor-transaction-filter--receipt"
            htmlFor="supervisor-transaction-receipt-number"
          >
            <span>Receipt number</span>
            <Input
              id="supervisor-transaction-receipt-number"
              aria-label="Receipt number"
              autoComplete="off"
              placeholder="Filter by receipt number"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                setFiltersDirty(true);
                if (value.trim() !== searchedReceipt) {
                  setStaffOptions([]);
                  setStaffFilter('');
                }
                setFilterError('');
              }}
            />
          </label>
          <div className="supervisor-transaction-filter">
            <span>Status</span>
            <SupervisorTransactionFilterDropdown
              id="supervisor-transaction-status-filter"
              label="Status filter"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => {
                setStatusFilter(
                  value as
                    LoyaltyControllerSearchTransactionsByReceiptV1Status | '',
                );
                setFiltersDirty(true);
                setFilterError('');
              }}
            />
          </div>
          <div className="supervisor-transaction-filter">
            <span>Staff</span>
            <SupervisorTransactionFilterDropdown
              id="supervisor-transaction-staff-filter"
              label="Staff filter"
              value={staffFilter}
              options={staffFilterOptions}
              disabled={searching}
              onChange={(value) => {
                setStaffFilter(value);
                setFiltersDirty(true);
                setFilterError('');
              }}
            />
          </div>
          <label
            className="supervisor-transaction-filter"
            htmlFor="supervisor-transaction-minimum-amount"
          >
            <span>Minimum amount (₦)</span>
            <Input
              id="supervisor-transaction-minimum-amount"
              aria-label="Minimum amount (₦)"
              autoComplete="off"
              inputMode="decimal"
              maxLength={20}
              placeholder="Minimum amount (₦)"
              value={minimumAmount}
              onChange={(event) => {
                setMinimumAmount(event.target.value);
                setFiltersDirty(true);
                setFilterError('');
              }}
            />
          </label>
          <Button
            type="submit"
            className="supervisor-customer-directory__register"
            loading={searching}
          >
            {searchedReceipt || statusFilter || staffFilter || minimumAmount
              ? 'Apply filters'
              : 'Search'}
          </Button>
        </form>

        {filterError ? (
          <p className="supervisor-transaction-filter-error" role="alert">
            {filterError}
          </p>
        ) : null}

        {message ? (
          <p
            className="cashier-workflow-notice supervisor-transaction-status"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <div className="supervisor-customer-table-wrap supervisor-transaction-table-scroll">
          <Table className="supervisor-customer-table supervisor-transaction-table">
            <caption className="sr-only">
              Supervisor branch transactions
            </caption>
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={TRANSACTION_COLUMN_LABELS[index]} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {TRANSACTION_COLUMN_LABELS.map((label, index) => {
                  const resizable =
                    index < TRANSACTION_COLUMN_LABELS.length - 1;
                  const pairWidth =
                    columnWidths[index] + (columnWidths[index + 1] ?? 0);
                  return (
                    <th
                      key={label}
                      scope="col"
                      aria-labelledby={`supervisor-transaction-column-${index}`}
                      className={
                        resizable
                          ? 'supervisor-transaction-table__resizable-header'
                          : undefined
                      }
                    >
                      <span id={`supervisor-transaction-column-${index}`}>
                        {label}
                      </span>
                      {resizable ? (
                        <button
                          type="button"
                          className="supervisor-transaction-table__column-resizer"
                          role="slider"
                          aria-label={`Resize between ${label} and ${TRANSACTION_COLUMN_LABELS[index + 1]}`}
                          aria-orientation="horizontal"
                          aria-valuemin={MIN_TRANSACTION_COLUMN_WIDTHS[index]}
                          aria-valuemax={
                            pairWidth - MIN_TRANSACTION_COLUMN_WIDTHS[index + 1]
                          }
                          aria-valuenow={columnWidths[index]}
                          aria-valuetext={`${columnWidths[index]} pixels for ${label}`}
                          tabIndex={0}
                          title={`Resize between ${label} and ${TRANSACTION_COLUMN_LABELS[index + 1]}`}
                          onKeyDown={(event) =>
                            resizeColumnWithKeyboard(index, event)
                          }
                          onPointerDown={(event) =>
                            startColumnResize(index, event)
                          }
                          onPointerMove={(event) =>
                            moveColumnResize(index, event)
                          }
                          onPointerUp={endColumnResize}
                          onPointerCancel={endColumnResize}
                          onLostPointerCapture={endColumnResize}
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr
                    key={item.transactionId}
                    ref={(element) => {
                      if (
                        selected?.transactionId === item.transactionId &&
                        element
                      ) {
                        triggerRef.current = element;
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open ${item.operation.toLowerCase()} transaction for receipt ${item.receiptNumber}`}
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
                    <td
                      data-label="Receipt No."
                      className="supervisor-customer-table__card-number"
                      title={item.receiptNumber}
                    >
                      {item.receiptNumber}
                    </td>
                    <td data-label="Name">
                      <div className="supervisor-customer-table__identity">
                        <strong title={item.customerName ?? undefined}>
                          {item.customerName ?? 'Not provided'}
                        </strong>
                      </div>
                    </td>
                    <td
                      data-label="Receipt amount"
                      className="supervisor-customer-table__money"
                    >
                      {item.purchaseAmountKobo == null ? (
                        'Not provided'
                      ) : (
                        <Money amountKobo={item.purchaseAmountKobo} />
                      )}
                    </td>
                    <td
                      data-label="Credit"
                      className="supervisor-customer-table__money"
                    >
                      {item.creditKobo == null ? (
                        <span aria-label="Not applicable">—</span>
                      ) : (
                        <Money amountKobo={item.creditKobo} />
                      )}
                    </td>
                    <td data-label="Date & time">
                      {formatDate(item.occurredAt)}
                    </td>
                    <td data-label="Status">
                      <StatusBadge
                        label={statusLabel(item.status)}
                        tone={statusTone(item.status)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="supervisor-customer-table__empty" colSpan={6}>
                    <div
                      className="transaction-empty-state"
                      role={listState === 'error' ? 'alert' : 'status'}
                    >
                      <strong>
                        {listState === 'loading'
                          ? 'Loading transactions'
                          : listState === 'error'
                            ? 'Transactions unavailable'
                            : listState === 'loaded'
                              ? searchedReceipt
                                ? 'No transactions found'
                                : 'No branch transactions found'
                              : 'Loading branch transactions'}
                      </strong>
                      <p>
                        {listState === 'loading'
                          ? searchedReceipt
                            ? `Loading transactions for receipt ${searchedReceipt}.`
                            : 'Loading the first page of branch transactions.'
                          : listState === 'error'
                            ? 'The branch transaction list could not be completed.'
                            : listState === 'loaded'
                              ? searchedReceipt
                                ? 'No matching transactions were found for this receipt number.'
                                : 'No transactions were found in this branch.'
                              : 'The branch transaction list loads automatically.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        <footer className="transaction-table-footer">
          {searchedReceipt ? (
            <p className="cashier-workflow-hint">
              Receipt {searchedReceipt} · page {currentPage}
            </p>
          ) : null}
          <nav
            className="supervisor-transaction-pagination"
            aria-label="Transaction pages"
          >
            <button
              className="supervisor-transaction-pagination-button"
              type="button"
              aria-label="Previous transactions page"
              title="Previous transactions page"
              disabled={pageIndex === 0 || searching || filtersDirty}
              onClick={loadPreviousPage}
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <p
              className="supervisor-transaction-pagination-status"
              aria-live="polite"
            >
              Page {currentPage}
            </p>
            <button
              className="supervisor-transaction-pagination-button"
              type="button"
              aria-label="Next transactions page"
              title="Next transactions page"
              disabled={!hasMore || searching || filtersDirty}
              onClick={loadNextPage}
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </nav>
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
            className="transaction-detail-modal supervisor-transaction-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supervisor-transaction-detail-title"
          >
            <div className="transaction-detail-modal__head">
              <div>
                <p className="section-label">Transaction</p>
                <h2 id="supervisor-transaction-detail-title">
                  Transaction {selected.receiptNumber}
                </h2>
                <p className="transaction-detail-modal__note">
                  Details for transaction {selected.receiptNumber}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                aria-label="Close transaction detail"
                disabled={submittingReversal}
                onClick={closeDetail}
              >
                <X aria-hidden="true" size={16} />
              </Button>
            </div>

            {detailState.status === 'loading' ? (
              <p role="status">Loading authoritative transaction detail…</p>
            ) : detailState.status === 'error' ? (
              <Alert tone="danger" title="Transaction detail unavailable">
                The selected result could not be verified. Reversal controls are
                not available.
              </Alert>
            ) : detailState.status === 'loaded' ? (
              <div className="transaction-detail-columns supervisor-transaction-detail-columns">
                <dl className="transaction-detail-list supervisor-transaction-detail-list">
                  <div>
                    <dt>Receipt number</dt>
                    <dd>
                      {detailState.record.posReceiptNumber ?? 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Operation</dt>
                    <dd>{detailState.record.type}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge
                        label={statusLabel(detailState.record.state)}
                        tone={statusTone(detailState.record.state)}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Transaction amount</dt>
                    <dd>
                      <Money
                        amountKobo={
                          detailState.record.type === 'EARN'
                            ? detailState.record.creditKobo
                            : (detailState.record.redeemedAmountKobo ??
                              Math.abs(selected.amountKobo))
                        }
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Purchase amount</dt>
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
                    <dt>Available balance</dt>
                    <dd>
                      <Money
                        amountKobo={detailState.record.availableBalanceKobo}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Occurred at</dt>
                    <dd>{formatDate(detailState.record.occurredAt)}</dd>
                  </div>
                  <div>
                    <dt>Captured at</dt>
                    <dd>{formatDate(detailState.record.capturedAt)}</dd>
                  </div>
                </dl>

                <div className="transaction-detail-context supervisor-transaction-detail-context">
                  <div className="transaction-receipt-preview supervisor-transaction-receipt-preview">
                    Receipt image is not provided by the transaction service.
                  </div>
                  <section
                    className="transaction-audit supervisor-transaction-audit"
                    aria-labelledby="supervisor-transaction-timeline-title"
                  >
                    <h3 id="supervisor-transaction-timeline-title">
                      Transaction timeline
                    </h3>
                    <div className="transaction-audit-list">
                      <div>
                        <strong>Occurred</strong>
                        <span>{formatDate(detailState.record.occurredAt)}</span>
                      </div>
                      <div>
                        <strong>Captured</strong>
                        <span>{formatDate(detailState.record.capturedAt)}</span>
                      </div>
                      <div>
                        <strong>Outcome</strong>
                        <span>{statusLabel(detailState.record.state)}</span>
                      </div>
                    </div>
                  </section>
                  {reversalSubmitted ? (
                    <Alert tone="success" title="Reversal confirmed">
                      The transaction service confirmed the reversal request.
                    </Alert>
                  ) : (
                    <form
                      className="supervisor-transaction-reversal"
                      onSubmit={submitReversal}
                    >
                      <h3>Request reversal</h3>
                      <p className="cashier-workflow-hint">
                        The service checks whether this transaction can be
                        reversed.
                      </p>
                      <Textarea
                        aria-label="Reversal reason"
                        placeholder="Reason for reversal"
                        rows={3}
                        required
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                          setReversalMessage('');
                          setReversalError(false);
                        }}
                      />
                      <Input
                        aria-label="Type REVERSE to confirm"
                        autoComplete="off"
                        placeholder="Type REVERSE to confirm"
                        value={confirmation}
                        onChange={(event) => {
                          setConfirmation(event.target.value);
                          setReversalMessage('');
                          setReversalError(false);
                        }}
                      />
                      {reversalMessage ? (
                        <p
                          className="cashier-workflow-hint"
                          role={reversalError ? 'alert' : 'status'}
                        >
                          {reversalMessage}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        loading={submittingReversal}
                        disabled={
                          submittingReversal ||
                          !reason.trim() ||
                          confirmation.trim().toUpperCase() !== 'REVERSE'
                        }
                      >
                        Confirm reversal
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
