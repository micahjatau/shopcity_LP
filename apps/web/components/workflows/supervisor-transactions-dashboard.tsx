'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  loyaltyControllerGetTransactionV1,
  loyaltyControllerSearchTransactionsByReceiptV1,
  reversalsControllerReverseV1,
  type LoyaltyControllerGetTransactionV1200Data,
  type LoyaltyControllerSearchTransactionsByReceiptV1200DataItemsItem,
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
type DetailRecord = LoyaltyControllerGetTransactionV1200Data;
type ListState = 'idle' | 'loading' | 'loaded' | 'error';
type DetailState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'loaded'; record: DetailRecord };
type CursorStack = Array<string | undefined>;

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

function statusTone(
  status: string,
): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (status.trim().toUpperCase()) {
    case 'CONFIRMED':
    case 'POSTED':
    case 'COMPLETED':
      return 'success';
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

export function SupervisorTransactionsDashboard() {
  const [query, setQuery] = useState('');
  const [searchedReceipt, setSearchedReceipt] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [listState, setListState] = useState<ListState>('idle');
  const [message, setMessage] = useState(
    'Search by receipt number to review branch transactions.',
  );
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
  const detailGeneration = useRef(0);
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const reversalKeyRef = useRef<{
    transactionId: string;
    reason: string;
    key: string;
  } | null>(null);

  useDialogLifecycle(Boolean(selected), closeDetail, modalRef);

  async function loadReceiptResults(
    receiptNumber: string,
    cursor?: string,
    preserveItems = false,
  ) {
    const generation = searchGeneration.current + 1;
    searchGeneration.current = generation;
    const normalizedReceiptNumber = receiptNumber.trim();
    if (!normalizedReceiptNumber) {
      setSearching(false);
      setItems([]);
      setListState('idle');
      setHasMore(false);
      setNextCursor(null);
      setMessage('Enter a receipt number to search transactions.');
      return;
    }

    setSearching(true);
    setListState('loading');
    if (!preserveItems) {
      setItems([]);
      setHasMore(false);
      setNextCursor(null);
    }
    setMessage(`Searching for receipt ${normalizedReceiptNumber}…`);

    try {
      const response = await loyaltyControllerSearchTransactionsByReceiptV1(
        { receiptNumber: normalizedReceiptNumber, limit: 10, cursor },
        createApiRequest({ csrf: true }),
      );
      if (searchGeneration.current !== generation) return;
      if (response.status !== 200)
        throw new Error('receipt search unavailable');

      const result = response.data.data;
      setItems(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setListState('loaded');
      setMessage(
        `${result.items.length} transaction${result.items.length === 1 ? '' : 's'} found for receipt ${normalizedReceiptNumber}.`,
      );
    } catch {
      if (searchGeneration.current !== generation) return;
      if (!preserveItems) {
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
      }
      setListState('error');
      setMessage(
        'The branch-scoped receipt search is temporarily unavailable.',
      );
    } finally {
      if (searchGeneration.current === generation) setSearching(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const receiptNumber = query.trim();
    setSearchedReceipt(receiptNumber);
    setCursorStack([undefined]);
    setPageIndex(0);
    void loadReceiptResults(receiptNumber);
  }

  function loadNextPage() {
    if (!hasMore || !nextCursor || !searchedReceipt || searching) return;
    const cursor = nextCursor;
    setCursorStack((current) => [...current.slice(0, pageIndex + 1), cursor]);
    setPageIndex((current) => current + 1);
    void loadReceiptResults(searchedReceipt, cursor);
  }

  function loadPreviousPage() {
    if (pageIndex <= 0 || searching) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    void loadReceiptResults(searchedReceipt, cursorStack[previousIndex]);
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
      setReversalMessage('Reversal confirmed by the transaction service.');
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

  return (
    <section
      className="supervisor-page transaction-dashboard"
      data-od-id="transactions-view"
      aria-labelledby="supervisor-transactions-title"
    >
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        dataOdId="transactions-heading"
        title={<span id="supervisor-transactions-title">Transactions</span>}
        description="Search by receipt number to review transaction details."
      />

      <form
        className="supervisor-transaction-search"
        data-od-id="transaction-filters"
        role="search"
        onSubmit={search}
      >
        <Input
          aria-label="Receipt number"
          autoComplete="off"
          required
          placeholder="Enter receipt number"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" loading={searching}>
          Search
        </Button>
      </form>

      <p className="cashier-workflow-notice" role="status" aria-live="polite">
        {message}
      </p>

      <ShopCityCard
        as="section"
        variant="table"
        className="transaction-table-card"
        data-od-id="transactions-table"
        aria-label="Supervisor receipt search results"
      >
        <Table>
          <thead>
            <tr>
              <th>Receipt no.</th>
              <th>Operation</th>
              <th>Amount</th>
              <th>Date &amp; time</th>
              <th>Status</th>
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
                  <td>{item.receiptNumber}</td>
                  <td>{item.operation}</td>
                  <td>
                    <Money amountKobo={Math.abs(item.amountKobo)} />
                  </td>
                  <td>{formatDate(item.occurredAt)}</td>
                  <td>
                    <StatusBadge
                      label={statusLabel(item.status)}
                      tone={statusTone(item.status)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div
                    className="transaction-empty-state"
                    role={listState === 'error' ? 'alert' : 'status'}
                  >
                    <strong>
                      {listState === 'loading'
                        ? 'Searching transactions'
                        : listState === 'error'
                          ? 'Transactions unavailable'
                          : listState === 'loaded'
                            ? 'No transactions found'
                            : 'Search for a receipt'}
                    </strong>
                    <p>
                      {listState === 'loading'
                        ? 'Looking for transactions with this receipt number.'
                        : listState === 'error'
                          ? 'The branch-scoped receipt search could not be completed.'
                          : listState === 'loaded'
                            ? 'No matching transactions were found for this receipt number.'
                            : 'Enter the receipt number to load matching branch transactions.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        <footer className="transaction-table-footer">
          <p className="cashier-workflow-hint">
            {searchedReceipt
              ? `Receipt ${searchedReceipt} · page ${currentPage}`
              : 'Results are limited to the authenticated branch.'}
          </p>
          <div
            className="transaction-pagination"
            aria-label="Transaction pages"
          >
            <Button
              type="button"
              variant="ghost"
              size="compact"
              disabled={pageIndex === 0 || searching}
              onClick={loadPreviousPage}
            >
              Previous
            </Button>
            <span aria-live="polite">Page {currentPage}</span>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              disabled={!hasMore || searching}
              onClick={loadNextPage}
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
            aria-labelledby="supervisor-transaction-detail-title"
          >
            <div className="transaction-detail-modal__head">
              <div>
                <p className="section-label">Transaction detail</p>
                <h2 id="supervisor-transaction-detail-title">
                  {selected.receiptNumber}
                </h2>
                <p className="transaction-detail-modal__note">
                  Detail and reversal eligibility are checked by the transaction
                  service.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                aria-label="Close transaction detail"
                disabled={submittingReversal}
                onClick={closeDetail}
              >
                Close
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
              <div className="transaction-detail-columns">
                <dl className="transaction-detail-list">
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
                    <dd>{statusLabel(detailState.record.state)}</dd>
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
                    <dt>Effective at</dt>
                    <dd>{formatDate(detailState.record.occurredAt)}</dd>
                  </div>
                </dl>

                <div className="transaction-detail-context">
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
