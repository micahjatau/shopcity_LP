'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import {
  cardsControllerCreateCardV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Dialog, Input } from '../ui';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';

type Customer = Record<string, unknown> & { id?: string };

function responseData<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } }).data?.data;
}

export function SupervisorCardAssignment({
  customerId,
  initialQuery,
  onCustomerId,
}: Readonly<{
  customerId: string | null;
  initialQuery: string;
  onCustomerId: (id: string | null) => void;
}>) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serial, setSerial] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState(
    'Search by customer name, phone number, or ID.',
  );
  const [detailMessage, setDetailMessage] = useState(
    customerId
      ? 'Loading customer details…'
      : 'Select a customer before assigning a card.',
  );
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(Boolean(customerId));
  const assignmentKey = useRef<{
    customerId: string;
    serialNumber: string;
    key: string;
  } | null>(null);
  const sequence = useRef(0);

  const reloadCustomer = useCallback(async (id: string) => {
    const request = ++sequence.current;
    setLoading(true);
    setCustomer(null);
    setDetailMessage('Loading customer details…');
    try {
      const response = await customersControllerGetCustomerV1(
        id,
        createApiRequest(),
      );
      if (request !== sequence.current) return null;
      const data =
        response.status === 200 ? responseData<Customer>(response) : undefined;
      if (!data || data.id !== id) {
        setDetailMessage(
          `Customer details could not be verified (${response.status}). Assignment is unavailable.`,
        );
        return null;
      }
      setCustomer(data);
      setDetailMessage('');
      return data;
    } catch {
      if (request === sequence.current) {
        setDetailMessage(
          'Customer details could not be loaded. Try selecting the customer again.',
        );
      }
      return null;
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSerial('');
    setReviewing(false);
    setAssignmentMessage('');
    if (customerId) {
      setDialogOpen(true);
      void reloadCustomer(customerId);
    } else {
      sequence.current += 1;
      setCustomer(null);
      setDialogOpen(false);
      setReviewing(false);
      setDetailMessage('Select a customer before assigning a card.');
    }
  }, [customerId, reloadCustomer]);

  function closeDialog() {
    if (busy) return;
    setDialogOpen(false);
    setReviewing(false);
    setSerial('');
    setAssignmentMessage('');
    onCustomerId(null);
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearchMessage('Enter a name, phone number, or customer ID to search.');
      return;
    }
    setSearchMessage('Searching customers…');
    try {
      const response = await customersControllerListCustomersV1(
        { q: term, limit: '50', cursor: '' },
        createApiRequest(),
      );
      if (response.status !== 200) {
        setResults([]);
        setSearchMessage(
          `Customer search unavailable (${response.status}). Try again.`,
        );
        return;
      }
      const data = responseData<{ items?: Customer[] }>(response);
      const items = Array.isArray(data?.items) ? data.items : [];
      setResults(items);
      setSearchMessage(
        items.length
          ? `${items.length} customer${items.length === 1 ? '' : 's'} found. Select one to check assignment eligibility.`
          : 'No customers found.',
      );
    } catch {
      setResults([]);
      setSearchMessage('Customer search could not be completed. Try again.');
    }
  }

  const hasActiveCard = customer?.activeCardStatus === 'ACTIVE';
  const knownCardStatus =
    customer?.activeCardStatus === 'ACTIVE' ||
    customer?.activeCardStatus === 'BLOCKED' ||
    customer?.activeCardStatus === 'REPLACED';
  const eligible =
    customer?.status === 'ACTIVE' && knownCardStatus && !hasActiveCard;

  async function submitAssignment() {
    if (!customer?.id || !eligible || !serial.trim()) return;
    const serialNumber = serial.trim();
    const canonicalSerialNumber = serialNumber.toUpperCase();
    if (
      assignmentKey.current?.customerId !== customer.id ||
      assignmentKey.current.serialNumber !== canonicalSerialNumber
    ) {
      assignmentKey.current = {
        customerId: customer.id,
        serialNumber: canonicalSerialNumber,
        key: crypto.randomUUID(),
      };
    }
    const idempotencyKey = assignmentKey.current.key;
    setBusy(true);
    setAssignmentMessage('Assigning card…');
    try {
      const response = await cardsControllerCreateCardV1(
        { customerId: customer.id, serialNumber },
        createApiRequest({ csrf: true, idempotencyKey }),
      );
      if (response.status === 201) {
        assignmentKey.current = null;
        setReviewing(false);
        setSerial('');
        setAssignmentMessage('Card assigned successfully.');
        await reloadCustomer(customer.id);
      } else {
        setReviewing(false);
        setAssignmentMessage(
          response.status === 409
            ? 'This card serial is already assigned. Enter a different serial.'
            : response.status === 400
              ? 'Assignment was rejected because customer eligibility changed. Check the updated eligibility before retrying.'
              : `Card assignment was not completed (${response.status}). Check current customer eligibility before retrying.`,
        );
        await reloadCustomer(customer.id);
      }
    } catch {
      setReviewing(false);
      setAssignmentMessage(
        'Assignment outcome could not be confirmed. Verify the current assignment and customer status before retrying.',
      );
      await reloadCustomer(customer.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="sc-assignment-workspace"
      aria-label="Assign card to an existing customer"
    >
      <div className="sc-card sc-card--standard sc-assignment-search">
        <h2 className="supervisor-page__section-title">
          Find an existing customer
        </h2>
        <form
          className="sc-assignment-search__form"
          onSubmit={(event) => void search(event)}
        >
          <label
            className="sc-assignment-search__query"
            htmlFor="supervisor-card-customer-search"
          >
            Name, phone number, or customer ID
            <Input
              id="supervisor-card-customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button type="submit">Search customers</Button>
        </form>
        <p
          role="status"
          aria-live="polite"
          className="sc-assignment-search__message"
        >
          {searchMessage}
        </p>
        {results.length ? (
          <ul
            className="sc-assignment-search__results"
            aria-label="Customer search results"
          >
            {results.map((result, index) => {
              const id = typeof result.id === 'string' ? result.id : '';
              const name = String(result.fullName ?? 'Customer');
              return (
                <li key={id || `${name}-${index}`}>
                  <button
                    type="button"
                    disabled={!id || loading || busy}
                    aria-pressed={customerId === id}
                    onClick={() => {
                      if (customer?.id === id) {
                        setDialogOpen(true);
                        return;
                      }
                      setDialogOpen(true);
                      setCustomer(null);
                      setDetailMessage('Loading customer details…');
                      setSerial('');
                      setReviewing(false);
                      setAssignmentMessage('');
                      onCustomerId(id);
                    }}
                    className="sc-assignment-search__result"
                  >
                    <span className="sc-assignment-search__result-identity">
                      <span className="sc-assignment-search__result-name">
                        {name}
                      </span>
                      <span className="sc-assignment-search__result-phone">
                        {String(result.phoneE164 ?? 'Phone unavailable')}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="sc-assignment-search__result-arrow"
                    >
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        title="Assignment eligibility"
        onClose={closeDialog}
      >
        <div className="sc-assignment-dialog">
          <button
            type="button"
            className="sc-assignment-dialog__close"
            aria-label="Close assignment dialog"
            disabled={busy}
            onClick={closeDialog}
          >
            ×
          </button>
          {detailMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="sc-assignment-dialog__message"
            >
              {detailMessage}
            </p>
          ) : null}
          {loading ? (
            <p className="sc-assignment-dialog__loading" aria-hidden="true">
              Verifying customer and card status…
            </p>
          ) : null}
          {!loading && !customer && customerId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void reloadCustomer(customerId)}
            >
              Retry customer details
            </Button>
          ) : null}
          {customer ? (
            <>
              <header className="sc-assignment-dialog__identity">
                <h2>{String(customer.fullName ?? 'Customer')}</h2>
                <p>{String(customer.phoneE164 ?? 'Phone unavailable')}</p>
              </header>
              <dl className="sc-assignment-dialog__fields">
                <div>
                  <dt>Customer status</dt>
                  <dd>
                    <SupervisorCustomerStatusBadge
                      status={customer.status}
                      fallback="Status unavailable"
                    />
                  </dd>
                </div>
                <div>
                  <dt>Current card status</dt>
                  <dd>
                    <SupervisorCustomerStatusBadge
                      status={customer.activeCardStatus}
                      fallback="Card status unavailable"
                    />
                  </dd>
                </div>
              </dl>
              <section
                className={`sc-assignment-dialog__eligibility${eligible ? ' sc-assignment-dialog__eligibility--eligible' : ''}`}
                aria-live="polite"
              >
                <h3>
                  {eligible
                    ? 'Eligible for assignment'
                    : 'Assignment unavailable'}
                </h3>
                {hasActiveCard ? (
                  <p>
                    This customer already has an active card.{' '}
                    <Link
                      href={`/supervisor/cards?tab=manage&id=${encodeURIComponent(customer.id!)}`}
                    >
                      Manage cards
                    </Link>
                  </p>
                ) : null}
                {customer.status !== 'ACTIVE' ? (
                  <p>
                    Assignment is unavailable because this customer is not
                    active.
                  </p>
                ) : null}
                {customer.status === 'ACTIVE' && !knownCardStatus ? (
                  <p>
                    Card eligibility could not be verified. Assignment is
                    unavailable.
                  </p>
                ) : null}
                {eligible ? (
                  <p>Enter a new physical card serial to continue.</p>
                ) : null}
              </section>
              {eligible ? (
                !reviewing ? (
                  <form
                    className="sc-assignment-dialog__form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (serial.trim()) setReviewing(true);
                      else
                        setAssignmentMessage(
                          'Enter a new card serial before review.',
                        );
                    }}
                  >
                    <label htmlFor="supervisor-assignment-serial">
                      New card serial
                      <Input
                        id="supervisor-assignment-serial"
                        required
                        value={serial}
                        onChange={(event) => {
                          setSerial(event.target.value);
                          setAssignmentMessage('');
                        }}
                      />
                    </label>
                    <Button type="submit" disabled={busy}>
                      Review assignment
                    </Button>
                  </form>
                ) : (
                  <section
                    className="sc-assignment-dialog__review"
                    aria-labelledby="assignment-review-heading"
                  >
                    <h3 id="assignment-review-heading">
                      Review card assignment
                    </h3>
                    <dl>
                      <div>
                        <dt>Customer</dt>
                        <dd>{String(customer.fullName ?? '—')}</dd>
                      </div>
                      <div>
                        <dt>New card serial</dt>
                        <dd>{serial.trim()}</dd>
                      </div>
                    </dl>
                    <div className="sc-assignment-dialog__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setReviewing(false)}
                      >
                        Back to details
                      </Button>
                      <Button
                        type="button"
                        loading={busy}
                        disabled={busy}
                        onClick={() => void submitAssignment()}
                      >
                        Assign card
                      </Button>
                    </div>
                  </section>
                )
              ) : null}
            </>
          ) : null}
          {assignmentMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="sc-assignment-dialog__message"
            >
              {assignmentMessage}
            </p>
          ) : null}
        </div>
      </Dialog>
    </section>
  );
}
