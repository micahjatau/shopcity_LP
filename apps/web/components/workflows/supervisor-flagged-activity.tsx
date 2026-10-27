'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  FraudFlagDecisionDtoDecision,
  fraudControllerDecideFraudFlagV1,
  fraudControllerListFraudFlagsV1,
  type FraudFlagDecisionDtoDecision as FraudFlagDecision,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Dialog, Input, RadioGroup, Table } from '../ui';
import { Money } from '../shopcity';

type FraudCategory = 'transactions' | 'staff' | 'security' | 'other';

type FlaggedActivity = {
  id: string;
  ruleCode: string;
  severity: string;
  status: string;
  subjectId?: string;
  branchId?: string | null;
  branchName?: string | null;
  cashierName?: string | null;
  customerName?: string | null;
  receiptNumber?: string | null;
  amountKobo?: number | null;
  occurrenceCount?: number;
  firstDetectedAt?: string;
  lastDetectedAt?: string;
  evidence?: Record<string, unknown>;
};

type Summary = {
  needReviewCount: number;
  highPriorityCount: number;
  underReviewCount: number;
};

type ListPayload = {
  items: FlaggedActivity[];
  summary?: Partial<Summary>;
  nextCursor?: string | null;
  hasMore?: boolean;
};

type QueueFilterState = {
  statusFilter: string;
  priorityFilter: string;
  branchFilter: string;
};

type RulePresentation = {
  category: FraudCategory;
  title: string;
  explanation: string;
  action: string;
  suggestedReview: string;
};

const PAGE_SIZE = 5;
const API_PAGE_SIZE = '25';
const EMPTY_SUMMARY: Summary = {
  needReviewCount: 0,
  highPriorityCount: 0,
  underReviewCount: 0,
};

function filterQueueItems(
  items: FlaggedActivity[],
  categoryFilter: string,
  statusFilter: string,
  priorityFilter: string,
  branchFilter: string,
) {
  return items.filter((item) => {
    if (
      categoryFilter !== 'ALL' &&
      getRulePresentation(item.ruleCode).category !== categoryFilter
    ) {
      return false;
    }
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && item.severity !== priorityFilter)
      return false;
    if (branchFilter !== 'ALL' && item.branchId !== branchFilter) return false;
    return true;
  });
}

function buildQueueQuery(filters: QueueFilterState, cursor = '') {
  return {
    ...(filters.statusFilter !== 'ALL' ? { status: filters.statusFilter } : {}),
    ...(filters.priorityFilter !== 'ALL'
      ? { severity: filters.priorityFilter }
      : {}),
    ...(filters.branchFilter !== 'ALL'
      ? { branchId: filters.branchFilter }
      : {}),
    limit: API_PAGE_SIZE,
    cursor,
  };
}

const CATEGORY_LABELS: Record<FraudCategory, string> = {
  transactions: 'Transactions',
  staff: 'Staff activity',
  security: 'Account security',
  other: 'Other activity',
};

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All activity' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'staff', label: 'Staff activity' },
  { value: 'security', label: 'Account security' },
  { value: 'other', label: 'Other activity' },
] as const;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Needs review' },
  { value: 'ACKNOWLEDGED', label: 'Under review' },
  { value: 'RESOLVED', label: 'Closed' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All priorities' },
  { value: 'HIGH', label: 'High priority' },
  { value: 'MEDIUM', label: 'Needs attention' },
  { value: 'LOW', label: 'Monitor' },
] as const;

const decisionOptions = [
  { value: FraudFlagDecisionDtoDecision.ACKNOWLEDGED, label: 'Acknowledge' },
  { value: FraudFlagDecisionDtoDecision.RESOLVED, label: 'Resolve' },
] as const;

