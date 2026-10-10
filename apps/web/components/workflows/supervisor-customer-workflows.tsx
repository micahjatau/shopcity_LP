'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  customersControllerCreateCustomerV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerUpdateCustomerV1,
  customersControllerUpdateStatusV1,
  type UpdateCustomerStatusDtoStatus,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { resolveCustomerCardNumber } from '../../lib/customer-card-number';
import { CashierPageHeader, Money } from '../shopcity';
import { CustomerDetailsDialog } from './customer-details-dialog';
import {
  type CustomerProfileValues,
  type SupervisorCustomerRecord,
} from './customer-details-dialog';
import { CustomerRegistrationReviewDialog } from './customer-registration-review-dialog';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';
import { Button, Checkbox, Dialog, Input, Select } from '../ui';

type Customer = SupervisorCustomerRecord;
type CustomerNumericSortKey =
  'availableBalanceKobo' | 'lastPurchaseAmountKobo' | 'lifetimeEarnedKobo';
type CustomerSortState = {
  key: CustomerNumericSortKey;
  direction: 'asc' | 'desc';
} | null;
const CUSTOMER_TABLE_PAGE_SIZE = 5;

const blank = {
  fullName: '',
  phone: '',
  email: '',
  cardSerialNumber: '',
  loyaltyConsent: false,
  marketingOptIn: false,
};

function dataOf<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } }).data?.data;
}

function normalizedPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s()-]/g, '');
  return /^\+?\d+$/.test(normalized) ? normalized : null;
}

function cardSummaryLabel(customer: Customer): string {
  const activeCard =
    customer.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const status = customer.activeCardStatus ?? activeCard?.status;
  if (status === 'ACTIVE') return 'Active card';
  if (status === 'BLOCKED') return 'Blocked card';
  return 'Card status not included';
}

export function SupervisorCustomerWorkflows() {
  const router = useRouter();
  const params = useSearchParams();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const registrationCloseRef = useRef<() => void>(() =>
    setRegistrationOpen(false),
  );
  function updateQuery(values: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    router.replace(`/supervisor/customers?${next.toString()}`, {
      scroll: false,
    });
  }
  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Customers"
        description="Find customers and open their verified profile."
      />
      <CustomerDirectory
        key={directoryVersion}
        initialQuery={params.get('q') ?? ''}
        onRegister={() => setRegistrationOpen(true)}
        onQuery={(q) => updateQuery({ q: q || null, tab: null, id: null })}
      />
      <Dialog
        open={registrationOpen}
        title="Register customer"
        onClose={() => registrationCloseRef.current()}
      >
        <div className="supervisor-registration-dialog">
          <RegisterCustomer
            onManage={(phone) => updateQuery({ tab: null, q: phone, id: null })}
            onDismiss={() => setRegistrationOpen(false)}
            onCloseRequest={(requestClose) => {
              registrationCloseRef.current = requestClose;
            }}
            onDone={() => {
              setRegistrationOpen(false);
              setDirectoryVersion((version) => version + 1);
            }}
          />
        </div>
      </Dialog>
    </section>
  );
}

