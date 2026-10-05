'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
  type ApprovalDecisionDtoDecision,
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
  reasonCode?: string;
  ruleCode?: string;
  branchId?: string;
  receipt?: {
    posReceiptNumber?: string;
    purchaseAmountKobo?: number;
    [key: string]: unknown;
  } | null;
  referenceNumber?: string;
  receiptNumber?: string;
  posReceiptNumber?: string;
  requestedAmountKobo?: number;
  amountKobo?: number;
  requestedAt?: string;
  decidedAt?: string | null;
  executedAt?: string | null;
};

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

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

export function ApprovalsPanel() {
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

  cursorHistoryRef.current = cursorHistory;

  const filteredItems = useMemo(() => {
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
  }, [items, searchTerm]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const isPending = selectedItem?.status === 'PENDING';
  const decisionReason = [reason, note.trim()].filter(Boolean).join(' — ');
  const resultsTitle = {
    ALL: 'All approvals',
    PENDING: 'Transactions awaiting approval',
    APPROVED: 'Approved transactions',
    REJECTED: 'Rejected transactions',
    EXPIRED: 'Expired approvals',
  }[statusFilter];

  const refresh = useCallback(
    async (cursorOverride = '') => {
      setLoading(true);
      try {
        const response = await approvalsControllerListApprovalsV1(
          {
            limit: String(limit),
            cursor: cursorOverride,
            status: statusFilter,
          },
          createApiRequest({ csrf: true }),
        );
        if (response.status === 200) {
          const nextItems = response.data.data.items as ApprovalRecord[];
          setItems(nextItems);
          setNextCursor(response.data.data.nextCursor ?? null);
          setSelectedId((current) =>
            nextItems.some((item) => item.id === current) ? current : null,
          );
          setMessage('');
        } else {
          setMessage(`Approvals unavailable (${response.status}).`);
        }
      } catch {
        setMessage('Approvals unavailable. Try refreshing the queue.');
      } finally {
        setLoading(false);
      }
    },
    [limit, statusFilter],
  );

  useEffect(() => {
    setCursorHistory(['']);
    setSelectedId(null);
    void refresh('');
  }, [limit, statusFilter, refresh]);

  function refreshFromFirstPage() {
    setCursorHistory(['']);
    setSelectedId(null);
    void refresh('');
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;
    const cursor = nextCursor;
    setCursorHistory((current) => [...current, cursor]);
    await refresh(cursor);
  }

  async function goToPreviousPage() {
    if (cursorHistory.length <= 1 || loading) return;
    const history = cursorHistory.slice(0, -1);
    setCursorHistory(history);
    await refresh(history[history.length - 1] ?? '');
  }

  async function handleDecision() {
    if (!selectedId || !isPending || !reason || submitting) return;
    const approvalId = selectedId;
    setSubmitting(true);
    try {
      const response = await approvalsControllerDecideApprovalV1(
        approvalId,
        { decision, reason: decisionReason },
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
      setSelectedId(null);
      setReason('');
      setNote('');
      setMessage(`Decision submitted for approval ${approvalId}.`);
      setCursorHistory(['']);
      await refresh('');
      setMessage(`Decision submitted for approval ${approvalId}.`);
    } catch {
      setMessage(
        'Decision could not be confirmed. Refresh the queue before retrying.',
      );
    } finally {
      setSubmitting(false);
    }
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

function customerLabel(item: ApprovalRecord) {
  return (
    item.customer?.fullName ??
    (item.customer?.id ? `Customer ${item.customer.id.slice(0, 8)}` : null) ??
    (item.customerId ? `Customer ${item.customerId.slice(0, 8)}` : 'Customer')
  );
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
