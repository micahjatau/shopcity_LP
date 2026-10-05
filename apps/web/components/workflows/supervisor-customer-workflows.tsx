'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  customersControllerCreateCustomerV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerUpdateCustomerV1,
  customersControllerUpdateStatusV1,
  type UpdateCustomerStatusDtoStatus,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { CashierPageHeader } from '../shopcity';
import { CustomerDetailsDialog } from './customer-details-dialog';
import {
  type CustomerProfileValues,
  type SupervisorCustomerRecord,
} from './customer-details-dialog';
import { CustomerRegistrationReviewDialog } from './customer-registration-review-dialog';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';
import { Button, Checkbox, Input } from '../ui';

type Customer = SupervisorCustomerRecord;
type Tab = { value: string; label: string };
const tabs: Tab[] = [
  { value: 'register', label: 'Register customer' },
  { value: 'manage', label: 'Manage customers' },
];
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
  const requested = params.get('tab');
  const active = tabs.some(({ value }) => value === requested)
    ? requested!
    : 'register';
  const [selectedTab, setSelectedTab] = useState(active);
  useEffect(() => setSelectedTab(active), [active]);
  function href(tab: string) {
    const next = new URLSearchParams(params.toString());
    next.set('tab', tab);
    return `/supervisor/customers?${next.toString()}`;
  }
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
        title="Manage customers"
        description="Register customers or find and manage customer accounts."
      />
      <nav aria-label="Customer tasks" className="sc-tabs mb-6">
        <div
          role="tablist"
          aria-label="Customer tasks"
          className="flex flex-wrap gap-2"
        >
          {tabs.map((tab, index) => (
            <Link
              key={tab.value}
              id={`customer-tab-${tab.value}`}
              href={href(tab.value)}
              role="tab"
              aria-selected={tab.value === selectedTab}
              aria-controls={`customer-panel-${tab.value}`}
              tabIndex={tab.value === selectedTab ? 0 : -1}
              onClick={() => setSelectedTab(tab.value)}
              onKeyDown={(event: KeyboardEvent<HTMLAnchorElement>) => {
                const nextIndex =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                const nextTab = tabs[nextIndex];
                setSelectedTab(nextTab.value);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLAnchorElement>('[role="tab"]')
                  [nextIndex]?.focus();
                router.replace(href(nextTab.value), { scroll: false });
              }}
              className={`sc-button sc-button--${tab.value === selectedTab ? 'primary' : 'secondary'} sc-button--standard`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
      <section
        id={`customer-panel-${selectedTab}`}
        role="tabpanel"
        aria-labelledby={`customer-tab-${selectedTab}`}
        tabIndex={0}
        className="min-w-0"
      >
        {selectedTab === 'register' ? (
          <RegisterCustomer
            onManage={(phone) =>
              updateQuery({ tab: 'manage', q: phone, id: null })
            }
          />
        ) : (
          <ManageCustomers
            initialQuery={params.get('q') ?? ''}
            customerId={params.get('id')}
            onCustomerId={(id) => updateQuery({ id })}
          />
        )}
      </section>
    </section>
  );
}

function RegisterCustomer({ onManage }: { onManage: (phone: string) => void }) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'details' | 'review' | 'success'>('details');
  const [message, setMessage] = useState(
    'Enter customer details and the serial number for their first card.',
  );
  const [createdId, setCreatedId] = useState('');
  const [createdName, setCreatedName] = useState('');
  const [verifiedExistingId, setVerifiedExistingId] = useState('');
  const [duplicateSearchPhone, setDuplicateSearchPhone] = useState('');
  const [key, setKey] = useState('');
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusNameAfterReview = useRef(false);

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
        <section
          className="supervisor-registration-success"
          role="status"
          aria-live="polite"
          aria-labelledby="supervisor-registration-success-title"
        >
          <h2
            id="supervisor-registration-success-title"
            ref={successHeadingRef}
            tabIndex={-1}
          >
            Customer registered
          </h2>
          <p>
            {createdName} and their first loyalty card have been registered
            successfully. Required consent was recorded.
          </p>
          <div className="supervisor-registration-success__actions">
            <Button variant="secondary" onClick={resetRegistration}>
              Register another customer
            </Button>
            <Link
              className="sc-button sc-button--primary sc-button--standard"
              href={`/supervisor/customers?tab=manage&id=${encodeURIComponent(createdId)}`}
            >
              View customer
            </Link>
          </div>
        </section>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-semibold">
            Register a new customer
          </h2>
          {step === 'details' ? (
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
          {step === 'details' ? (
            <>
              <p role="status" aria-live="polite" className="mt-4 text-sm">
                {message}
              </p>
              {verifiedExistingId ? (
                <p className="mt-2 text-sm">
                  <Link
                    className="underline focus-visible:outline focus-visible:outline-2"
                    href={`/supervisor/customers?tab=manage&id=${encodeURIComponent(verifiedExistingId)}`}
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
        open={step === 'review'}
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

function ManageCustomers({
  initialQuery,
  customerId,
  onCustomerId,
}: {
  initialQuery: string;
  customerId: string | null;
  onCustomerId: (id: string | null) => void;
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
  async function saveProfile() {
    if (!customer?.id) return;
    const submitted = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };
    if (!submitted.fullName || !submitted.phone) {
      setDetailMessage('Full name and phone number are required.');
      return;
    }
    if (String(customer.email ?? '').trim() && !submitted.email) {
      setDetailMessage(
        'The current customer update service cannot clear an existing email. Enter a replacement email or restore the current value.',
      );
      return;
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
        return;
      }
      setDetailMessage('Saved. Verifying current customer details…');
      const refreshed = await reload(customer.id, false, false);
      if (!refreshed) {
        setForm(submitted);
        return;
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
        return;
      }
      updateResultRecord(refreshed);
      setToastMessage('Customer changes saved');
      onCustomerId(null);
    } catch {
      setDetailMessage('Customer profile could not be saved.');
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
      <CustomerDetailsDialog
        open={Boolean(customerId)}
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
        onSave={() => void saveProfile()}
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