function RegisterCustomer({
  onManage,
  onDone,
  onCloseRequest,
  onDismiss,
}: {
  onManage: (phone: string) => void;
  onDone: () => void;
  onCloseRequest?: (requestClose: () => void) => void;
  onDismiss?: () => void;
}) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'details' | 'review' | 'success'>('details');
  const [message, setMessage] = useState(
    'Enter customer details and the serial number for their first card.',
  );
  const [createdId, setCreatedId] = useState('');
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [createdName, setCreatedName] = useState('');
  const [verifiedExistingId, setVerifiedExistingId] = useState('');
  const [duplicateSearchPhone, setDuplicateSearchPhone] = useState('');
  const [key, setKey] = useState('');
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusNameAfterReview = useRef(false);

  useEffect(() => {
    onCloseRequest?.(() => {
      if (busy) return;
      const hasValues = Object.values(form).some((value) =>
        typeof value === 'string' ? value.trim().length > 0 : value,
      );
      if (hasValues || step !== 'details') setDiscardPrompt(true);
      else onDone();
    });
  }, [busy, form, onCloseRequest, onDone, step]);

  useEffect(() => {
    if (step === 'success') successHeadingRef.current?.focus();
    if (step === 'details' && focusNameAfterReview.current) {
      fullNameInputRef.current?.focus();
      focusNameAfterReview.current = false;
    }
  }, [step]);

  function returnToDetails() {
    focusNameAfterReview.current = true;
    setStep('details');
  }

  function review(event: FormEvent) {
    event.preventDefault();
    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.cardSerialNumber.trim() ||
      !form.loyaltyConsent
    ) {
      setMessage(
        'Full name, phone number, first card serial, and loyalty consent are required.',
      );
      return;
    }
    setVerifiedExistingId('');
    setDuplicateSearchPhone('');
    setMessage('Review the details before registering the customer.');
    setStep('review');
  }

  async function confirmRegistration() {
    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.cardSerialNumber.trim() ||
      !form.loyaltyConsent
    ) {
      setMessage(
        'Full name, phone number, first card serial, and loyalty consent are required.',
      );
      returnToDetails();
      return;
    }
    const requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    setBusy(true);
    setMessage('Registering customer and first card…');
    try {
      const response = await customersControllerCreateCustomerV1(
        {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cardSerialNumber: form.cardSerialNumber.trim(),
          loyaltyConsent: form.loyaltyConsent,
          marketingOptIn: form.marketingOptIn,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        },
        createApiRequest({ csrf: true, idempotencyKey: requestKey }),
      );
      if (response.status === 201) {
        const customerId = dataOf<{ id?: string }>(response)?.id;
        if (typeof customerId !== 'string' || !customerId.trim()) {
          setMessage(
            'The registration response could not be verified. Check Manage customers before retrying.',
          );
          returnToDetails();
          return;
        }
        setCreatedId(customerId.trim());
        setCreatedName(form.fullName.trim());
        setVerifiedExistingId('');
        setKey('');
        setMessage(
          'Customer, first card, and consent were registered successfully.',
        );
        setStep('success');
      } else if (response.status === 409) {
        setDuplicateSearchPhone(form.phone.trim());
        setMessage('A customer or card serial may already exist.');
        const submittedPhone = normalizedPhone(form.phone.trim());
        if (submittedPhone) {
          try {
            const searchResponse = await customersControllerListCustomersV1(
              { q: form.phone.trim(), limit: '25', cursor: '' },
              createApiRequest({ csrf: true }),
            );
            const candidates =
              searchResponse.status === 200
                ? (dataOf<{ items?: Customer[] }>(searchResponse)?.items ?? [])
                : [];
            const exactMatch = candidates.find(
              (candidate) =>
                normalizedPhone(candidate.phoneE164) === submittedPhone &&
                typeof candidate.id === 'string' &&
                candidate.id.length > 0,
            );
            if (exactMatch?.id) {
              const detailResponse = await customersControllerGetCustomerV1(
                exactMatch.id,
                createApiRequest({ csrf: true }),
              );
              const verified =
                detailResponse.status === 200
                  ? dataOf<Customer>(detailResponse)
                  : undefined;
              if (
                verified?.id === exactMatch.id &&
                normalizedPhone(verified.phoneE164) === submittedPhone
              ) {
                setVerifiedExistingId(verified.id);
                setMessage(
                  'A customer with this phone number was verified. Open their profile to manage the customer.',
                );
              }
            }
          } catch {
            // An unavailable lookup must not expose or select an unverified record.
          }
        }
        returnToDetails();
      } else {
        setMessage(
          `Registration was not confirmed (${response.status}). Check Manage customers before retrying.`,
        );
        returnToDetails();
      }
    } catch {
      setMessage(
        'Registration outcome could not be confirmed. Check Manage customers before retrying.',
      );
      returnToDetails();
    } finally {
      setBusy(false);
    }
  }

  function resetRegistration() {
    focusNameAfterReview.current = true;
    setForm(blank);
    setCreatedId('');
    setCreatedName('');
    setVerifiedExistingId('');
    setDuplicateSearchPhone('');
    setKey('');
    setMessage(
      'Enter customer details and the serial number for their first card.',
    );
    setStep('details');
  }

  return (
    <div className="sc-card sc-card--standard supervisor-registration-card max-w-3xl">
      {step === 'success' ? (
        <SuccessPopUp
          customerName={createdName}
          headingRef={successHeadingRef}
          onDone={onDone}
          profileHref={`/supervisor/customers/${encodeURIComponent(createdId)}`}
          onRegisterAnother={resetRegistration}
        />
      ) : (
        <>
          {discardPrompt ? (
            <section
              className="sc-customer-details__discard"
              aria-labelledby="registration-discard-title"
              aria-describedby="registration-discard-description"
            >
              <h2 id="registration-discard-title">Discard registration?</h2>
              <p id="registration-discard-description">
                The customer details you entered have not been submitted.
              </p>
              <div className="sc-customer-details__actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDiscardPrompt(false)}
                >
                  Keep editing
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={onDismiss ?? onDone}
                >
                  Discard
                </Button>
              </div>
            </section>
          ) : null}
          {!discardPrompt ? (
            <h2 className="mb-4 text-lg font-semibold">
              Register a new customer
            </h2>
          ) : null}
          {!discardPrompt && step === 'details' ? (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => review(event)}
            >
              {(
                [
                  ['fullName', 'Full name'],
                  ['phone', 'Phone number'],
                  ['email', 'Email (optional)'],
                  ['cardSerialNumber', 'First card serial'],
                ] as const
              ).map(([field, label]) => (
                <label
                  key={field}
                  className="grid min-w-0 gap-1"
                  htmlFor={`register-${field}`}
                >
                  {label}
                  <Input
                    id={`register-${field}`}
                    ref={field === 'fullName' ? fullNameInputRef : undefined}
                    type={field === 'email' ? 'email' : 'text'}
                    required={field !== 'email'}
                    value={form[field]}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }));
                      setVerifiedExistingId('');
                      setDuplicateSearchPhone('');
                      setKey('');
                    }}
                  />
                </label>
              ))}
              <fieldset className="grid gap-3 sm:col-span-2">
                <legend>Customer consent · v1.2 · privacy v2.0</legend>
                <label
                  className="flex items-center gap-2"
                  htmlFor="supervisor-loyalty-consent"
                >
                  <Checkbox
                    id="supervisor-loyalty-consent"
                    aria-label="Loyalty service consent (required)"
                    checked={form.loyaltyConsent}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        loyaltyConsent: event.target.checked,
                      }));
                      setVerifiedExistingId('');
                      setDuplicateSearchPhone('');
                      setKey('');
                    }}
                  />
                  The customer agrees to ShopCity holding purchase and wallet
                  records to operate ShopCity Credit.
                </label>
                <label
                  className="flex items-center gap-2"
                  htmlFor="supervisor-marketing-opt-in"
                >
                  <Checkbox
                    id="supervisor-marketing-opt-in"
                    aria-label="Marketing opt-in (optional)"
                    checked={form.marketingOptIn}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        marketingOptIn: event.target.checked,
                      }));
                      setVerifiedExistingId('');
                      setDuplicateSearchPhone('');
                      setKey('');
                    }}
                  />
                  Optional: offers and campaign messages by WhatsApp or SMS
                </label>
              </fieldset>
              <div className="min-w-0 sm:col-span-2">
                <Button
                  type="submit"
                  className="w-full whitespace-normal text-center sm:w-auto sm:whitespace-nowrap"
                >
                  Review details
                </Button>
              </div>
            </form>
          ) : null}
          {!discardPrompt && step === 'details' ? (
            <>
              <p role="status" aria-live="polite" className="mt-4 text-sm">
                {message}
              </p>
              {verifiedExistingId ? (
                <p className="mt-2 text-sm">
                  <Link
                    className="underline focus-visible:outline focus-visible:outline-2"
                    href={`/supervisor/customers/${encodeURIComponent(verifiedExistingId)}`}
                  >
                    Manage customer {verifiedExistingId}
                  </Link>
                </p>
              ) : null}
              {duplicateSearchPhone && !verifiedExistingId ? (
                <button
                  type="button"
                  className="mt-2 underline focus-visible:outline focus-visible:outline-2"
                  onClick={() => onManage(form.phone.trim())}
                >
                  Search this phone in Manage customers
                </button>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <CustomerRegistrationReviewDialog
        open={step === 'review' && !discardPrompt}
        customer={{
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          cardSerialNumber: form.cardSerialNumber.trim(),
        }}
        onEdit={returnToDetails}
        onConfirm={confirmRegistration}
        busy={busy}
      />
    </div>
  );
}

export function SuccessPopUp({
  customerName,
  headingRef,
  onDone,
  profileHref,
  onRegisterAnother,
}: {
  customerName: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onDone: () => void;
  profileHref: string;
  onRegisterAnother: () => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return (
    <motion.section
      className={`supervisor-registration-success ${reducedMotion ? 'is-reduced-motion' : ''}`}
      role="status"
      aria-live="polite"
      aria-labelledby="supervisor-registration-success-title"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-spring-stiffness="300"
      data-spring-damping="20"
      initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 20 }
      }
    >
      <svg
        className="supervisor-registration-success__check"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="29" fill="none" />
        <motion.path
          d="M18 33l9 9 19-21"
          fill="none"
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.15 }
          }
        />
      </svg>
      <h2
        id="supervisor-registration-success-title"
        ref={headingRef}
        tabIndex={-1}
      >
        Success!
      </h2>
      <p>Customer registered successfully.</p>
      <p>
        {customerName} and their first loyalty card were registered. Required
        consent was recorded.
      </p>
      <div className="supervisor-registration-success__actions">
        <Button variant="secondary" onClick={onRegisterAnother}>
          Register another customer
        </Button>
        <Link
          className="sc-button sc-button--secondary sc-button--standard"
          href={profileHref}
        >
          View customer
        </Link>
        <Button onClick={onDone}>Done</Button>
      </div>
    </motion.section>
  );
}

