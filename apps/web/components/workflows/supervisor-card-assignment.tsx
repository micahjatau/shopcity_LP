'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  cardsControllerCreateCardV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input } from '../ui';

type Customer = Record<string, unknown> & {
  id?: string;
  fullName?: string;
  phoneE164?: string;
  status?: string;
  activeCardStatus?: string;
};

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
    'Select a customer before assigning a card.',
  );
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [busy, setBusy] = useState(false);
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
      setDetailMessage('Customer details loaded.');
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
      void reloadCustomer(customerId);
    } else {
      sequence.current += 1;
      setCustomer(null);
      setReviewing(false);
      setDetailMessage('Select a customer before assigning a card.');
    }
  }, [customerId, reloadCustomer]);

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
              ? 'Assignment was rejected because customer eligibility changed. Customer details were refreshed.'
              : `Card assignment was not completed (${response.status}). Customer details were refreshed before retrying.`,
        );
        await reloadCustomer(customer.id);
      }
    } catch {
      setReviewing(false);
      setAssignmentMessage(
        'Assignment outcome could not be confirmed. Customer details were refreshed; verify the result before retrying.',
      );
      await reloadCustomer(customer.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]"
      aria-label="Assign card to an existing customer"
    >
      <div className="sc-card sc-card--standard min-w-0 p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Find an existing customer
        </h2>
        <form className="grid gap-3" onSubmit={(event) => void search(event)}>
          <label
            className="grid gap-1"
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
        <p role="status" aria-live="polite" className="mt-3 text-sm">
          {searchMessage}
        </p>
        {results.length ? (
          <ul className="mt-3 grid gap-2" aria-label="Customer search results">
            {results.map((result, index) => {
              const id = typeof result.id === 'string' ? result.id : '';
              const name = String(result.fullName ?? 'Customer');
              return (
                <li key={id || `${name}-${index}`}>
                  <button
                    type="button"
                    disabled={!id || loading || busy}
                    onClick={() => {
                      setCustomer(null);
                      setDetailMessage('Loading customer details…');
                      setSerial('');
                      setReviewing(false);
                      setAssignmentMessage('');
                      onCustomerId(id);
                    }}
                    className="w-full rounded border p-3 text-left focus-visible:outline focus-visible:outline-2"
                  >
                    <span className="block font-medium">{name}</span>
                    <span className="text-sm">
                      {String(result.phoneE164 ?? 'Phone unavailable')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div
        className="sc-card sc-card--standard min-w-0 p-5"
        aria-labelledby="assignment-customer-heading"
      >
        <h2
          id="assignment-customer-heading"
          className="mb-4 text-lg font-semibold"
        >
          Assignment eligibility
        </h2>
        <p role="status" aria-live="polite" className="mb-3 text-sm">
          {detailMessage}
        </p>
        {loading ? <p>Loading customer details…</p> : null}
        {customer ? (
          <>
            <dl className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium">Customer</dt>
                <dd className="break-words">
                  {String(customer.fullName ?? '—')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Phone number</dt>
                <dd className="break-words">
                  {String(customer.phoneE164 ?? '—')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Customer status</dt>
                <dd>{String(customer.status ?? 'Unavailable')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Current card status</dt>
                <dd>{String(customer.activeCardStatus ?? 'Unavailable')}</dd>
              </div>
            </dl>
            {hasActiveCard ? (
              <p className="mb-4" role="status">
                This customer already has an active card.{' '}
                <a
                  className="underline"
                  href={`/supervisor/cards?tab=manage&id=${encodeURIComponent(customer.id!)}`}
                >
                  Manage cards
                </a>
              </p>
            ) : null}
            {customer.status !== 'ACTIVE' ? (
              <p className="mb-4" role="status">
                Assignment is unavailable because this customer is not active.
              </p>
            ) : null}
            {!knownCardStatus ? (
              <p className="mb-4" role="status">
                Card eligibility could not be verified. Assignment is
                unavailable.
              </p>
            ) : null}
            {eligible ? (
              <>
                {!reviewing ? (
                  <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (serial.trim()) setReviewing(true);
                      else
                        setAssignmentMessage(
                          'Enter a new card serial before review.',
                        );
                    }}
                  >
                    <label
                      className="grid gap-1"
                      htmlFor="supervisor-assignment-serial"
                    >
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
                    className="grid gap-3"
                    aria-labelledby="assignment-review-heading"
                  >
                    <h3 id="assignment-review-heading" className="font-medium">
                      Review card assignment
                    </h3>
                    <dl>
                      <div>
                        <dt className="text-sm font-medium">Customer</dt>
                        <dd>{String(customer.fullName ?? '—')}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium">New card serial</dt>
                        <dd>{serial.trim()}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-3">
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
                )}
              </>
            ) : null}
            {assignmentMessage ? (
              <p role="status" aria-live="polite" className="mt-3 text-sm">
                {assignmentMessage}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
