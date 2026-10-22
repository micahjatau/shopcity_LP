'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileWarning,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
  customersControllerGetCustomerProfileProjectionV1,
  customersControllerGetCustomerV1,
  ApprovalsControllerListApprovalsV1Category,
  type ApprovalDecisionDtoDecision,
  type ApprovalsControllerListApprovalsV1200DataCategoryCounts,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Dialog, Input, RadioGroup, Select, Table } from '../ui';

type ApprovalRecord = {
  [key: string]: unknown;
  id?: string;
  status?: string;
  targetType?: string;
  customer?: { id?: string; fullName?: string; branchId?: string | null };
  customerId?: string;
  requester?: { username?: string; role?: string } | null;
  reasonCode?: string;
  category?:
    | (typeof ApprovalsControllerListApprovalsV1Category)[keyof typeof ApprovalsControllerListApprovalsV1Category]
    | null;
  ruleCode?: string;
  branchId?: string;
  receipt?: {
    posReceiptNumber?: string;
    purchaseAmountKobo?: number;
    occurredAt?: string;
    [key: string]: unknown;
  } | null;
  referenceNumber?: string;
  receiptNumber?: string;
  posReceiptNumber?: string;
  requestedAmountKobo?: number;
  amountKobo?: number;
  requestedAt?: string;
  expiresAt?: string;
  decidedAt?: string | null;
  executedAt?: string | null;
};

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
type ApprovalCategory =
  (typeof ApprovalsControllerListApprovalsV1Category)[keyof typeof ApprovalsControllerListApprovalsV1Category];

const reasonOptions: Record<
  ApprovalDecisionDtoDecision,
  { value: string; label: string }[]
> = {
  APPROVED: [
    { value: 'Reviewed and validated', label: 'Reviewed and validated' },
    {
      value: 'Customer and transaction details confirmed',
      label: 'Customer and transaction details confirmed',
    },
    { value: 'Meets approval policy', label: 'Meets approval policy' },
  ],
  REJECTED: [
    {
      value: 'Insufficient supporting information',
      label: 'Insufficient supporting information',
    },
    {
      value: 'Does not meet approval policy',
      label: 'Does not meet approval policy',
    },
    {
      value: 'Duplicate or invalid transaction evidence',
      label: 'Duplicate or invalid transaction evidence',
    },
    { value: 'Suspected fraud or misuse', label: 'Suspected fraud or misuse' },
  ],
};