const RULES: Record<string, RulePresentation> = {
  'FR-DUP-001': {
    category: 'transactions',
    title: 'Receipt entered more than once',
    explanation:
      'The same receipt number appears more than once for this branch and receipt week.',
    action:
      'The duplicate attempt was rejected and recorded; no additional credit was issued.',
    suggestedReview:
      'Compare the source receipt with the earlier entry and confirm whether this was a genuine duplicate.',
  },
  'FR-HV-001': {
    category: 'transactions',
    title: 'Purchase above the review threshold',
    explanation:
      'The recorded purchase amount crossed the configured review threshold.',
    action:
      'This rule added a review flag. A separate approval rule may also hold new loyalty credit.',
    suggestedReview:
      'Check the source POS receipt and confirm the recorded amount.',
  },
  'FR-HV-002': {
    category: 'transactions',
    title: 'High-value purchase awaiting approval',
    explanation:
      'The recorded purchase amount crossed the configured approval threshold.',
    action: 'New loyalty credit is held until the approval is decided.',
    suggestedReview:
      'Verify the source receipt and the approval outcome before treating the credit as available.',
  },
  'FR-HV-003': {
    category: 'transactions',
    title: 'Large redemption needing approval',
    explanation:
      'The requested redemption crossed the configured approval threshold.',
    action:
      'The redemption is awaiting Supervisor approval; it has not been settled yet.',
    suggestedReview:
      'Confirm the customer and redemption request, then check the approval outcome.',
  },
  'FR-RED-001': {
    category: 'transactions',
    title: 'Large redemption needing approval',
    explanation:
      'The requested redemption crossed the configured approval threshold.',
    action:
      'The redemption is awaiting Supervisor approval; it has not been settled yet.',
    suggestedReview:
      'Confirm the customer and redemption request, then check the approval outcome.',
  },
  'FR-CARD-001': {
    category: 'transactions',
    title: 'Frequent use of one card',
    explanation:
      'The same loyalty card appeared in more transactions than expected during one local day.',
    action:
      'The pattern was recorded for review; this rule does not automatically reverse a transaction.',
    suggestedReview:
      'Check that the transactions are expected and that each source receipt is distinct.',
  },
  'FR-CASH-001': {
    category: 'staff',
    title: 'Purchase activity differs from peers',
    explanation:
      'A cashier’s recorded activity is above the comparison range for the same branch and period.',
    action:
      'The activity pattern was flagged; this rule does not apply an automatic penalty.',
    suggestedReview:
      'Review the underlying receipts and comparison period before discussing the pattern with staff.',
  },
  'FR-ROUND-001': {
    category: 'staff',
    title: 'Repeated rounded purchase amounts',
    explanation:
      'Several purchase amounts were rounded in a similar way during the review period.',
    action:
      'The activity pattern was flagged; this rule does not apply an automatic penalty.',
    suggestedReview:
      'Compare the source receipts and amounts before deciding whether further review is needed.',
  },
  'FR-REV-001': {
    category: 'staff',
    title: 'Reversals are more frequent than expected',
    explanation:
      'The number of recorded reversals crossed the configured review threshold.',
    action:
      'The pattern was flagged after the reversals were recorded; this rule does not add a separate hold.',
    suggestedReview:
      'Check reversal reasons, timestamps, and the resulting customer balances.',
  },
  'FR-REPL-001': {
    category: 'staff',
    title: 'Repeated card replacements',
    explanation:
      'A customer’s card was replaced more often than the configured threshold during the review period.',
    action:
      'The replacement pattern was flagged; this rule does not apply an automatic penalty.',
    suggestedReview:
      'Confirm the replacement history with the customer before taking any further action.',
  },
  'FR-AUTH-001': {
    category: 'security',
    title: 'Repeated unsuccessful sign-in attempts',
    explanation:
      'Several sign-in attempts for a staff account were unsuccessful within a short period.',
    action:
      'The failed sign-in attempts were rejected and the pattern was recorded for review.',
    suggestedReview:
      'Check with the staff member and review the relevant device or access history.',
  },
};

const summaryItems = [
  { key: 'needReviewCount', label: 'Need review', detail: 'open cases' },
  {
    key: 'highPriorityCount',
    label: 'High priority',
    detail: 'across this branch',
  },
  {
    key: 'underReviewCount',
    label: 'Under review',
    detail: 'acknowledged cases',
  },
] as const;

const evidenceKeys: Record<
  string,
  Array<{ key: string; label: string; kind?: 'money' | 'date' | 'ratio' }>
