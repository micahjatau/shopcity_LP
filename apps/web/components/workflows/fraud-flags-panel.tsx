'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
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
import { Alert, Button, Dialog, Input, RadioGroup, Select, Table } from '../ui';
import { Money } from '../shopcity';
import { SupervisorFlaggedActivity } from './supervisor-flagged-activity';

type FraudFlagRecord = Record<string, unknown> & {
  id?: string;
  status?: string;
  severity?: string;
  ruleCode?: string;
  reasonCode?: string;
  branchId?: string | null;
  actorId?: string | null;
  customer?: { fullName?: string };
  receipt?: { id?: string };
  amountKobo?: number;
};

const decisionOptions = [
  { value: FraudFlagDecisionDtoDecision.ACKNOWLEDGED, label: 'Acknowledge' },
  { value: FraudFlagDecisionDtoDecision.RESOLVED, label: 'Resolve' },
] as const;

const FRAUD_PAGE_SIZE = 5;
const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];
const SEVERITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All severities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

type FraudFilterOption = { value: string; label: string };

function FraudFilterDropdown({
  id,
  label,
  triggerLabel,
  value,
  options,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  triggerLabel: string;
  value: string;
  options: readonly FraudFilterOption[];
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
  const selectedOption = options[selectedIndex];
  const menuId = `${id}-options`;

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
        <span className="fraud-flags__dropdown-value">{triggerLabel}</span>
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

export function FraudFlagsPanel({
  presentation = 'default',
}: Readonly<{ presentation?: 'default' | 'supervisor' }> = {}) {
  return presentation === 'supervisor' ? (
    <SupervisorFlaggedActivity />
  ) : (
    <LegacyFraudFlagsPanel />
  );
}

function LegacyFraudFlagsPanel() {
  const [items, setItems] = useState<FraudFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<FraudFlagRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [decision, setDecision] = useState<FraudFlagDecision>(
    FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
  );
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter)
          return false;
        if (severityFilter !== 'ALL' && item.severity !== severityFilter)
          return false;
        if (
          branchFilter.trim() &&
          !(item.branchId ?? 'Tenant-wide')
            .toLowerCase()
            .includes(branchFilter.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [branchFilter, items, severityFilter, statusFilter],
  );
  const pageItems = filteredItems.slice(
    pageIndex * FRAUD_PAGE_SIZE,
    pageIndex * FRAUD_PAGE_SIZE + FRAUD_PAGE_SIZE,
  );
  const refreshLabel = 'Refresh fraud flags';

  useEffect(() => {
    if (pageIndex * FRAUD_PAGE_SIZE >= filteredItems.length) {
      setPageIndex(0);
    }
  }, [filteredItems.length, pageIndex]);

  async function refresh(preserveReview = false) {
    setLoading(true);
    try {
      const response = await fraudControllerListFraudFlagsV1(
        { limit: '25', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data.items as FraudFlagRecord[];
        setItems(nextItems);
        setSelectedId((current) =>
          preserveReview && nextItems.some((item) => item.id === current)
            ? current
            : null,
        );
        setPageIndex(0);
        if (!preserveReview) {
          setResponseData(null);
          setMessage('');
        }
      } else {
        setMessage(`Fraud flags unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Fraud flags unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleDecision() {
    if (!reviewItem?.id || !reason.trim()) {
      setMessage('Enter an explicit decision reason before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fraudControllerDecideFraudFlagV1(
        reviewItem.id,
        {
          decision,
          reason: reason.trim(),
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setResponseData(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(`Decision sent for ${reviewItem.id}.`);
      void refresh(true);
    } catch {
      setMessage('Fraud decision could not be submitted. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function closeReviewDialog() {
    if (submitting) return;
    setDialogOpen(false);
    setReviewItem(null);
    setResponseData(null);
  }

  return (
    <section className="fraud-flags" aria-label="Fraud workspace">
      <div className="fraud-flags__control-row">
        <div className="fraud-flags__filters">
          <label className="fraud-flags__filter" htmlFor="fraud-status-filter">
            <span>Status</span>
            <Select
              id="fraud-status-filter"
              aria-label="Fraud status filter"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(event) => {
                setPageIndex(0);
                setStatusFilter(event.target.value);
              }}
            />
          </label>
          <label
            className="fraud-flags__filter"
            htmlFor="fraud-severity-filter"
          >
            <span>Severity</span>
            <Select
              id="fraud-severity-filter"
              aria-label="Fraud severity filter"
              value={severityFilter}
              options={SEVERITY_FILTER_OPTIONS}
              onChange={(event) => {
                setPageIndex(0);
                setSeverityFilter(event.target.value);
              }}
            />
          </label>
          <label className="fraud-flags__filter" htmlFor="fraud-branch-filter">
            <span>Branch</span>
            <Input
              className="fraud-flags__branch-input"
              id="fraud-branch-filter"
              aria-label="Fraud branch filter"
              placeholder="Any branch"
              value={branchFilter}
              onChange={(event) => {
                setPageIndex(0);
                setBranchFilter(event.target.value);
              }}
            />
          </label>
        </div>
        <Button
          className="fraud-flags__refresh"
          variant="secondary"
          aria-label={refreshLabel}
          title={refreshLabel}
          onClick={() => void refresh()}
          loading={loading}
        >
          <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />
          <span className="fraud-flags__refresh-label">{refreshLabel}</span>
        </Button>
      </div>

      {message ? (
        <p className="fraud-flags__message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <div className="fraud-flags__content">
        <section className="fraud-flags__results" aria-label="Fraud flag list">
          <header className="fraud-flags__results-header">
            <h2>Fraud review results</h2>
            <p>
              {filteredItems.length} result
              {filteredItems.length === 1 ? '' : 's'}
            </p>
          </header>
          <div className="fraud-flags__table-wrap">
            <Table className="fraud-flags__table">
              <thead>
                <tr>
                  <th scope="col">Rule</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Branch</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="fraud-flags__empty">
                      {loading
                        ? 'Loading fraud flags…'
                        : 'No fraud flags match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => {
                    const rule =
                      item.ruleCode ??
                      item.reasonCode ??
                      item.id ??
                      'Fraud flag';
                    const subject =
                      item.customer?.fullName ??
                      item.actorId ??
                      'Unknown subject';
                    const selected = item.id === selectedId;
                    return (
                      <tr
                        key={item.id ?? `${rule}-${subject}`}
                        className={`fraud-flags__row${selected ? ' fraud-flags__row--selected' : ''}`}
                      >
                        <th scope="row" data-label="Rule">
                          {rule}
                        </th>
                        <td data-label="Subject">{subject}</td>
                        <td data-label="Severity">{item.severity ?? 'LOW'}</td>
                        <td data-label="Status">{item.status ?? 'Unknown'}</td>
                        <td data-label="Branch">
                          {item.branchId ?? 'Tenant-wide'}
                        </td>
                        <td data-label="Amount">
                          {typeof item.amountKobo === 'number' ? (
                            <Money amountKobo={item.amountKobo} />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td data-label="Action">
                          <Button
                            className="fraud-flags__review-button"
                            variant="secondary"
                            aria-label={`Review case: ${rule} for ${subject}`}
                            aria-haspopup="dialog"
                            aria-pressed={selected}
                            onClick={() => {
                              setSelectedId(item.id ?? null);
                              setReviewItem(item);
                              setDecision(
                                FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
                              );
                              setReason('');
                              setResponseData(null);
                              setDialogOpen(true);
                            }}
                          >
                            Review case
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
          <nav
            className="fraud-flags__pagination"
            aria-label="Fraud result pages"
          >
            <Button
              className="fraud-flags__page-button"
              variant="secondary"
              aria-label="Previous page"
              title="Previous page"
              onClick={() =>
                setPageIndex((current) => Math.max(current - 1, 0))
              }
              disabled={pageIndex === 0}
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
            <span>Page {pageIndex + 1}</span>
            <Button
              className="fraud-flags__page-button"
              variant="secondary"
              aria-label="Next page"
              title="Next page"
              onClick={() =>
                setPageIndex((current) =>
                  (current + 1) * FRAUD_PAGE_SIZE >= filteredItems.length
                    ? current
                    : current + 1,
                )
              }
              disabled={
                (pageIndex + 1) * FRAUD_PAGE_SIZE >= filteredItems.length
              }
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </nav>
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        title="Review fraud case"
        onClose={closeReviewDialog}
      >
        {reviewItem ? (
          <div className="fraud-flags__dialog-content">
            <section aria-label="Selected fraud case details">
              <Alert tone="info" title="Selected fraud flag">
                {describeFraudItem(reviewItem)}
              </Alert>
              <div className="fraud-flags__details-wrap">
                <Table>
                  <tbody>
                    {Object.entries(reviewItem)
                      .filter(([key]) =>
                        [
                          'id',
                          'status',
                          'severity',
                          'ruleCode',
                          'reasonCode',
                          'branchId',
                          'actorId',
                          'customer',
                          'receipt',
                          'amountKobo',
                        ].includes(key),
                      )
                      .slice(0, 10)
                      .map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{describeValue(value)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            </section>

            <section aria-label="Fraud decision">
              <RadioGroup
                name="fraud-decision"
                legend="Decision"
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
                aria-label="Fraud decision reason"
                placeholder="Reason for your decision"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="fraud-flags__decision-note">
                A reason is required before submitting this{' '}
                {decision === FraudFlagDecisionDtoDecision.RESOLVED
                  ? 'resolution'
                  : 'acknowledgment'}
                .
              </p>
            </section>

            {responseData ? (
              <section className="fraud-flags__decision-response">
                <Alert tone="success" title="Backend response">
                  The backend returned a fraud decision result.
                </Alert>
                <Table>
                  <tbody>
                    {Object.entries(responseData)
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{describeValue(value)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </section>
            ) : null}

            <div className="fraud-flags__dialog-actions">
              <Button
                variant="secondary"
                onClick={closeReviewDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleDecision()}
                disabled={!reason.trim() || submitting}
                loading={submitting}
              >
                Submit decision
              </Button>
            </div>
          </div>
        ) : (
          <Alert tone="info" title="No case selected">
            Select a fraud case from the results to review it.
          </Alert>
        )}
      </Dialog>
    </section>
  );
}

function describeFraudItem(item: FraudFlagRecord) {
  const subject =
    item.customer?.fullName ?? item.actorId ?? item.ruleCode ?? 'Fraud flag';
  return `${subject} · ${item.severity ?? 'LOW'} · ${item.status ?? 'UNKNOWN'}`;
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.fullName || record.id) {
      return String(record.fullName ?? record.id);
    }
    return JSON.stringify(record);
  }
  return String(value);
}
