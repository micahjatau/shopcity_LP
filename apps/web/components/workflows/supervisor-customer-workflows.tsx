'use client';

import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
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
import { Button, Input } from '../ui';

type Customer = Record<string, unknown> & {
  id?: string;
  fullName?: string;
  phoneE164?: string;
  email?: string;
  status?: string;
  isStaff?: boolean;
  activeCardStatus?: string;
  activeCardSerialNumber?: string;
  cards?: unknown;
  activeCard?: unknown;
};
type Tab = { value: string; label: string };
const tabs: Tab[] = [
  { value: 'register', label: 'Register customer' },
  { value: 'manage', label: 'Manage customers' },
];
const blank = { fullName: '', phone: '', email: '', cardSerialNumber: '' };

function dataOf<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } }).data?.data;
}

function displayValue(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;
}

function normalizedPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s()-]/g, '');
  return /^\+?\d+$/.test(normalized) ? normalized : null;
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
    <main className="sc-page" aria-labelledby="supervisor-customers-title">
      <header className="mb-6">
        <h1 id="supervisor-customers-title" className="text-2xl font-semibold">
          Customers
        </h1>
      </header>
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
    </main>
  );
}

function RegisterCustomer({ onManage }: { onManage: (phone: string) => void }) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    'Enter customer details and the serial number for their first card.',
  );
  const [createdId, setCreatedId] = useState('');
  const [duplicateSearchPhone, setDuplicateSearchPhone] = useState('');
  const [key, setKey] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.cardSerialNumber.trim()
    ) {
      setMessage(
        'Full name, phone number, and first card serial are required.',
      );
      return;
    }
    setBusy(true);
    setCreatedId('');
    setDuplicateSearchPhone('');
    setMessage('Registering customer and first card…');
    const requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    try {
      const response = await customersControllerCreateCustomerV1(
        {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cardSerialNumber: form.cardSerialNumber.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        },
        createApiRequest({ csrf: true, idempotencyKey: requestKey }),
      );
      if (response.status === 201) {
        const customerId = dataOf<{ id?: string }>(response)?.id;
        if (!customerId) {
          setMessage(
            'The registration response could not be verified. Check Manage customers before retrying.',
          );
          return;
        }
        setCreatedId(customerId);
        setKey('');
        setMessage('Customer and first card were registered successfully.');
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
                setCreatedId(verified.id);
                setMessage(
                  'A customer with this phone number was verified. Open their profile to manage the customer.',
                );
              }
            }
          } catch {
            // An unavailable lookup must not expose or select an unverified record.
          }
        }
      } else {
        setMessage(
          `Registration was not confirmed (${response.status}). Check Manage customers before retrying.`,
        );
      }
    } catch {
      setMessage(
        'Registration outcome could not be confirmed. Check Manage customers before retrying.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sc-card sc-card--standard max-w-3xl p-5">
      <h2 className="mb-4 text-lg font-semibold">Register a new customer</h2>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => void submit(event)}
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
              type={field === 'email' ? 'email' : 'text'}
              required={field !== 'email'}
              value={form[field]}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  [field]: event.target.value,
                }));
                setCreatedId('');
                setDuplicateSearchPhone('');
                setKey('');
              }}
            />
          </label>
        ))}
        <div className="min-w-0 sm:col-span-2">
          <Button
            type="submit"
            loading={busy}
            className="w-full whitespace-normal text-center sm:w-auto sm:whitespace-nowrap"
          >
            Register customer and first card
          </Button>
        </div>
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-sm">
        {message}
      </p>
      {createdId ? (
        <p className="mt-2 text-sm">
          <Link
            className="underline focus-visible:outline focus-visible:outline-2"
            href={`/supervisor/customers?tab=manage&id=${encodeURIComponent(createdId)}`}
          >
            Manage customer {createdId}
          </Link>
        </p>
      ) : null}
      {duplicateSearchPhone && !createdId ? (
        <button
          type="button"
          className="mt-2 underline focus-visible:outline focus-visible:outline-2"
          onClick={() => onManage(form.phone.trim())}
        >
          Search this phone in Manage customers
        </button>
      ) : null}
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
  const [detailMessage, setDetailMessage] = useState(
    'Select a customer to view or manage their profile.',
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
  const [status, setStatus] = useState<UpdateCustomerStatusDtoStatus>('ACTIVE');
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  async function reload(id: string) {
    setCustomer(null);
    setDetailMessage('Loading customer details…');
    try {
      const response = await customersControllerGetCustomerV1(
        id,
        createApiRequest({ csrf: true }),
      );
      const record =
        response.status === 200 ? dataOf<Customer>(response) : undefined;
      if (!record || record.id !== id) {
        setDetailMessage(
          `Customer details could not be verified (${response.status}).`,
        );
        return;
      }
      setCustomer(record);
      setForm({
        fullName: String(record.fullName ?? ''),
        phone: String(record.phoneE164 ?? ''),
        email: String(record.email ?? ''),
      });
      setStatus(record.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE');
      setConfirmation('');
      setDetailMessage('Customer details loaded.');
    } catch {
      setDetailMessage(
        'Customer details could not be loaded. Try selecting the customer again.',
      );
    }
  }
  useEffect(() => {
    if (customerId) void reload(customerId);
    else {
      setCustomer(null);
      setDetailMessage('Select a customer to view or manage their profile.');
    }
  }, [customerId]);
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
          ? `${rows.length} customer${rows.length === 1 ? '' : 's'} found. Select a result to load its details.`
          : 'No customers found.',
      );
    } catch {
      setResults([]);
      setMessage('Customer search could not be completed. Try again.');
    }
  }
  async function saveProfile() {
    if (!customer?.id) return;
    setBusy(true);
    setDetailMessage('Saving customer profile…');
    try {
      const response = await customersControllerUpdateCustomerV1(
        customer.id,
        {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status === 200) {
        setDetailMessage('Customer profile saved.');
        await reload(customer.id);
      } else
        setDetailMessage(
          `Customer profile was not saved (${response.status}).`,
        );
    } catch {
      setDetailMessage('Customer profile could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus() {
    if (!customer?.id || confirmation.trim().toUpperCase() !== 'UPDATE') {
      setDetailMessage('Type UPDATE to confirm the customer status change.');
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
      setDetailMessage(
        response.status === 200
          ? 'Customer status updated.'
          : `Customer status was not updated (${response.status}).`,
      );
      if (response.status === 200) await reload(customer.id);
    } catch {
      setDetailMessage('Customer status could not be updated.');
    } finally {
      setBusy(false);
    }
  }
  const activeCard =
    customer?.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const cardStatus = displayValue(
    customer?.activeCardStatus ?? activeCard?.status,
    'No active card',
  );
  const cardSerial = displayValue(
    customer?.activeCardSerialNumber ?? activeCard?.serialNumber,
    '',
  );
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
      <section
        className="sc-card sc-card--standard min-w-0 p-5"
        aria-label="Find a customer"
      >
        <h2 className="mb-4 text-lg font-semibold">Find a customer</h2>
        <form className="grid gap-3" onSubmit={(event) => void search(event)}>
          <label className="grid gap-1" htmlFor="supervisor-customer-search">
            Name, phone number, or customer ID
            <Input
              id="supervisor-customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button type="submit">Search customers</Button>
        </form>
        <p role="status" aria-live="polite" className="mt-3 text-sm">
          {message}
        </p>
        {results.length ? (
          <ul className="mt-3 grid gap-2" aria-label="Customer search results">
            {results.map((record, index) => (
              <li key={String(record.id ?? index)}>
                <button
                  type="button"
                  className="w-full rounded border p-3 text-left focus-visible:outline focus-visible:outline-2"
                  onClick={() => onCustomerId(record.id ?? null)}
                >
                  <span className="block font-medium">
                    {String(record.fullName ?? 'Customer')}
                  </span>
                  <span className="text-sm">
                    {String(record.phoneE164 ?? 'Phone unavailable')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section
        className="sc-card sc-card--standard min-w-0 p-5"
        aria-label="Customer details"
      >
        <h2 className="mb-3 text-lg font-semibold">Customer details</h2>
        <p role="status" aria-live="polite" className="mb-4 text-sm">
          {detailMessage}
        </p>
        {customer ? (
          <>
            <dl className="mb-4 grid gap-2 border-b pb-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium">Customer status</dt>
                <dd>{String(customer.status ?? 'Unknown')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Active card</dt>
                <dd>
                  {cardStatus}
                  {cardSerial ? ` · ${cardSerial}` : ''}
                </dd>
              </div>
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1" htmlFor="manage-customer-name">
                Full name
                <Input
                  id="manage-customer-name"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-1" htmlFor="manage-customer-phone">
                Phone number
                <Input
                  id="manage-customer-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <label
                className="grid gap-1 sm:col-span-2"
                htmlFor="manage-customer-email"
              >
                Email
                <Input
                  id="manage-customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                loading={busy}
                onClick={() => void saveProfile()}
              >
                Save profile
              </Button>
              <label className="grid gap-1" htmlFor="customer-status">
                Customer status
                <select
                  id="customer-status"
                  className="sc-input"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as UpdateCustomerStatusDtoStatus,
                    )
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label
                className="grid gap-1"
                htmlFor="customer-status-confirmation"
              >
                Type UPDATE to confirm
                <input
                  id="customer-status-confirmation"
                  className="sc-input"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                loading={busy}
                onClick={() => void changeStatus()}
              >
                Update customer status
              </Button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