> = {
  'FR-DUP-001': [
    { key: 'duplicateCount', label: 'Matching entries' },
    { key: 'receiptWeekStart', label: 'Receipt week', kind: 'date' },
    { key: 'occurredAt', label: 'Receipt date', kind: 'date' },
  ],
  'FR-HV-001': [
    { key: 'purchaseAmountKobo', label: 'Purchase amount', kind: 'money' },
    { key: 'thresholdKobo', label: 'Review threshold', kind: 'money' },
    { key: 'occurredAt', label: 'Purchase date', kind: 'date' },
  ],
  'FR-HV-002': [
    { key: 'purchaseAmountKobo', label: 'Purchase amount', kind: 'money' },
    { key: 'thresholdKobo', label: 'Approval threshold', kind: 'money' },
    { key: 'occurredAt', label: 'Purchase date', kind: 'date' },
  ],
  'FR-HV-003': [
    { key: 'requestedAmountKobo', label: 'Requested amount', kind: 'money' },
    { key: 'thresholdKobo', label: 'Approval threshold', kind: 'money' },
    { key: 'occurredAt', label: 'Request date', kind: 'date' },
  ],
  'FR-RED-001': [
    { key: 'requestedAmountKobo', label: 'Requested amount', kind: 'money' },
    { key: 'thresholdKobo', label: 'Approval threshold', kind: 'money' },
    { key: 'occurredAt', label: 'Request date', kind: 'date' },
  ],
  'FR-CARD-001': [
    { key: 'countInLocalDay', label: 'Transactions in one day' },
    { key: 'threshold', label: 'Review threshold' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
  'FR-CASH-001': [
    { key: 'cashierCount', label: 'Cashier transactions' },
    { key: 'sampleSize', label: 'Comparison sample' },
    { key: 'cashierValueKobo', label: 'Recorded value', kind: 'money' },
    { key: 'peerMedianValueKobo', label: 'Peer median value', kind: 'money' },
    { key: 'ratioBps', label: 'Compared with peer median', kind: 'ratio' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
  'FR-ROUND-001': [
    { key: 'roundedCount', label: 'Rounded purchases' },
    { key: 'sampleSize', label: 'Purchases reviewed' },
    { key: 'unitKobo', label: 'Common rounding amount', kind: 'money' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
  'FR-REV-001': [
    { key: 'reversalCount', label: 'Reversals recorded' },
    { key: 'threshold', label: 'Review threshold' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
  'FR-REPL-001': [
    { key: 'replacementCount', label: 'Replacements recorded' },
    { key: 'threshold', label: 'Review threshold' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
  'FR-AUTH-001': [
    { key: 'failureCount', label: 'Unsuccessful attempts' },
    { key: 'threshold', label: 'Review threshold' },
    { key: 'windowStart', label: 'Period starts', kind: 'date' },
    { key: 'windowEnd', label: 'Period ends', kind: 'date' },
  ],
};

type FilterOption = { value: string; label: string };

function FilterMenu({
  id,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ?? options[0];
  const menuId = `${id}-options`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

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
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="fraud-flags__dropdown">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        className="fraud-flags__dropdown-trigger"
        aria-label={`${label}: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <span className="fraud-flags__dropdown-value">{label}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </Button>
      {open ? (
        <div
          id={menuId}
          className="supervisor-customer-directory__status-menu fraud-flags__dropdown-menu"
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

export function SupervisorFlaggedActivity() {
  const [items, setItems] = useState<FlaggedActivity[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [branchNames, setBranchNames] = useState<Record<string, string>>({});
  const requestSequenceRef = useRef(0);
  const [reviewItem, setReviewItem] = useState<FlaggedActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [decision, setDecision] = useState<FraudFlagDecision>(
    FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
  );
  const [reason, setReason] = useState('');

  const branchOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'ALL', label: 'All branches' },
      ...Object.entries(branchNames)
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: id, label: name })),
    ],
    [branchNames],
  );

  const filteredItems = useMemo(
    () =>
      filterQueueItems(
        items,
        categoryFilter,
        statusFilter,
        priorityFilter,
        branchFilter,
      ),
    [branchFilter, categoryFilter, items, priorityFilter, statusFilter],
  );
  const pageItems = filteredItems.slice(
    pageIndex * PAGE_SIZE,
    pageIndex * PAGE_SIZE + PAGE_SIZE,
  );
  const groups = useMemo(() => {
    const grouped = new Map<FraudCategory, FlaggedActivity[]>();
    for (const item of pageItems) {
      const category = getRulePresentation(item.ruleCode).category;
      grouped.set(category, [...(grouped.get(category) ?? []), item]);
    }
    return [...grouped.entries()].sort(
      ([first], [second]) => categoryOrder(first) - categoryOrder(second),
    );
  }, [pageItems]);

  useEffect(() => {
    if (pageIndex * PAGE_SIZE >= filteredItems.length) setPageIndex(0);
  }, [filteredItems.length, pageIndex]);

  function rememberBranches(nextItems: FlaggedActivity[]) {
    const discovered = Object.fromEntries(
      nextItems.flatMap((item) =>
        item.branchId && item.branchName
          ? [[item.branchId, item.branchName]]
          : [],
      ),
    );
    if (Object.keys(discovered).length > 0) {
      setBranchNames((current) => ({ ...current, ...discovered }));
    }
  }

  async function refresh(
    preserveMessage = false,
    filters: QueueFilterState = { statusFilter, priorityFilter, branchFilter },
  ) {
    const requestSequence = ++requestSequenceRef.current;
    setLoading(true);
    setNextCursor(null);
    setHasMore(false);
    try {
      const response = await fraudControllerListFraudFlagsV1(
        buildQueueQuery(filters),
        createApiRequest({ csrf: true }),
      );
      if (requestSequence !== requestSequenceRef.current) return;
      if (response.status === 200) {
        const payload = response.data.data as unknown as ListPayload;
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems);
        rememberBranches(nextItems);
        setNextCursor(payload.nextCursor ?? null);
        setHasMore(payload.hasMore === true && Boolean(payload.nextCursor));
        setSummary({
          needReviewCount: payload.summary?.needReviewCount ?? 0,
          highPriorityCount: payload.summary?.highPriorityCount ?? 0,
          underReviewCount: payload.summary?.underReviewCount ?? 0,
        });
        setPageIndex(0);
        if (!preserveMessage) setMessage('');
      } else {
        setMessage(
          `Flagged activity could not be loaded (${response.status}).`,
        );
      }
    } catch {
      if (requestSequence === requestSequenceRef.current) {
        setMessage('Flagged activity could not be loaded. Try again.');
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function goToNextPage() {
    const nextPageStart = (pageIndex + 1) * PAGE_SIZE;
    if (filteredItems.length > nextPageStart) {
      setPageIndex((current) => current + 1);
      return;
    }
    if (!hasMore || !nextCursor || loading) return;

    const requestSequence = requestSequenceRef.current;
    let cursor: string | null = nextCursor;
    let more: boolean = hasMore;
    let accumulatedItems = items;
    setLoading(true);
    try {
      while (
        more &&
        filterQueueItems(
          accumulatedItems,
          categoryFilter,
          statusFilter,
          priorityFilter,
          branchFilter,
        ).length <= nextPageStart &&
        cursor
      ) {
        const previousCursor: string = cursor;
        const response = await fraudControllerListFraudFlagsV1(
          buildQueueQuery(
            { statusFilter, priorityFilter, branchFilter },
            cursor,
          ),
          createApiRequest({ csrf: true }),
        );
        if (requestSequence !== requestSequenceRef.current) return;
        if (response.status !== 200) {
          setMessage(
            `More flagged activity could not be loaded (${response.status}).`,
          );
          return;
        }
        const payload = response.data.data as unknown as ListPayload;
        const pageItems = Array.isArray(payload.items) ? payload.items : [];
        accumulatedItems = [...accumulatedItems, ...pageItems];
        rememberBranches(pageItems);
        cursor = payload.nextCursor ?? null;
        more = payload.hasMore === true && Boolean(cursor);
        if (more && cursor === previousCursor) {
          more = false;
          setMessage(
            'More flagged activity could not be loaded. Refresh and try again.',
          );
        }
      }

      if (requestSequence !== requestSequenceRef.current) return;
      setItems(accumulatedItems);
      setNextCursor(cursor);
      setHasMore(more);
      const nextFilteredItems = filterQueueItems(
        accumulatedItems,
        categoryFilter,
        statusFilter,
        priorityFilter,
        branchFilter,
      );
      if (nextFilteredItems.length > nextPageStart) {
        setPageIndex((current) => current + 1);
      } else if (!more) {
        setMessage('No more activity matches these filters.');
      }
    } catch {
      if (requestSequence === requestSequenceRef.current) {
        setMessage('More flagged activity could not be loaded. Try again.');
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }

  async function handleDecision() {
    if (!reviewItem?.id || !reason.trim()) {
      setMessage('Enter a reason before recording this decision.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fraudControllerDecideFraudFlagV1(
        reviewItem.id,
        { decision, reason: reason.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status !== 200) {
        setMessage(
          'The decision was not recorded. Check the case and try again.',
        );
        return;
      }

      const result = response.data.data as unknown as { status?: string };
      const acceptedStatus = result.status;
      setDialogOpen(false);
      setReviewItem(null);
      setReason('');
      if (acceptedStatus === decision) {
        setItems((current) =>
          current.map((item) =>
            item.id === reviewItem.id
              ? { ...item, status: acceptedStatus }
              : item,
          ),
        );
        setMessage(
          `Case ${statusLabel(acceptedStatus).toLowerCase()}. The activity list is being refreshed.`,
        );
      } else {
        setMessage('Decision accepted. Refreshing the case status.');
      }
      await refresh(true);
    } catch {
      setMessage('The decision could not be recorded. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function closeDialog() {
    if (submitting) return;
    setDialogOpen(false);
    setReviewItem(null);
    setReason('');
  }

  async function copyTechnicalReference() {
    if (!reviewItem) return;
    if (!navigator.clipboard?.writeText) {
      setMessage(
        'Clipboard access is unavailable; select the reference text to copy.',
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `Case ${reviewItem.id} · Rule ${reviewItem.ruleCode}`,
      );
      setMessage('Technical reference copied.');
    } catch {
      setMessage(
        'Technical reference could not be copied. Select the reference text to copy.',
      );
    }
  }

  return (
    <section
      className="fraud-flags fraud-review"
      aria-label="Flagged activity workspace"
    >
      <div className="fraud-flags__control-row fraud-review__toolbar">
        <div className="fraud-flags__filters fraud-review__filters">
          <div className="fraud-flags__filter">
            <FilterMenu
              id="activity-category-filter"
              label="Category"
              value={categoryFilter}
              options={CATEGORY_OPTIONS}
              onChange={(value) => {
                setCategoryFilter(value);
                setPageIndex(0);
              }}
            />
          </div>
          <div className="fraud-flags__filter">
            <FilterMenu
              id="activity-status-filter"
              label="Review status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value);
                setPageIndex(0);
                void refresh(false, {
                  statusFilter: value,
                  priorityFilter,
                  branchFilter,
                });
              }}
            />
          </div>
          <div className="fraud-flags__filter">
            <FilterMenu
              id="activity-priority-filter"
              label="Priority"
              value={priorityFilter}
              options={PRIORITY_OPTIONS}
              onChange={(value) => {
                setPriorityFilter(value);
                setPageIndex(0);
                void refresh(false, {
                  statusFilter,
                  priorityFilter: value,
                  branchFilter,
                });
              }}
            />
          </div>
          <div className="fraud-flags__filter">
            <FilterMenu
              id="activity-branch-filter"
              label="Branch"
              value={branchFilter}
              options={branchOptions}
              onChange={(value) => {
                setBranchFilter(value);
                setPageIndex(0);
                void refresh(false, {
                  statusFilter,
                  priorityFilter,
                  branchFilter: value,
                });
              }}
            />
          </div>
        </div>
        <Button
          className="fraud-flags__refresh"
          variant="secondary"
          aria-label="Refresh flagged activity"
          title="Refresh flagged activity"
          onClick={() => void refresh()}
          loading={loading}
        >
          <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />
          <span className="fraud-flags__refresh-label">Refresh</span>
        </Button>
      </div>

      {message ? (
        <p className="fraud-flags__message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <div
        className="fraud-review__summary"
        aria-label="Branch activity summary"
      >
        {summaryItems.map(({ key, label, detail }) => (
          <div className="fraud-review__summary-item" key={key}>
            <strong>{summary[key]}</strong>
            <span className="fraud-review__summary-label">{label}</span>
            <span className="fraud-review__summary-detail">{detail}</span>
          </div>
        ))}
      </div>

      <section
        className="fraud-flags__results fraud-review__results"
        aria-label="Flagged activity results"
      >
        <header className="fraud-flags__results-header">
          <div>
            <h2>Recent activity</h2>
            <p>
              Review the context before deciding what action, if any, is needed.
            </p>
          </div>
          <span className="fraud-review__result-count">
            <span>{pageItems.length} shown</span>
            <span>
              {' · '}
              {filteredItems.length} loaded
              {hasMore ? ' · more available' : ''}
            </span>
          </span>
        </header>
        <div className="fraud-flags__table-wrap">
          <Table className="fraud-flags__table fraud-review__table">
            <thead>
              <tr>
                <th scope="col">Flagged activity</th>
                <th scope="col">Involves</th>
                <th scope="col">Priority</th>
                <th scope="col">Review status</th>
                <th scope="col">Branch</th>
                <th scope="col">Amount</th>
                <th scope="col">What ShopCity did</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            {groups.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="fraud-flags__empty">
                    {loading
                      ? 'Loading flagged activity…'
                      : items.length === 0
                        ? 'No flagged activity is available for this branch yet.'
                        : 'No activity matches these filters. Try a different category, status, priority, or branch.'}
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map(([category, records]) => (
                <tbody key={category}>
                  <tr className="fraud-review__group-heading">
                    <th colSpan={8} scope="rowgroup">
                      {CATEGORY_LABELS[category]}
                      <span>{records.length}</span>
                    </th>
                  </tr>
                  {records.map((item) => {
                    const rule = getRulePresentation(item.ruleCode);
                    const subject = involvedLabel(item);
                    const priority = priorityLabel(item.severity);
                    const currentStatus = statusLabel(item.status);
                    return (
                      <tr className="fraud-flags__row" key={item.id}>
                        <th scope="row" data-label="Flagged activity">
                          <span className="fraud-review__title">
                            {rule.title}
                          </span>
                          <span className="fraud-review__explanation">
                            {rule.explanation}
                          </span>
                        </th>
                        <td data-label="Involves">{subject}</td>
                        <td data-label="Priority">
                          <span
                            className={`fraud-review__pill fraud-review__pill--${item.severity.toLowerCase()}`}
                          >
                            {priority}
                          </span>
                        </td>
                        <td data-label="Review status">
                          <span
                            className={`fraud-review__status fraud-review__status--${item.status.toLowerCase()}`}
                          >
                            {currentStatus}
                          </span>
                        </td>
                        <td data-label="Branch">
                          {item.branchName || 'Branch unavailable'}
                        </td>
                        <td data-label="Amount">
                          {typeof item.amountKobo === 'number' ? (
                            <Money amountKobo={item.amountKobo} />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td
                          data-label="What ShopCity did"
                          className="fraud-review__action-summary"
                        >
                          {rule.action}
                        </td>
                        <td data-label="Action">
                          <Button
                            className="fraud-flags__review-button"
                            variant="secondary"
                            aria-label={`Review case: ${rule.title} for ${subject}`}
                            aria-haspopup="dialog"
                            onClick={() => {
                              setReviewItem(item);
                              setDecision(
                                FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
                              );
                              setReason('');
                              setDialogOpen(true);
                            }}
                          >
                            Review case
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))
            )}
          </Table>
        </div>
        <nav
          className="fraud-flags__pagination"
          aria-label="Flagged activity pages"
        >
          <Button
            className="fraud-flags__page-button"
            variant="secondary"
            aria-label="Previous page"
            title="Previous page"
            onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
            disabled={pageIndex === 0 || loading}
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
          </Button>
          <span>Page {pageIndex + 1}</span>
          <Button
            className="fraud-flags__page-button"
            variant="secondary"
            aria-label="Next page"
            title="Next page"
            onClick={() => void goToNextPage()}
            disabled={
              loading ||
              ((pageIndex + 1) * PAGE_SIZE >= filteredItems.length && !hasMore)
            }
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
          </Button>
        </nav>
      </section>

      <Dialog
        open={dialogOpen}
        title="Review flagged activity"
        onClose={closeDialog}
      >
        {reviewItem ? (
          <div className="fraud-review__dialog-content">
            <div className="fraud-review__dialog-heading">
              <div>
                <span className="fraud-review__eyebrow">
                  {
                    CATEGORY_LABELS[
                      getRulePresentation(reviewItem.ruleCode).category
                    ]
                  }
                </span>
                <h3>{getRulePresentation(reviewItem.ruleCode).title}</h3>
              </div>
              <div className="fraud-review__dialog-pills">
                <span
                  className={`fraud-review__pill fraud-review__pill--${reviewItem.severity.toLowerCase()}`}
                >
                  {priorityLabel(reviewItem.severity)}
                </span>
                <span
                  className={`fraud-review__status fraud-review__status--${reviewItem.status.toLowerCase()}`}
                >
                  {statusLabel(reviewItem.status)}
                </span>
              </div>
            </div>

            <section
              className="fraud-review__dialog-section"
              aria-labelledby="fraud-case-summary"
            >
              <h4 id="fraud-case-summary">Case summary</h4>
              <p>{getRulePresentation(reviewItem.ruleCode).explanation}</p>
              <div className="fraud-review__context-line">
                {peopleLabel(reviewItem) || 'Activity details unavailable'}
                {reviewItem.branchName ? (
                  <span>· {reviewItem.branchName}</span>
                ) : null}
                {reviewItem.receiptNumber ? (
                  <span>· Receipt {reviewItem.receiptNumber}</span>
                ) : null}
                {formatDate(reviewItem.evidence?.occurredAt) ? (
                  <span>· {formatDate(reviewItem.evidence?.occurredAt)}</span>
                ) : null}
              </div>
            </section>

            <section
              className="fraud-review__dialog-section"
              aria-labelledby="fraud-key-details"
            >
              <h4 id="fraud-key-details">Key details</h4>
              <dl className="fraud-review__evidence-list">
                {getEvidenceRows(reviewItem).map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              className="fraud-review__dialog-section"
              aria-labelledby="fraud-system-action"
            >
              <h4 id="fraud-system-action">What ShopCity did</h4>
              <p>{getRulePresentation(reviewItem.ruleCode).action}</p>
            </section>

            <section
              className="fraud-review__dialog-section"
              aria-labelledby="fraud-suggested-review"
            >
              <h4 id="fraud-suggested-review">Suggested review</h4>
              <p>{getRulePresentation(reviewItem.ruleCode).suggestedReview}</p>
            </section>

            <details className="fraud-review__technical-reference">
              <summary>Technical reference</summary>
              <dl>
                <div>
                  <dt>Rule code</dt>
                  <dd>{reviewItem.ruleCode}</dd>
                </div>
                <div>
                  <dt>Case identifier</dt>
                  <dd>
                    <code>{reviewItem.id}</code>
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyTechnicalReference()}
              >
                Copy technical reference
              </Button>
            </details>

            <section
              className="fraud-review__decision"
              aria-label="Record a review decision"
            >
              <RadioGroup
                name="fraud-decision"
                legend="Review decision"
                options={
                  decisionOptions as unknown as {
                    value: string;
                    label: string;
                  }[]
                }
                value={decision}
                onValueChange={(value) =>
                  setDecision(value as FraudFlagDecision)
                }
              />
              <Input
                aria-label="Decision reason"
                placeholder="Add a short reason for your decision"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="fraud-flags__decision-note">
                A reason is required to move this case to{' '}
                {decision === FraudFlagDecisionDtoDecision.RESOLVED
                  ? 'Closed'
                  : 'Under review'}
                .
              </p>
            </section>

            <div className="fraud-flags__dialog-actions">
              <Button
                variant="secondary"
                onClick={closeDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleDecision()}
                disabled={!reason.trim() || submitting}
                loading={submitting}
              >
                Record decision
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}

function getRulePresentation(ruleCode: string): RulePresentation {
  return (
    RULES[ruleCode] ?? {
      category: 'other',
      title: 'Activity needs a closer look',
      explanation:
        'ShopCity recorded an activity pattern that may benefit from review.',
      action: 'No additional system action is inferred from this flag.',
      suggestedReview:
        'Review the available transaction context and follow your store’s review process.',
    }
  );
}

function categoryOrder(category: FraudCategory) {
  return ['transactions', 'staff', 'security', 'other'].indexOf(category);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: 'Needs review',
    ACKNOWLEDGED: 'Under review',
    RESOLVED: 'Closed',
  };
  return labels[status] ?? 'Status unavailable';
}

function priorityLabel(severity: string) {
  const labels: Record<string, string> = {
    HIGH: 'High priority',
    MEDIUM: 'Needs attention',
    LOW: 'Monitor',
  };
  return labels[severity] ?? 'Priority unavailable';
}

function peopleLabel(item: FlaggedActivity) {
  const labels = [
    item.customerName ? `Customer ${item.customerName}` : null,
    item.cashierName
      ? `Cashier ${formatCashierUsername(item.cashierName)}`
      : null,
  ].filter((value): value is string => Boolean(value));
  return labels.join(' · ');
}

function involvedLabel(item: FlaggedActivity) {
  const labels = [
    peopleLabel(item),
    item.receiptNumber ? `Receipt ${item.receiptNumber}` : '',
  ].filter(Boolean);
  return labels.join(' · ') || 'Activity details unavailable';
}

function formatCashierUsername(username: string) {
  const userPart = username
    .split('@', 1)[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  if (!userPart || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(userPart)) {
    return 'Staff account';
  }
  return userPart.replace(/\b\w/g, (character) => character.toUpperCase());
}

function getEvidenceRows(
  item: FlaggedActivity,
): Array<{ label: string; value: ReactNode }> {
  const evidence = item.evidence ?? {};
  const fields = evidenceKeys[item.ruleCode] ?? [];
  const rows = fields.flatMap(({ key, label, kind }) => {
    const value = evidence[key];
    if (value === undefined || value === null || value === '') return [];
    return [{ label, value: formatEvidenceValue(value, kind) }];
  });
  if (
    item.amountKobo !== null &&
    item.amountKobo !== undefined &&
    !rows.some((row) => row.label.includes('amount'))
  ) {
    rows.unshift({
      label: 'Recorded amount',
      value: <Money amountKobo={item.amountKobo} />,
    });
  }
  if (item.occurrenceCount && item.occurrenceCount > 1) {
    rows.push({
      label: 'Times detected',
      value: item.occurrenceCount.toLocaleString(),
    });
  }
  if (rows.length === 0 && item.firstDetectedAt) {
    rows.push({
      label: 'First detected',
      value: formatDate(item.firstDetectedAt) ?? 'Date unavailable',
    });
  }
  return rows;
}

function formatEvidenceValue(
  value: unknown,
  kind?: 'money' | 'date' | 'ratio',
): ReactNode {
  if (kind === 'money') {
    const amount = safeNumber(value);
    return amount === null ? (
      'Amount unavailable'
    ) : (
      <Money amountKobo={amount} />
    );
  }
  if (kind === 'date') return formatDate(value) ?? 'Date unavailable';
  if (kind === 'ratio') {
    const ratio = safeNumber(value);
    return ratio === null
      ? 'Value unavailable'
      : `${(ratio / 100).toFixed(1)}%`;
  }
  if (typeof value === 'number' && Number.isFinite(value))
    return value.toLocaleString();
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number)
      ? number.toLocaleString()
      : 'Value unavailable';
  }
  return 'Value unavailable';
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(date);
}