export function ApprovalsPanel({
  variant = 'admin',
}: {
  variant?: 'admin' | 'supervisor';
}) {
  const [items, setItems] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] =
    useState<ApprovalDecisionDtoDecision>('APPROVED');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [limit, setLimit] = useState(10);
  const [cursorHistory, setCursorHistory] = useState<string[]>(['']);
  const cursorHistoryRef = useRef(cursorHistory);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<ApprovalCategory>(
    ApprovalsControllerListApprovalsV1Category.HIGH_VALUE_TRANSACTION,
  );
  const [categoryCounts, setCategoryCounts] =
    useState<ApprovalsControllerListApprovalsV1200DataCategoryCounts | null>(
      null,
    );
  const requestSequenceRef = useRef(0);

  cursorHistoryRef.current = cursorHistory;
  const serverSearchTerm = variant === 'supervisor' ? searchTerm : '';

  const filteredItems = useMemo(() => {
    if (variant === 'supervisor') return items;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [
        item.id,
        item.customer?.fullName,
        item.customer?.id,
        item.customerId,
        item.reasonCode,
        item.ruleCode,
        item.branchId,
        item.receipt?.posReceiptNumber,
        item.posReceiptNumber,
        item.receiptNumber,
        item.referenceNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [items, searchTerm, variant]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const isPending = selectedItem?.status === 'PENDING';
  const decisionReason = [reason.trim(), note.trim()]
    .filter(Boolean)
    .join(' — ');
  const resultsTitle = {
    ALL: 'All approvals',
    PENDING: 'Transactions awaiting approval',
    APPROVED: 'Approved transactions',
    REJECTED: 'Rejected transactions',
    EXPIRED: 'Expired approvals',
  }[statusFilter];

  const refresh = useCallback(
    async (cursorOverride = '') => {
      const requestSequence = ++requestSequenceRef.current;
      setLoading(true);
      if (variant === 'supervisor') {
        setItems([]);
        setSelectedId(null);
        setCategoryCounts(null);
      }
      try {
        const response = await approvalsControllerListApprovalsV1(
          {
            limit: String(limit),
            cursor: cursorOverride,
            status: statusFilter,
            ...(variant === 'supervisor'
              ? {
                  category: activeCategory,
                  includeTotalCount: true,
                  ...(serverSearchTerm.trim()
                    ? { search: serverSearchTerm.trim() }
                    : {}),
                }
              : {}),
          },
          createApiRequest({ csrf: true }),
        );
        if (requestSequence !== requestSequenceRef.current) return;
        if (response.status === 200) {
          const nextItems = response.data.data.items as ApprovalRecord[];
          if (variant === 'supervisor') {
            setCategoryCounts(response.data.data.categoryCounts ?? null);
          }
          setItems(nextItems);
          setNextCursor(response.data.data.nextCursor ?? null);
          setSelectedId((current) =>
            nextItems.some((item) => item.id === current)
              ? current
              : (nextItems.find((item) => item.status === 'PENDING')?.id ??
                null),
          );
          setMessage('');
        } else {
          if (variant === 'supervisor') setCategoryCounts(null);
          setMessage(`Approvals unavailable (${response.status}).`);
        }
      } catch {
        if (requestSequence === requestSequenceRef.current) {
          if (variant === 'supervisor') setCategoryCounts(null);
          setMessage('Approvals unavailable. Try refreshing the queue.');
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoading(false);
        }
      }
    },
    [activeCategory, limit, serverSearchTerm, statusFilter, variant],
  );

  useEffect(() => {
    setCursorHistory(['']);
    setSelectedId(null);
    setReason('');
    setNote('');
    void refresh('');
  }, [activeCategory, limit, serverSearchTerm, statusFilter, refresh]);

  function refreshFromFirstPage() {
    setCursorHistory(['']);
    setSelectedId(null);
    setReason('');
    setNote('');
    void refresh('');
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;
    const cursor = nextCursor;
    setCursorHistory((current) => [...current, cursor]);
    setSelectedId(null);
    setReason('');
    setNote('');
    await refresh(cursor);
  }

  async function goToPreviousPage() {
    if (cursorHistory.length <= 1 || loading) return;
    const history = cursorHistory.slice(0, -1);
    setCursorHistory(history);
    setSelectedId(null);
    setReason('');
    setNote('');
    await refresh(history[history.length - 1] ?? '');
  }

  async function handleDecision(
    decisionOverride?: ApprovalDecisionDtoDecision,
  ) {
    if (!selectedId || !isPending || !reason.trim() || submitting) return;
    const approvalId = selectedId;
    const decisionToSubmit = decisionOverride ?? decision;
    setDecision(decisionToSubmit);
    setSubmitting(true);
    try {
      const response = await approvalsControllerDecideApprovalV1(
        approvalId,
        { decision: decisionToSubmit, reason: decisionReason },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      const payload =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null;
      if (response.status < 200 || response.status >= 300) {
        const error =
          payload?.error && typeof payload.error === 'object'
            ? (payload.error as Record<string, unknown>)
            : payload;
        setMessage(
          `${typeof error?.code === 'string' ? error.code : 'DECISION_FAILED'}: ${typeof error?.message === 'string' ? error.message : 'The decision was not recorded.'}`,
        );
        return;
      }
      const remainingItems = items.filter((item) => item.id !== approvalId);
      setItems(remainingItems);
      setSelectedId(
        remainingItems.find((item) => item.status === 'PENDING')?.id ?? null,
      );
      setReason('');
      setNote('');
      if (variant === 'supervisor') setSearchTerm('');
      setMessage('Decision submitted.');
      setCursorHistory(['']);
      await refresh('');
      setMessage('Decision submitted.');
    } catch {
      setMessage(
        'Decision could not be confirmed. Refresh the queue before retrying.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === 'supervisor') {
    return (
      <SupervisorApprovalCenter
        filteredItems={filteredItems}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categoryCounts={categoryCounts}
        selectedItem={selectedItem}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        limit={limit}
        setLimit={setLimit}
        loading={loading}
        submitting={submitting}
        message={message}
        refresh={refreshFromFirstPage}
        cursorHistory={cursorHistory}
        nextCursor={nextCursor}
        goToNextPage={goToNextPage}
        goToPreviousPage={goToPreviousPage}
        isPending={isPending}
        decision={decision}
        reason={reason}
        setReason={setReason}
        setNote={setNote}
        handleDecision={handleDecision}
      />
    );
  }

  return (
    <section className="approval-queue" aria-label="Approval queue">
      <div className="approval-queue__toolbar">
        <Select
          aria-label="Approval status filter"
          value={statusFilter}
          options={[
            { value: 'PENDING', label: 'Needs review' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'EXPIRED', label: 'Expired' },
            { value: 'ALL', label: 'All approvals' },
          ]}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
        />
        <Input
          aria-label="Approval search"
          placeholder="Search results"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Select
          aria-label="Approval page size"
          value={String(limit)}
          options={[
            { value: '10', label: '10 per page' },
            { value: '20', label: '20 per page' },
            { value: '50', label: '50 per page' },
          ]}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
        <Button
          variant="secondary"
          onClick={refreshFromFirstPage}
          loading={loading}
        >
          Refresh approvals
        </Button>
      </div>

      {message ? (
        <p
          className="approval-queue__feedback"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <section
        className="approval-queue__results"
        aria-label="Approval results"
      >
        <header className="approval-queue__results-header">
          <h2>{resultsTitle}</h2>
          <p>
            {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
          </p>
        </header>
        <div className="approval-queue__table-wrap">
          <Table className="approval-queue__table">
            <thead>
              <tr>
                <th scope="col">Transaction</th>
                <th scope="col">Customer</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="approval-queue__empty">
                    {loading
                      ? 'Loading approvals…'
                      : 'No approvals found. Try another status or refresh the list.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const customerName = customerLabel(item);
                  return (
                    <tr
                      key={item.id ?? `${item.reasonCode}-${item.requestedAt}`}
                    >
                      <th scope="row">
                        {item.receipt?.posReceiptNumber ??
                          item.posReceiptNumber ??
                          item.referenceNumber ??
                          item.id ??
                          '—'}
                      </th>
                      <td>{customerName}</td>
                      <td>
                        {item.targetType === 'REDEEM'
                          ? 'Redemption'
                          : 'Purchase'}
                      </td>
                      <td>
                        {formatKobo(
                          item.requestedAmountKobo ??
                            item.receipt?.purchaseAmountKobo ??
                            item.amountKobo,
                        )}
                      </td>
                      <td>{statusLabel(item.status)}</td>
                      <td>
                        <Button
                          variant="secondary"
                          className="approval-queue__review"
                          aria-label={`Review approval for ${customerName}`}
                          onClick={() => {
                            setSelectedId(item.id ?? null);
                            setDecision('APPROVED');
                            setReason('');
                            setNote('');
                          }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
        <nav className="approval-queue__pagination" aria-label="Approval pages">
          <Button
            variant="secondary"
            aria-label="Previous"
            title="Previous"
            onClick={() => void goToPreviousPage()}
            disabled={cursorHistory.length <= 1 || loading}
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
          </Button>
          <span>Page {cursorHistory.length}</span>
          <Button
            variant="secondary"
            aria-label="Next"
            title="Next"
            onClick={() => void goToNextPage()}
            disabled={!nextCursor || loading}
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
          </Button>
        </nav>
      </section>

      <Dialog
        open={Boolean(selectedItem)}
        title={isPending ? 'Review approval' : 'Approval details'}
        onClose={() => {
          if (!submitting) setSelectedId(null);
        }}
      >
        {selectedItem ? (
          <div className="approval-queue__dialog-content">
            <p>Review the transaction details before recording a decision.</p>
            <Table>
              <tbody>
                <tr>
                  <th scope="row">Customer</th>
                  <td>
                    {selectedItem.customer?.fullName ??
                      selectedItem.customer?.id ??
                      selectedItem.customerId ??
                      '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Type</th>
                  <td>
                    {selectedItem.targetType === 'REDEEM'
                      ? 'Redemption'
                      : 'Purchase'}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Reference</th>
                  <td>
                    {selectedItem.receipt?.posReceiptNumber ??
                      selectedItem.posReceiptNumber ??
                      selectedItem.referenceNumber ??
                      selectedItem.id ??
                      '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Amount</th>
                  <td>
                    {formatKobo(
                      selectedItem.requestedAmountKobo ??
                        selectedItem.receipt?.purchaseAmountKobo ??
                        selectedItem.amountKobo,
                    )}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Requested</th>
                  <td>{formatDate(selectedItem.requestedAt)}</td>
                </tr>
                <tr>
                  <th scope="row">Status</th>
                  <td>{statusLabel(selectedItem.status)}</td>
                </tr>
                <tr>
                  <th scope="row">Approval reason</th>
                  <td>
                    {selectedItem.reasonCode ?? selectedItem.ruleCode ?? '—'}
                  </td>
                </tr>
                {selectedItem.decidedAt ? (
                  <tr>
                    <th scope="row">Decided</th>
                    <td>{formatDate(selectedItem.decidedAt)}</td>
                  </tr>
                ) : null}
                {selectedItem.executedAt ? (
                  <tr>
                    <th scope="row">Completed</th>
                    <td>{formatDate(selectedItem.executedAt)}</td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
            {isPending ? (
              <>
                <RadioGroup
                  name="approval-decision"
                  legend="Decision"
                  options={[
                    { value: 'APPROVED', label: 'Approve' },
                    { value: 'REJECTED', label: 'Reject' },
                  ]}
                  value={decision}
                  onValueChange={(value) => {
                    setDecision(value as ApprovalDecisionDtoDecision);
                    setReason('');
                  }}
                />
                <Select
                  aria-label="Decision reason"
                  value={reason}
                  placeholder="Select a reason"
                  options={reasonOptions[decision]}
                  onChange={(event) => setReason(event.target.value)}
                />
                <Input
                  aria-label="Additional decision note"
                  placeholder="Additional detail (optional)"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <div className="approval-queue__dialog-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedId(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleDecision()}
                    loading={submitting}
                    disabled={!reason || submitting}
                  >
                    Submit {decision === 'APPROVED' ? 'approval' : 'rejection'}
                  </Button>
                </div>
              </>
            ) : (
              <Alert tone="info" title="Decision already recorded">
                This approval is read-only because its status is{' '}
                {selectedItem.status ?? 'no longer pending'}.
              </Alert>
            )}
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}

type SupervisorApprovalCenterProps = {
  filteredItems: ApprovalRecord[];
  activeCategory: ApprovalCategory;
  setActiveCategory: (value: ApprovalCategory) => void;
  categoryCounts: ApprovalsControllerListApprovalsV1200DataCategoryCounts | null;
  selectedItem: ApprovalRecord | null;
  selectedId: string | null;
  setSelectedId: (value: string | null) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  limit: number;
  setLimit: (value: number) => void;
  loading: boolean;
  submitting: boolean;
  message: string;
  refresh: () => void;
  cursorHistory: string[];
  nextCursor: string | null;
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => Promise<void>;
  isPending: boolean | undefined;
  decision: ApprovalDecisionDtoDecision;
  reason: string;
  setReason: (value: string) => void;
  setNote: (value: string) => void;
  handleDecision: (decision?: ApprovalDecisionDtoDecision) => Promise<void>;
};

const approvalCategories: { id: ApprovalCategory; label: string }[] = [
  {
    id: ApprovalsControllerListApprovalsV1Category.HIGH_VALUE_TRANSACTION,
    label: 'High-value transaction',
  },
  {
    id: ApprovalsControllerListApprovalsV1Category.LATE_RECEIPT_CLAIM,
    label: 'Late receipt claim',
  },
];

type SupervisorFilterOption = { value: string; label: string };

type CustomerMetric = {
  status: 'loading' | 'loaded' | 'unavailable';
  value: number | null;
};

type CustomerMetrics = {
  customerId: string;
  walletBalance: CustomerMetric;
  lifetimeEarned: CustomerMetric;
};

function customerMetricPresentation(
  metric: CustomerMetric | undefined,
  customerId: string | undefined,
) {
  if (!customerId) return { value: 'Not provided', isMissing: true };
  if (!metric || metric.status === 'loading') {
    return { value: 'Loading…', isMissing: true };
  }
  if (metric.status === 'unavailable' || metric.value === null) {
    return { value: 'Unavailable', isMissing: true };
  }
  return { value: formatKobo(metric.value), isMissing: false };
}

function SupervisorFilterDropdown({
  id,
  label,
  options,
  value,
  onChange,
  showFilterIcon = false,
  className,
}: Readonly<{
  id: string;
  label: string;
  options: SupervisorFilterOption[];
  value: string;
  onChange: (nextValue: string) => void;
  showFilterIcon?: boolean;
  className: string;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ??
    options[0] ?? {
      value: '',
      label: 'Select an option',
    };

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
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function handleOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
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
  }

  return (
    <div ref={rootRef} className={`supervisor-filter-menu ${className}`}>
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        className="supervisor-filter-action supervisor-filter-menu-trigger"
        aria-label={`${label}, ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setActiveIndex(selectedIndex);
          setOpen(true);
        }}
      >
        {showFilterIcon ? (
          <Filter
            className="supervisor-filter-icon--inline"
            aria-hidden="true"
            size={16}
          />
        ) : null}
        <span>{selectedOption.label}</span>
        <ChevronDown
          className="supervisor-filter-icon--inline"
          aria-hidden="true"
          size={16}
        />
      </Button>
      {open ? (
        <div
          id={id}
          className="supervisor-customer-directory__status-menu"
          role="listbox"
          aria-label={`${label} options`}
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

function SupervisorApprovalCenter({
  filteredItems,
  activeCategory,
  setActiveCategory,
  categoryCounts,
  selectedItem,
  selectedId,
  setSelectedId,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  limit,
  setLimit,
  loading,
  submitting,
  message,
  refresh,
  cursorHistory,
  nextCursor,
  goToNextPage,
  goToPreviousPage,
  isPending,
  decision,
  reason,
  setReason,
  setNote,
  handleDecision,
}: SupervisorApprovalCenterProps) {
  const [decisionReasonError, setDecisionReasonError] = useState('');
  const [customerMetrics, setCustomerMetrics] =
    useState<CustomerMetrics | null>(null);

  useEffect(() => {
    setDecisionReasonError('');
  }, [selectedItem?.id]);

  function submitDecision(nextDecision: ApprovalDecisionDtoDecision) {
    if (!reason.trim()) {
      setDecisionReasonError('Enter a decision reason.');
      return;
    }
    setDecisionReasonError('');
    void handleDecision(nextDecision);
  }

  const categoriesWithCounts = approvalCategories.map((category) => ({
    ...category,
    count: categoryCounts?.[category.id],
  }));
  const visibleItems = filteredItems.filter(
    (item) => item.category === activeCategory,
  );
  const isLateReceiptCategory =
    activeCategory ===
    ApprovalsControllerListApprovalsV1Category.LATE_RECEIPT_CLAIM;
  const selectedAmount = selectedItem
    ? (selectedItem.requestedAmountKobo ??
      selectedItem.receipt?.purchaseAmountKobo ??
      selectedItem.amountKobo)
    : undefined;
  const customerRouteId =
    selectedItem?.customer?.id && selectedItem.customer.id !== selectedItem.id
      ? selectedItem.customer.id
      : selectedItem?.customerId && selectedItem.customerId !== selectedItem.id
        ? selectedItem.customerId
        : undefined;
  const metricCustomerId = customerRouteId;

  useEffect(() => {
    if (!metricCustomerId) {
      setCustomerMetrics(null);
      return;
    }

    let active = true;
    setCustomerMetrics({
      customerId: metricCustomerId,
      walletBalance: { status: 'loading', value: null },
      lifetimeEarned: { status: 'loading', value: null },
    });

    const walletBalanceRequest = customersControllerGetCustomerV1(
      metricCustomerId,
      createApiRequest({ csrf: true }),
    )
      .then((response): CustomerMetric => {
        const customer = response.status === 200 ? response.data.data : null;
        const value =
          customer?.customerId === metricCustomerId
            ? customer.availableBalanceKobo
            : undefined;
        return typeof value === 'number' && Number.isFinite(value)
          ? { status: 'loaded', value }
          : { status: 'unavailable', value: null };
      })
      .catch((): CustomerMetric => ({ status: 'unavailable', value: null }));

    const lifetimeEarnedRequest =
      customersControllerGetCustomerProfileProjectionV1(
        metricCustomerId,
        createApiRequest({ csrf: true }),
      )
        .then((response): CustomerMetric => {
          const projection =
            response.status === 200 ? response.data.data : null;
          const value =
            projection?.customerId === metricCustomerId
              ? projection.lifetimeEarnedKobo
              : undefined;
          return typeof value === 'number' && Number.isFinite(value)
            ? { status: 'loaded', value }
            : { status: 'unavailable', value: null };
        })
        .catch((): CustomerMetric => ({ status: 'unavailable', value: null }));

    void walletBalanceRequest.then((walletBalance) => {
      if (!active) return;
      setCustomerMetrics((current) =>
        current?.customerId === metricCustomerId
          ? { ...current, walletBalance }
          : current,
      );
    });
    void lifetimeEarnedRequest.then((lifetimeEarned) => {
      if (!active) return;
      setCustomerMetrics((current) =>
        current?.customerId === metricCustomerId
          ? { ...current, lifetimeEarned }
          : current,
      );
    });

    return () => {
      active = false;
    };
  }, [metricCustomerId]);

  const currentCustomerMetrics =
    customerMetrics?.customerId === metricCustomerId ? customerMetrics : null;
  const walletBalanceMetric = customerMetricPresentation(
    currentCustomerMetrics?.walletBalance,
    metricCustomerId,
  );
  const lifetimeEarnedMetric = customerMetricPresentation(
    currentCustomerMetrics?.lifetimeEarned,
    metricCustomerId,
  );

  return (
    <section
      className="approval-queue approval-queue--supervisor"
      aria-label="Approval queue"
    >
      <div
        className="approval-queue__categories"
        role="tablist"
        aria-label="Approval categories"
      >
        {categoriesWithCounts.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === category.id}
            aria-label={`${category.label}, ${category.count === undefined ? 'count unavailable' : `${category.count} matching ${category.count === 1 ? 'request' : 'requests'}`}`}
            className="approval-queue__category"
            onClick={() => {
              setActiveCategory(category.id);
              setSelectedId(null);
              setReason('');
              setNote('');
              setDecisionReasonError('');
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                return;
              event.preventDefault();
              const tabs = Array.from(
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ) ?? [],
              );
              const index = tabs.indexOf(event.currentTarget);
              const step = event.key === 'ArrowRight' ? 1 : -1;
              tabs[(index + step + tabs.length) % tabs.length]?.click();
              tabs[(index + step + tabs.length) % tabs.length]?.focus();
            }}
          >
            <span>{category.label}</span>
            <span className="approval-queue__category-count" aria-hidden="true">
              {category.count ?? '—'}
            </span>
          </button>
        ))}
      </div>
      {message ? (
        <p
          className="approval-queue__feedback"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <div className="approval-queue__workspace">
        <section
          className="approval-queue__results"
          aria-label="Approval requests"
        >
          <header className="approval-queue__panel-header approval-queue__list-header">
            <div className="approval-queue__heading">
              <h2>Recent customers</h2>
              <p>Customers served most recently at this branch.</p>
            </div>
            <div className="supervisor-filter-row approval-queue__controls">
              <SupervisorFilterDropdown
                id="approval-status-filter-options"
                label="Approval status filter"
                className="approval-queue__status-filter"
                value={statusFilter}
                options={[
                  { value: 'PENDING', label: 'Needs review' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'EXPIRED', label: 'Expired' },
                  { value: 'ALL', label: 'Decided / all' },
                ]}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                showFilterIcon
              />
              <div className="supervisor-filter-search">
                <Search
                  className="supervisor-filter-icon supervisor-filter-icon--leading"
                  aria-hidden="true"
                  size={16}
                />
                <Input
                  className="supervisor-filter-search-input"
                  aria-label="Approval search"
                  placeholder="Search approvals"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSelectedId(null);
                    setReason('');
                    setNote('');
                    setDecisionReasonError('');
                  }}
                />
              </div>
              <SupervisorFilterDropdown
                id="approval-page-size-options"
                label="Approval page size"
                className="approval-queue__page-size"
                value={String(limit)}
                options={[
                  { value: '10', label: '10 / page' },
                  { value: '20', label: '20 / page' },
                  { value: '50', label: '50 / page' },
                ]}
                onChange={(value) => setLimit(Number(value))}
              />
            </div>
            <Button
              variant="secondary"
              className="supervisor-filter-action approval-queue__refresh"
              onClick={refresh}
              disabled={loading}
              aria-busy={loading || undefined}
            >
              <RefreshCw
                className={`supervisor-filter-refresh-icon${loading ? ' is-spinning' : ''}`}
                aria-hidden="true"
                size={16}
              />
              Refresh
            </Button>
          </header>

          <div
            className="approval-queue__rows"
            aria-live="polite"
            aria-busy={loading}
          >
            <table
              className="approval-queue__recent-table"
              aria-label={
                isLateReceiptCategory
                  ? 'Late receipt claim approvals'
                  : 'High-value transaction approvals'
              }
            >
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">
                    {isLateReceiptCategory ? 'Receipt Age' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td className="approval-queue__list-empty-cell" colSpan={2}>
                      <div className="approval-queue__list-empty">
                        {loading
                          ? 'Loading approvals…'
                          : 'No requests in this category on the loaded page.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => {
                    const customerName =
                      item.customer?.fullName ?? 'Not provided';
                    const itemId = item.id ?? '';
                    const selectRow = () => {
                      setSelectedId(itemId || null);
                      setReason('');
                      setNote('');
                      setDecisionReasonError('');
                    };
                    return (
                      <tr
                        key={itemId || `${item.reasonCode}-${item.requestedAt}`}
                        className={`approval-queue__row${selectedId === itemId ? ' is-selected' : ''}`}
                        aria-selected={selectedId === itemId}
                        onClick={selectRow}
                      >
                        <td>
                          <button
                            type="button"
                            className="approval-queue__row-select"
                            aria-pressed={selectedId === itemId}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectRow();
                            }}
                          >
                            {customerName}
                          </button>
                        </td>
                        <td className="approval-queue__row-value">
                          {isLateReceiptCategory
                            ? formatReceiptAge(item)
                            : formatKobo(
                                item.requestedAmountKobo ??
                                  item.receipt?.purchaseAmountKobo ??
                                  item.amountKobo,
                              )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <nav
            className="approval-queue__pagination"
            aria-label="Approval pages"
          >
            <Button
              variant="secondary"
              aria-label="Previous"
              title="Previous"
              onClick={() => void goToPreviousPage()}
              disabled={cursorHistory.length <= 1 || loading}
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
            <span>Page {cursorHistory.length}</span>
            <Button
              variant="secondary"
              aria-label="Next"
              title="Next"
              onClick={() => void goToNextPage()}
              disabled={!nextCursor || loading}
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </nav>
        </section>

        <section
          className="approval-queue__decision"
          aria-label="Approval decision"
        >
          <header className="approval-queue__panel-header">
            <h2>Decision</h2>
            <p>
              Evidence on the left, decision here. Every decision is audited.
            </p>
          </header>
          {selectedItem ? (
            <div className="approval-queue__decision-content">
              <dl className="approval-queue__evidence">
                <div>
                  <dt>Customer</dt>
                  <dd
                    className={
                      selectedItem.customer?.fullName ? '' : 'is-missing'
                    }
                  >
                    {selectedItem.customer?.fullName ?? 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd
                    className={
                      typeof selectedAmount === 'number'
                        ? 'approval-queue__evidence-amount'
                        : 'is-missing'
                    }
                  >
                    {formatKoboOrMissing(selectedAmount)}
                  </dd>
                </div>
                <div>
                  <dt>Wallet Balance</dt>
                  <dd
                    className={
                      walletBalanceMetric.isMissing ? 'is-missing' : ''
                    }
                  >
                    {walletBalanceMetric.value}
                  </dd>
                </div>
                <div>
                  <dt>Lifetime Earned</dt>
                  <dd
                    className={
                      lifetimeEarnedMetric.isMissing ? 'is-missing' : ''
                    }
                  >
                    {lifetimeEarnedMetric.value}
                  </dd>
                </div>
                <div>
                  <dt>Date &amp; Time</dt>
                  <dd className={selectedItem.requestedAt ? '' : 'is-missing'}>
                    {selectedItem.requestedAt
                      ? formatApprovalDate(selectedItem.requestedAt)
                      : 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt>Submitted by</dt>
                  <dd
                    className={
                      selectedItem.requester?.username ? '' : 'is-missing'
                    }
                  >
                    {selectedItem.requester?.username ?? 'Not provided'}
                  </dd>
                </div>
              </dl>

              <aside className="approval-queue__submitted-reason">
                <div className="approval-queue__submitted-reason-title">
                  <CircleAlert size={18} aria-hidden="true" />
                  <h3>Reason submitted</h3>
                </div>
                <p className="is-missing">Not provided</p>
              </aside>

              {isPending ? (
                <div className="approval-queue__decision-form">
                  <label htmlFor="approval-decision-reason">
                    Decision reason (required)
                  </label>
                  <textarea
                    id="approval-decision-reason"
                    className="approval-queue__decision-textarea"
                    aria-invalid={Boolean(decisionReasonError)}
                    aria-describedby={
                      decisionReasonError
                        ? 'approval-decision-reason-error'
                        : undefined
                    }
                    required
                    rows={3}
                    placeholder="Enter reason"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (event.target.value.trim()) {
                        setDecisionReasonError('');
                      }
                    }}
                  />
                  {decisionReasonError ? (
                    <p
                      id="approval-decision-reason-error"
                      className="approval-queue__decision-error"
                      role="alert"
                    >
                      {decisionReasonError}
                    </p>
                  ) : null}
                  <div className="approval-queue__decision-actions">
                    <Button
                      className="approval-queue__approve"
                      loading={submitting && decision === 'APPROVED'}
                      disabled={submitting}
                      onClick={() => submitDecision('APPROVED')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      className="approval-queue__reject"
                      loading={submitting && decision === 'REJECTED'}
                      disabled={submitting}
                      onClick={() => submitDecision('REJECTED')}
                    >
                      Reject
                    </Button>
                    {customerRouteId ? (
                      <Link
                        className="approval-queue__view-customer sc-button sc-button--secondary sc-button--standard"
                        href={`/supervisor/customers/${encodeURIComponent(customerRouteId)}`}
                      >
                        View Customer
                      </Link>
                    ) : (
                      <Button
                        variant="secondary"
                        className="approval-queue__view-customer"
                        disabled
                      >
                        View Customer
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Alert tone="info" title="Decision already recorded">
                  This approval is read-only because its status is{' '}
                  {selectedItem.status ?? 'no longer pending'}.
                </Alert>
              )}
            </div>
          ) : (
            <div className="approval-queue__decision-empty">
              <FileWarning size={36} strokeWidth={1.5} aria-hidden="true" />
              <h3>Select an item to review</h3>
              <p>Choose a request from the queue.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function formatKoboOrMissing(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatKobo(value)
    : 'Not provided';
}

function formatApprovalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function customerLabel(item: ApprovalRecord) {
  return (
    item.customer?.fullName ??
    (item.customer?.id ? `Customer ${item.customer.id.slice(0, 8)}` : null) ??
    (item.customerId ? `Customer ${item.customerId.slice(0, 8)}` : 'Customer')
  );
}

function formatReceiptAge(item: ApprovalRecord) {
  const occurredAt = Date.parse(item.receipt?.occurredAt ?? '');
  const requestedAt = Date.parse(item.requestedAt ?? '');
  if (!Number.isFinite(occurredAt) || !Number.isFinite(requestedAt)) {
    return 'Not provided';
  }

  const elapsedMinutes = Math.floor((requestedAt - occurredAt) / 60_000);
  if (elapsedMinutes < 0) return 'Not provided';

  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;
  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hour${hours === 1 ? '' : 's'}` : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function statusLabel(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
    case 'EXECUTED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'EXPIRED':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

function formatKobo(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `₦${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