function CustomerDirectory({
  initialQuery,
  onRegister,
  onQuery,
}: {
  initialQuery: string;
  onRegister: () => void;
  onQuery: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Customer[]>([]);
  const [message, setMessage] = useState('Loading customers…');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sort, setSort] = useState<CustomerSortState>(null);
  const [page, setPage] = useState(1);
  const pendingUrlQuery = useRef<string | null>(null);

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim();
    setPage(1);
    setFailed(false);
    setLoading(true);
    setMessage(trimmed ? 'Searching customers…' : 'Loading customers…');
    try {
      const rows: Customer[] = [];
      const seenCursors = new Set<string>();
      let cursor = '';
      let hasMore = true;
      while (hasMore) {
        const response = await customersControllerListCustomersV1(
          { q: trimmed, limit: '25', cursor },
          createApiRequest({ csrf: true }),
        );
        if (response.status !== 200) throw new Error(String(response.status));
        const responsePage = dataOf<{
          items?: Customer[];
          nextCursor?: string | null;
          hasMore?: boolean;
        }>(response);
        rows.push(...(responsePage?.items ?? []));
        const nextCursor = responsePage?.nextCursor;
        hasMore = responsePage?.hasMore === true;
        if (hasMore) {
          if (!nextCursor || seenCursors.has(nextCursor)) {
            throw new Error('Customer directory pagination cursor was invalid');
          }
          seenCursors.add(nextCursor);
          cursor = nextCursor;
        }
      }
      const uniqueRows = new Map<string, Customer>();
      rows.forEach((record) => {
        const id = typeof record.id === 'string' ? record.id.trim() : '';
        if (!id) throw new Error('Customer result did not include a stable ID');
        if (!uniqueRows.has(id)) uniqueRows.set(id, record);
      });
      setResults([...uniqueRows.values()]);
      setMessage('');
    } catch {
      setFailed(true);
      setMessage(
        'Customers could not be loaded. Your previous results are still shown.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
    if (pendingUrlQuery.current === initialQuery) {
      pendingUrlQuery.current = null;
      return;
    }
    pendingUrlQuery.current = null;
    void search(initialQuery);
  }, [initialQuery, search]);

  const filteredResults = useMemo(
    () =>
      results.filter((record) =>
        statusFilter === 'ALL'
          ? true
          : String(record.status ?? '').toUpperCase() === statusFilter,
      ),
    [results, statusFilter],
  );
  const sortedResults = useMemo(() => {
    if (!sort) return filteredResults;
    return [...filteredResults].sort((left, right) => {
      const leftValue = customerMoneyValue(left[sort.key]);
      const rightValue = customerMoneyValue(right[sort.key]);
      if (leftValue === null) return rightValue === null ? 0 : 1;
      if (rightValue === null) return -1;
      const comparison =
        leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredResults, sort]);
  const pageCount = Math.max(
    1,
    Math.ceil(sortedResults.length / CUSTOMER_TABLE_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * CUSTOMER_TABLE_PAGE_SIZE;
  const visibleResults = sortedResults.slice(
    pageStart,
    pageStart + CUSTOMER_TABLE_PAGE_SIZE,
  );
  const firstVisible = filteredResults.length ? pageStart + 1 : 0;
  const lastVisible = Math.min(
    pageStart + CUSTOMER_TABLE_PAGE_SIZE,
    filteredResults.length,
  );
  const statusDescription =
    statusFilter === 'ALL'
      ? 'customer'
      : `${statusFilter.toLowerCase()} customer`;
  const resultType = `${statusDescription}${filteredResults.length === 1 ? '' : 's'}`;
  const resultSummary = loading
    ? message
    : failed || results.length > 0
      ? ''
      : initialQuery
        ? 'No customers matched your search.'
        : 'No customers are registered yet.';

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    setPage(1);
    pendingUrlQuery.current = trimmed;
    onQuery(trimmed);
    void search(trimmed);
  };

  return (
    <section
      className="supervisor-customer-directory"
      aria-label="Customer results"
      aria-busy={loading}
    >
      <div className="supervisor-customer-directory__toolbar">
        <form
          onSubmit={submitSearch}
          className="supervisor-customer-directory__search"
          role="search"
        >
          <label className="sr-only" htmlFor="supervisor-customer-search">
            Search by customer name, phone number, or card number
          </label>
          <div className="supervisor-customer-directory__search-control">
            <Search aria-hidden="true" size={16} />
            <Input
              id="supervisor-customer-search"
              type="search"
              className="supervisor-customer-directory__search-input"
              placeholder="Name, phone, or card number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              type="submit"
              variant="ghost"
              size="compact"
              className="supervisor-customer-directory__search-submit"
              aria-label="Search customers"
              disabled={loading}
            >
              <Search aria-hidden="true" size={16} />
            </Button>
          </div>
        </form>
        <div className="supervisor-customer-directory__actions">
          <div className="supervisor-customer-directory__filter">
            <Filter aria-hidden="true" size={15} />
            <label
              className="sr-only"
              htmlFor="supervisor-customer-status-filter"
            >
              Filter customers by status
            </label>
            <Select
              id="supervisor-customer-status-filter"
              aria-label="Filter customers by status"
              className="supervisor-customer-directory__filter-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'BLOCKED', label: 'Blocked' },
              ]}
            />
          </div>
          <Button
            type="button"
            className="supervisor-customer-directory__register"
            onClick={onRegister}
          >
            Register customer
          </Button>
        </div>
      </div>

      {resultSummary ? (
        <p
          role="status"
          aria-live="polite"
          className="supervisor-customer-directory__status"
        >
          {resultSummary}
        </p>
      ) : null}
      {failed ? (
        <div className="supervisor-customer-directory__error" role="alert">
          <p>{message}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void search(query)}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {loading && !results.length ? (
        <div
          className="supervisor-customer-directory__skeleton"
          aria-hidden="true"
        >
          {[1, 2, 3].map((row) => (
            <span key={row} />
          ))}
        </div>
      ) : null}

      {results.length > 0 ? (
        <>
          <div className="supervisor-customer-table-wrap">
            <table className="supervisor-customer-table">
              <caption className="sr-only">
                Customer records, five per page. Card number is the assigned
                card serial/barcode. Last purchase is the latest full basket
                total. Available, last purchase, and lifetime earned columns can
                be sorted; unavailable values are marked not provided.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Card number</th>
                  <SortableCustomerHeader
                    label="Available"
                    sortKey="availableBalanceKobo"
                    sort={sort}
                    onSort={setSort}
                    onSortStart={() => setPage(1)}
                  />
                  <SortableCustomerHeader
                    label="Last purchase"
                    sortKey="lastPurchaseAmountKobo"
                    sort={sort}
                    onSort={setSort}
                    onSortStart={() => setPage(1)}
                  />
                  <SortableCustomerHeader
                    label="Lifetime earned"
                    sortKey="lifetimeEarnedKobo"
                    sort={sort}
                    onSort={setSort}
                    onSortStart={() => setPage(1)}
                  />
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleResults.length ? (
                  visibleResults.map((record) => {
                    const id = String(record.id);
                    const name =
                      typeof record.fullName === 'string' &&
                      record.fullName.trim()
                        ? record.fullName.trim()
                        : 'Name not provided';
                    const cardNumber = resolveCustomerCardNumber(record);
                    const available = customerMoneyValue(
                      record.availableBalanceKobo,
                    );
                    const lastPurchase = customerMoneyValue(
                      record.lastPurchaseAmountKobo,
                    );
                    const lifetime = customerMoneyValue(
                      record.lifetimeEarnedKobo,
                    );
                    const profileHref = `/supervisor/customers/${encodeURIComponent(id)}${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ''}`;
                    return (
                      <tr key={id}>
                        <td data-label="Name">
                          <div className="supervisor-customer-table__identity">
                            <strong>{name}</strong>
                            <span>
                              {typeof record.phoneE164 === 'string' &&
                              record.phoneE164.trim()
                                ? record.phoneE164
                                : 'Phone not provided'}
                            </span>
                          </div>
                        </td>
                        <td
                          data-label="Card number"
                          className="supervisor-customer-table__card-number"
                        >
                          {cardNumber ?? <NotProvided label="Card number" />}
                        </td>
                        <td
                          data-label="Available"
                          className="supervisor-customer-table__money"
                        >
                          {available === null ? (
                            <NotProvided label="Available balance" />
                          ) : (
                            <Money amountKobo={available} />
                          )}
                        </td>
                        <td
                          data-label="Last purchase"
                          className="supervisor-customer-table__money"
                        >
                          {lastPurchase === null ? (
                            <NotProvided label="Last purchase" />
                          ) : (
                            <Money amountKobo={lastPurchase} />
                          )}
                        </td>
                        <td
                          data-label="Lifetime earned"
                          className="supervisor-customer-table__money"
                        >
                          {lifetime === null ? (
                            <NotProvided label="Lifetime earned" />
                          ) : (
                            <Money amountKobo={lifetime} />
                          )}
                        </td>
                        <td data-label="Status">
                          <SupervisorCustomerStatusBadge
                            status={record.status}
                            fallback="Status not provided"
                          />
                        </td>
                        <td data-label="Action">
                          <Link
                            className="supervisor-customer-table__profile-link"
                            href={profileHref}
                            aria-label={`View profile for ${name}`}
                          >
                            View profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      className="supervisor-customer-table__empty"
                      colSpan={7}
                    >
                      No {statusDescription} match this status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredResults.length ? (
            <>
              <p
                className="supervisor-customer-directory__table-count"
                aria-live="polite"
              >
                Showing {firstVisible}–{lastVisible} of {filteredResults.length}{' '}
                {resultType}.
              </p>
              <nav
                className="supervisor-customer-directory__pagination"
                aria-label="Customer results pagination"
              >
                <button
                  className="supervisor-customer-directory__pagination-button"
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1 || loading}
                  aria-label="Previous customer page"
                >
                  <ChevronLeft aria-hidden="true" size={16} />
                </button>
                <p className="supervisor-customer-directory__pagination-status">
                  Page {currentPage} · {filteredResults.length} {resultType}
                </p>
                <button
                  className="supervisor-customer-directory__pagination-button"
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  disabled={currentPage >= pageCount || loading}
                  aria-label="Next customer page"
                >
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </nav>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function SortableCustomerHeader({
  label,
  sortKey,
  sort,
  onSort,
  onSortStart,
}: {
  label: string;
  sortKey: CustomerNumericSortKey;
  sort: CustomerSortState;
  onSort: (next: CustomerSortState) => void;
  onSortStart: () => void;
}) {
  const isActive = sort?.key === sortKey;
  const direction = sort?.direction;
  const SortIcon = !isActive
    ? ArrowUpDown
    : direction === 'asc'
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      scope="col"
      aria-label={label}
      aria-sort={
        isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        className="supervisor-customer-table__sort"
        type="button"
        aria-label={`Sort by ${label}, ${isActive ? `currently ${direction === 'asc' ? 'ascending' : 'descending'}` : 'currently unsorted'}`}
        onClick={() => {
          onSortStart();
          onSort(
            isActive
              ? {
                  key: sortKey,
                  direction: direction === 'asc' ? 'desc' : 'asc',
                }
              : { key: sortKey, direction: 'asc' },
          );
        }}
      >
        {label}
        <SortIcon aria-hidden="true" size={14} />
      </button>
    </th>
  );
}

function customerMoneyValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function NotProvided({ label }: { label: string }) {
  return (
    <span className="supervisor-customer-table__missing">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label} not provided</span>
    </span>
  );
}

function ManageCustomers({
  initialQuery,
  customerId,
  onCustomerId,
  profileOnly = false,
  initialProfileTab,
}: {
  initialQuery: string;
  customerId: string | null;
  onCustomerId: (id: string | null) => void;
  profileOnly?: boolean;
  initialProfileTab?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [message, setMessage] = useState(
    'Search by name, phone number, or customer ID.',
  );
  const [detailMessage, setDetailMessage] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoadFailed, setDetailLoadFailed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CustomerProfileValues>({
    fullName: '',
    phone: '',
    email: '',
  });
  const [status, setStatus] = useState<UpdateCustomerStatusDtoStatus>('ACTIVE');
  const [confirmation, setConfirmation] = useState('');
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const detailSequence = useRef(0);
  const updateResultRecord = useCallback((record: Customer) => {
    if (typeof record.id !== 'string') return;
    setResults((current) =>
      current.map((result) =>
        result.id === record.id ? { ...result, ...record } : result,
      ),
    );
  }, []);
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);
  const reload = useCallback(
    async function reload(
      id: string,
      clearCurrent = true,
      updateResults = true,
    ): Promise<Customer | null> {
      const request = ++detailSequence.current;
      if (clearCurrent) setCustomer(null);
      setDetailLoading(true);
      setDetailLoadFailed(false);
      setDetailMessage('Loading customer details…');
      try {
        const response = await customersControllerGetCustomerV1(
          id,
          createApiRequest({ csrf: true }),
        );
        if (request !== detailSequence.current) return null;
        const record =
          response.status === 200 ? dataOf<Customer>(response) : undefined;
        if (!record || record.id !== id) {
          setDetailLoadFailed(true);
          setDetailMessage(
            `Customer details could not be verified (${response.status}).`,
          );
          setDetailLoading(false);
          return null;
        }
        setCustomer(record);
        if (updateResults) updateResultRecord(record);
        setForm({
          fullName: String(record.fullName ?? ''),
          phone: String(record.phoneE164 ?? ''),
          email: String(record.email ?? ''),
        });
        setStatus(record.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE');
        setConfirmation('');
        setStatusEditorOpen(false);
        setDetailLoadFailed(false);
        setDetailMessage('');
        setDetailLoading(false);
        return record;
      } catch {
        if (request !== detailSequence.current) return null;
        setDetailLoadFailed(true);
        setDetailMessage(
          'Customer details could not be loaded. Try again before editing.',
        );
        setDetailLoading(false);
        return null;
      }
    },
    [updateResultRecord],
  );
  useEffect(() => {
    if (customerId) {
      void reload(customerId);
    } else {
      detailSequence.current += 1;
      setCustomer(null);
      setDetailLoading(false);
      setDetailLoadFailed(false);
      setDetailMessage('');
      setStatusEditorOpen(false);
      setConfirmation('');
    }
  }, [customerId, reload]);
  async function search(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setResults([]);
      setMessage('Enter a name, phone number, or customer ID to search.');
      return;
    }
    setMessage('Searching customers…');
    try {
      const response = await customersControllerListCustomersV1(
        { q: term, limit: '25', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) {
        setResults([]);
        setMessage(
          `Customer search unavailable (${response.status}). Try again.`,
        );
        return;
      }
      const rows = dataOf<{ items?: Customer[] }>(response)?.items ?? [];
      setResults(rows);
      setMessage(
        rows.length
          ? `${rows.length} customer${rows.length === 1 ? '' : 's'} found. Select a customer to edit verified details.`
          : 'No customers found.',
      );
    } catch {
      setResults([]);
      setMessage('Customer search could not be completed. Try again.');
    }
  }
  async function saveProfile(): Promise<boolean> {
    if (!customer?.id) return false;
    const submitted = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };
    if (!submitted.fullName || !submitted.phone) {
      setDetailMessage('Full name and phone number are required.');
      return false;
    }
    if (String(customer.email ?? '').trim() && !submitted.email) {
      setDetailMessage(
        'The current customer update service cannot clear an existing email. Enter a replacement email or restore the current value.',
      );
      return false;
    }
    setBusy(true);
    setDetailMessage('Saving customer profile…');
    try {
      const response = await customersControllerUpdateCustomerV1(
        customer.id,
        {
          fullName: submitted.fullName,
          phone: submitted.phone,
          ...(submitted.email ? { email: submitted.email } : {}),
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status !== 200) {
        setDetailMessage(
          `Customer profile was not saved (${response.status}).`,
        );
        return false;
      }
      setDetailMessage('Saved. Verifying current customer details…');
      const refreshed = await reload(customer.id, false, false);
      if (!refreshed) {
        setForm(submitted);
        return false;
      }
      const savedValuesMatch =
        String(refreshed.fullName ?? '').trim() === submitted.fullName &&
        normalizedPhone(refreshed.phoneE164) ===
          normalizedPhone(submitted.phone) &&
        String(refreshed.email ?? '')
          .trim()
          .toLowerCase() === submitted.email.toLowerCase();
      if (!savedValuesMatch) {
        setForm(submitted);
        setDetailLoadFailed(true);
        setDetailMessage(
          'The profile update succeeded, but the refreshed values did not match your edits. Reload before retrying.',
        );
        return false;
      }
      updateResultRecord(refreshed);
      setToastMessage('Customer changes saved');
      if (!profileOnly) onCustomerId(null);
      return true;
    } catch {
      setDetailMessage('Customer profile could not be saved.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus() {
    const requiredPhrase = status === 'BLOCKED' ? 'BLOCK' : 'ACTIVATE';
    if (customer && status === customer.status) {
      setDetailMessage('Choose a different customer status before updating.');
      return;
    }
    if (!customer?.id || confirmation.trim().toUpperCase() !== requiredPhrase) {
      setDetailMessage(`Type ${requiredPhrase} to confirm the status change.`);
      return;
    }
    setBusy(true);
    setDetailMessage('Updating customer status…');
    try {
      const response = await customersControllerUpdateStatusV1(
        customer.id,
        { status },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status !== 200) {
        setDetailMessage(
          `Customer status was not updated (${response.status}).`,
        );
        return;
      }
      const refreshed = await reload(customer.id, false, false);
      if (!refreshed || refreshed.status !== status) {
        setDetailLoadFailed(true);
        setDetailMessage(
          'The status change was accepted, but current customer details could not verify it. Reload before continuing.',
        );
        return;
      }
      updateResultRecord(refreshed);
      setDetailMessage('Customer status updated.');
    } catch {
      setDetailMessage('Customer status could not be updated.');
    } finally {
      setBusy(false);
    }
  }
  const profileDirty =
    !!customer &&
    (form.fullName.trim() !== String(customer.fullName ?? '').trim() ||
      form.phone.trim() !== String(customer.phoneE164 ?? '').trim() ||
      form.email.trim() !== String(customer.email ?? '').trim());
  return (
    <div className="supervisor-customer-layout">
      {!profileOnly ? (
        <section
          className="sc-card sc-card--standard supervisor-customer-panel"
          aria-label="Find a customer"
        >
          <h2 className="supervisor-customer-panel__title">Find a customer</h2>
          <form
            className="supervisor-customer-search-form"
            onSubmit={(event) => void search(event)}
          >
            <label
              className="grid min-w-0 gap-1"
              htmlFor="supervisor-customer-search"
            >
              Name, phone number, or customer ID
              <Input
                id="supervisor-customer-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              size="standard"
              aria-label="Search customers"
              className="supervisor-customer-search-form__submit"
            >
              Search
            </Button>
          </form>
          <p role="status" aria-live="polite" className="mt-3 text-sm">
            {message}
          </p>
          {results.length ? (
            <ul
              className="supervisor-customer-results"
              aria-label="Customer search results"
            >
              {results.map((record, index) => {
                const id = typeof record.id === 'string' ? record.id : '';
                const selected = customerId === id;
                const cardStatusLabel = cardSummaryLabel(record);
                return (
                  <li key={id || `customer-${index}`}>
                    <button
                      type="button"
                      className="supervisor-customer-result"
                      aria-pressed={selected}
                      disabled={!id}
                      onClick={() => {
                        if (!id || selected) return;
                        setCustomer(null);
                        setDetailLoading(true);
                        setDetailLoadFailed(false);
                        setDetailMessage('Loading customer details…');
                        setStatusEditorOpen(false);
                        setConfirmation('');
                        onCustomerId(id);
                      }}
                    >
                      <span className="supervisor-customer-result__identity">
                        <span className="supervisor-customer-result__name">
                          {String(record.fullName ?? 'Customer')}
                        </span>
                        <span className="supervisor-customer-result__phone">
                          {String(record.phoneE164 ?? 'Phone unavailable')}
                        </span>
                      </span>
                      <span className="supervisor-customer-result__statuses">
                        <span className="supervisor-customer-result__customer-status">
                          <span>Customer</span>
                          <SupervisorCustomerStatusBadge
                            status={record.status}
                            fallback="Status not provided"
                          />
                        </span>
                        <span
                          className={`supervisor-customer-result__card-status ${cardStatusLabel === 'Active card' ? 'is-active' : ''}`}
                        >
                          <span aria-hidden="true" />
                          {cardStatusLabel}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="supervisor-customer-result__chevron"
                      >
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      <CustomerDetailsDialog
        open={Boolean(customerId)}
        presentation={profileOnly ? 'page' : 'dialog'}
        initialTab={initialProfileTab}
        customer={customer}
        profile={form}
        profileDirty={profileDirty}
        loading={detailLoading}
        loadFailed={detailLoadFailed}
        busy={busy}
        message={detailMessage}
        status={status}
        confirmation={confirmation}
        statusEditorOpen={statusEditorOpen}
        onProfileChange={(field, value) => {
          setForm((current) => ({ ...current, [field]: value }));
          setDetailMessage('');
        }}
        onConfirmationChange={(value) => {
          setConfirmation(value);
          setDetailMessage('');
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setConfirmation('');
        }}
        onOpenStatusEditor={() => {
          if (!customer) return;
          setStatus(customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE');
          setConfirmation('');
          setDetailMessage('');
          setStatusEditorOpen(true);
        }}
        onCancelStatusEditor={() => {
          setStatus(customer?.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE');
          setConfirmation('');
          setStatusEditorOpen(false);
          setDetailMessage('');
        }}
        onRetry={() => {
          if (customerId) void reload(customerId, !customer);
        }}
        onSave={() => saveProfile()}
        onDiscardProfileEdit={() => {
          if (!customer) return;
          setForm({
            fullName: String(customer.fullName ?? ''),
            phone: String(customer.phoneE164 ?? ''),
            email: String(customer.email ?? ''),
          });
          setDetailMessage('');
        }}
        onChangeStatus={() => void changeStatus()}
        onClose={() => onCustomerId(null)}
      />
      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="supervisor-customer-toast"
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

export function SupervisorCustomerProfile({
  customerId,
  returnQuery = '',
  initialTab,
}: {
  customerId: string;
  returnQuery?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const backHref = `/supervisor/customers${returnQuery ? `?q=${encodeURIComponent(returnQuery)}` : ''}`;
  return (
    <section className="supervisor-page sc-page">
      <ManageCustomers
        key={customerId}
        initialQuery=""
        customerId={customerId}
        profileOnly
        initialProfileTab={initialTab}
        onCustomerId={() => router.push(backHref)}
      />
    </section>
  );
}
