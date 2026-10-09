'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  customersControllerGetCustomerProfileProjectionV1,
  type CustomersControllerGetCustomerProfileProjectionV1200Data,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money } from '../shopcity';
import { resolveCustomerCardNumber } from '../../lib/customer-card-number';
import { Button, Dialog, Input } from '../ui';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';

function ProfileMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <article className="supervisor-profile-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function profileText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function profileDate(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString()
    : 'Date not provided';
}

function profileCalendarDate(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)
  ) {
    return 'Date not provided';
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? 'Date not provided'
    : date.toLocaleDateString(undefined, { timeZone: 'UTC' });
}

function profileEventLabel(value: unknown, targetType?: unknown): string {
  const approvalKind =
    targetType === 'EARN'
      ? 'purchase credit'
      : targetType === 'REDEEM'
        ? 'redemption credit'
        : 'credit';
  if (value === 'APPROVAL_REQUEST') return `${approvalKind} approval requested`;
  if (value === 'APPROVAL_OUTCOME') return `${approvalKind} approval decision`;
  if (value === 'APPROVAL_EXPIRED') return `${approvalKind} approval expired`;
  const labels: Record<string, string> = {
    EARNING: 'Credit earned',
    REDEMPTION: 'Credit redeemed',
    CUSTOMER_STATUS: 'Customer status changed',
    CARD_STATUS: 'Card status changed',
    CARD_ISSUED: 'Virtual card issued',
    WALLET_ADJUSTMENT: 'Wallet adjustment',
  };
  return typeof value === 'string'
    ? (labels[value] ?? 'Profile activity')
    : 'Profile activity';
}

function ProfileDataError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="supervisor-profile-source-error">
      <p>{message}</p>
      <Button type="button" variant="secondary" onClick={onRetry}>
        Retry this section
      </Button>
    </div>
  );
}

function ProfileRows({
  title,
  rows,
  kind,
  failed,
  onRetry,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  kind: 'transaction' | 'ledger' | 'redemption';
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="supervisor-profile-activity" aria-label={title}>
      <h3>{title}</h3>
      {failed ? (
        <ProfileDataError
          message={`${title} could not be loaded.`}
          onRetry={onRetry}
        />
      ) : rows.length ? (
        rows.map((row, index) => {
          const amount =
            kind === 'transaction'
              ? row.purchaseAmountKobo
              : kind === 'redemption'
                ? (row.confirmedAmountKobo ?? row.requestedAmountKobo)
                : row.amountKobo;
          const date =
            kind === 'ledger'
              ? row.effectiveAt
              : (row.occurredAt ?? row.requestedAt);
          const status =
            kind === 'transaction'
              ? `${profileText(row.captureStatus, 'Capture status not provided')} / ${profileText(row.reviewStatus, 'Review status not provided')}`
              : profileText(row.status ?? row.type, 'Status not provided');
          return (
            <div
              key={profileText(row.id, `${kind}-${index}`)}
              className="supervisor-profile-activity__row"
            >
              <span>
                {profileText(
                  row.type ?? row.targetType,
                  kind === 'transaction' ? 'Receipt' : title,
                )}
              </span>
              <span>{status}</span>
              {typeof amount === 'number' ? (
                <Money amountKobo={amount} />
              ) : (
                <span>Amount not provided</span>
              )}
              <time>{profileDate(date)}</time>
            </div>
          );
        })
      ) : (
        <p>No {title.toLowerCase()} were returned.</p>
      )}
    </section>
  );
}

function ExpirySchedule({
  entries,
  failed,
  onRetry,
}: {
  entries: Array<[string, number]>;
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <section
      className="supervisor-profile-activity"
      aria-labelledby="profile-expiry-title"
    >
      <h3 id="profile-expiry-title">Credit expiry schedule</h3>
      {failed ? (
        <ProfileDataError
          message="Credit expiry data could not be loaded."
          onRetry={onRetry}
        />
      ) : entries.length ? (
        entries.map(([expiresAt, amount]) => (
          <div key={expiresAt} className="supervisor-profile-activity__row">
            <time>{profileCalendarDate(expiresAt)}</time>
            <Money amountKobo={amount} />
          </div>
        ))
      ) : (
        <p>No upcoming expiry was returned.</p>
      )}
      <p>
        Upcoming positive remaining-credit lots; schedule is limited to the next
        12 entries.
      </p>
    </section>
  );
}

export type SupervisorCustomerRecord = Record<string, unknown> & {
  id?: string;
  fullName?: string;
  phoneE164?: string;
  email?: string;
  status?: string;
  activeCardStatus?: string;
  cardNumber?: string | null;
  virtualCardNumber?: string | null;
  cardSerialNumber?: string | null;
  activeCardSerialNumber?: string | null;
  activeCard?: unknown;
};

export type CustomerProfileValues = Readonly<{
  fullName: string;
  phone: string;
  email: string;
}>;

export function CustomerDetailsDialog({
  open,
  customer,
  profile,
  profileDirty,
  loading,
  loadFailed,
  busy,
  message,
  status,
  confirmation,
  statusEditorOpen,
  onProfileChange,
  onConfirmationChange,
  onStatusChange,
  onOpenStatusEditor,
  onCancelStatusEditor,
  onRetry,
  onSave,
  onChangeStatus,
  onClose,
  presentation = 'dialog',
}: Readonly<{
  open: boolean;
  customer: SupervisorCustomerRecord | null;
  profile: CustomerProfileValues;
  profileDirty: boolean;
  loading: boolean;
  loadFailed: boolean;
  busy: boolean;
  message: string;
  status: 'ACTIVE' | 'BLOCKED';
  confirmation: string;
  statusEditorOpen: boolean;
  onProfileChange: (field: keyof CustomerProfileValues, value: string) => void;
  onConfirmationChange: (value: string) => void;
  onStatusChange: (status: 'ACTIVE' | 'BLOCKED') => void;
  onOpenStatusEditor: () => void;
  onCancelStatusEditor: () => void;
  onRetry: () => void;
  onSave: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
  presentation?: 'dialog' | 'page';
}>) {
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [profileTab, setProfileTab] = useState('Overview');
  const [projection, setProjection] =
    useState<CustomersControllerGetCustomerProfileProjectionV1200Data | null>(
      null,
    );
  const [projectionState, setProjectionState] = useState<
    'loading' | 'loaded' | 'error'
  >('loading');
  const [projectionAttempt, setProjectionAttempt] = useState(0);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const activeCard =
    customer?.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const cardStatus = customer?.activeCardStatus ?? activeCard?.status;
  const cardNumber = resolveCustomerCardNumber(customer);
  const groupedExpirySchedule = useMemo(() => {
    const grouped = new Map<string, number>();
    projection?.expirySchedule.forEach((entry) => {
      if (
        typeof entry.expiresAt !== 'string' ||
        typeof entry.remainingAmountKobo !== 'number' ||
        entry.remainingAmountKobo <= 0
      )
        return;
      const expiryDate = entry.expiresAt.slice(0, 10);
      grouped.set(
        expiryDate,
        (grouped.get(expiryDate) ?? 0) + entry.remainingAmountKobo,
      );
    });
    return [...grouped.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [projection]);
  const sourceFailed = (source: string) =>
    (projection?.sourceErrors as readonly string[] | undefined)?.includes(
      source,
    ) ?? false;
  const retryProfileProjection = () =>
    setProjectionAttempt((attempt) => attempt + 1);
  const tabNames = [
    'Overview',
    'Transactions',
    'Wallet Ledger',
    'Redemptions',
    'Virtual Card',
    'Consent',
  ];
  const cardStatusLabel =
    cardStatus === 'ACTIVE'
      ? 'Active card'
      : cardStatus === 'BLOCKED'
        ? 'Blocked card'
        : 'Card status not included';
  const expectedConfirmation = status === 'BLOCKED' ? 'BLOCK' : 'ACTIVATE';
  const hasPendingEdits =
    profileDirty || statusEditorOpen || Boolean(confirmation.trim());

  useEffect(() => {
    if (discardPrompt) keepEditingRef.current?.focus();
  }, [discardPrompt]);

  useEffect(() => {
    setDiscardPrompt(false);
    setProfileTab('Overview');
  }, [customer?.id, open]);

  useEffect(() => {
    if (presentation !== 'page' || !customer?.id) return;
    let active = true;
    setProjection(null);
    setProjectionState('loading');
    void customersControllerGetCustomerProfileProjectionV1(
      customer.id,
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        if (
          response.status !== 200 ||
          response.data.data.customerId !== customer.id
        ) {
          setProjectionState('error');
          return;
        }
        setProjection(response.data.data);
        setProjectionState('loaded');
      })
      .catch(() => {
        if (active) setProjectionState('error');
      });
    return () => {
      active = false;
    };
  }, [customer?.id, presentation, projectionAttempt]);

  useEffect(() => {
    if (!profileDirty || presentation !== 'page') return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [presentation, profileDirty]);

  function requestClose() {
    if (busy) return;
    if (hasPendingEdits) {
      setDiscardPrompt(true);
      return;
    }
    onClose();
  }

  function discardChanges() {
    setDiscardPrompt(false);
    onClose();
  }

  function keepEditing() {
    setDiscardPrompt(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy && !loading && profileDirty) onSave();
  }

  const content = (
    <div
      className={`sc-customer-details ${presentation === 'page' ? 'sc-customer-details--page' : ''}`}
    >
      <button
        type="button"
        aria-label="Close customer details"
        className="sc-customer-details__close"
        disabled={busy}
        onClick={requestClose}
      >
        <span aria-hidden="true">×</span>
      </button>

      {presentation === 'page' ? (
        <button
          type="button"
          className="supervisor-customer-profile__back"
          disabled={busy}
          onClick={requestClose}
        >
          ← Back to customers
        </button>
      ) : null}

      {discardPrompt ? (
        <section
          className="sc-customer-details__discard"
          aria-labelledby="customer-discard-title"
          aria-describedby="customer-discard-description"
        >
          <h2 id="customer-discard-title">Discard unsaved changes?</h2>
          <p id="customer-discard-description">
            Your edits haven&apos;t been saved.
          </p>
          <div className="sc-customer-details__actions">
            <Button
              ref={keepEditingRef}
              type="button"
              variant="secondary"
              onClick={keepEditing}
            >
              Keep editing
            </Button>
            <Button type="button" variant="danger" onClick={discardChanges}>
              Discard
            </Button>
          </div>
        </section>
      ) : (
        <>
          {customer ? (
            <>
              <header className="sc-customer-details__identity">
                <div className="min-w-0">
                  <h2>{String(customer.fullName ?? 'Customer')}</h2>
                  <p>{String(customer.phoneE164 ?? 'Phone not provided')}</p>
                  {presentation === 'page' ? (
                    <p>
                      Member since{' '}
                      {profileDate(
                        projection?.memberSince ?? customer.createdAt,
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="sc-customer-details__badges">
                  <div>
                    <span>Customer</span>
                    <SupervisorCustomerStatusBadge
                      status={customer.status}
                      fallback="Status not provided"
                    />
                  </div>
                  <div>
                    <span>Linked card</span>
                    <span className="sc-customer-details__card-status">
                      {cardStatusLabel}
                    </span>
                  </div>
                </div>
              </header>

              {presentation === 'page' ? (
                <>
                  <div
                    className="supervisor-profile-summary"
                    aria-label="Customer account summary"
                  >
                    <ProfileMetric
                      label="Available balance"
                      value={
                        typeof customer.availableBalanceKobo === 'number' ? (
                          <Money amountKobo={customer.availableBalanceKobo} />
                        ) : (
                          'Not provided'
                        )
                      }
                    />
                    <ProfileMetric
                      label="Pending approvals"
                      value={
                        projectionState === 'loading'
                          ? 'Loading'
                          : sourceFailed('pendingApprovals') ||
                              projection?.pendingApprovalsCount == null
                            ? 'Unavailable'
                            : projection.pendingApprovalsCount
                      }
                    />
                    <ProfileMetric
                      label="Lifetime earned"
                      value={
                        sourceFailed('lifetimeEarned') ? (
                          'Unavailable'
                        ) : projection?.lifetimeEarnedKobo != null ? (
                          <Money amountKobo={projection.lifetimeEarnedKobo} />
                        ) : projectionState === 'loading' ? (
                          'Loading'
                        ) : (
                          'Unavailable'
                        )
                      }
                    />
                    <ProfileMetric
                      label="Next expiry"
                      value={
                        sourceFailed('expirySchedule') ? (
                          'Unavailable'
                        ) : groupedExpirySchedule[0] ? (
                          <>
                            {profileCalendarDate(groupedExpirySchedule[0][0])} ·{' '}
                            <Money amountKobo={groupedExpirySchedule[0][1]} />
                          </>
                        ) : projectionState === 'loading' ? (
                          'Loading'
                        ) : projectionState === 'error' ? (
                          'Unavailable'
                        ) : (
                          'No upcoming expiry returned'
                        )
                      }
                    />
                  </div>
                  <nav
                    className="supervisor-profile-tabs"
                    aria-label="Customer profile sections"
                  >
                    {tabNames.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        aria-current={profileTab === tab ? 'page' : undefined}
                        onClick={() => setProfileTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                  <div className="supervisor-profile-actions">
                    <Link
                      href={`/cashier/earn${cardNumber ? `?card=${encodeURIComponent(cardNumber)}` : ''}`}
                    >
                      Capture purchase
                    </Link>
                    <Link
                      href={`/cashier/redeem${cardNumber ? `?card=${encodeURIComponent(cardNumber)}` : ''}`}
                    >
                      Redeem Credit
                    </Link>
                  </div>
                  {projectionState === 'loading' ? (
                    <section
                      className="supervisor-profile-activity"
                      role="status"
                    >
                      Loading customer profile activity…
                    </section>
                  ) : projectionState === 'error' ? (
                    <section
                      className="supervisor-profile-activity"
                      role="alert"
                    >
                      <p>
                        Customer profile data could not be loaded or verified.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={retryProfileProjection}
                      >
                        Retry profile data
                      </Button>
                    </section>
                  ) : profileTab === 'Overview' ? (
                    <div className="supervisor-profile-overview-grid">
                      <section
                        className="supervisor-profile-activity"
                        aria-labelledby="profile-activity-title"
                      >
                        <h3 id="profile-activity-title">Recent activity</h3>
                        {[
                          'walletLedger',
                          'redemptions',
                          'approvals',
                          'statusEvents',
                          'card',
                        ].some(sourceFailed) ? (
                          <ProfileDataError
                            message="Some recent activity sources could not be loaded."
                            onRetry={retryProfileProjection}
                          />
                        ) : null}
                        {projection?.recentActivity.length ? (
                          projection.recentActivity.map((item, index) => (
                            <div
                              key={profileText(item.id, `activity-${index}`)}
                              className="supervisor-profile-activity__row"
                            >
                              <span>
                                {profileEventLabel(item.type, item.targetType)}
                              </span>
                              <span>
                                {profileText(
                                  item.status,
                                  'Status not provided',
                                )}
                              </span>
                              {typeof item.amountKobo === 'number' ? (
                                <Money amountKobo={item.amountKobo} />
                              ) : null}
                              <time>{profileDate(item.occurredAt)}</time>
                            </div>
                          ))
                        ) : ![
                            'walletLedger',
                            'redemptions',
                            'approvals',
                            'statusEvents',
                            'card',
                          ].some(sourceFailed) ? (
                          <p>No recent customer activity was returned.</p>
                        ) : null}
                      </section>
                      <ExpirySchedule
                        entries={groupedExpirySchedule}
                        failed={sourceFailed('expirySchedule')}
                        onRetry={retryProfileProjection}
                      />
                    </div>
                  ) : profileTab === 'Transactions' ? (
                    <ProfileRows
                      title="Transactions"
                      rows={projection?.transactions ?? []}
                      kind="transaction"
                      failed={sourceFailed('transactions')}
                      onRetry={retryProfileProjection}
                    />
                  ) : profileTab === 'Wallet Ledger' ? (
                    <ProfileRows
                      title="Wallet ledger"
                      rows={projection?.walletLedger ?? []}
                      kind="ledger"
                      failed={sourceFailed('walletLedger')}
                      onRetry={retryProfileProjection}
                    />
                  ) : profileTab === 'Redemptions' ? (
                    <ProfileRows
                      title="Redemptions"
                      rows={projection?.redemptions ?? []}
                      kind="redemption"
                      failed={sourceFailed('redemptions')}
                      onRetry={retryProfileProjection}
                    />
                  ) : profileTab === 'Virtual Card' ? (
                    <section
                      className="supervisor-profile-card"
                      aria-label="Virtual card"
                    >
                      <h3>Virtual card</h3>
                      {sourceFailed('card') ? (
                        <ProfileDataError
                          message="Card details could not be loaded."
                          onRetry={retryProfileProjection}
                        />
                      ) : projection?.card ? (
                        <>
                          <p>
                            Card{' '}
                            {profileText(
                              projection.card.identifier,
                              'Identifier not provided',
                            )}
                          </p>
                          <p>
                            Status:{' '}
                            {profileText(
                              projection.card.status,
                              'Not provided',
                            )}
                          </p>
                          <p>Issued {profileDate(projection.card.issuedAt)}</p>
                          {projection.card.blockedAt ? (
                            <p>
                              Blocked {profileDate(projection.card.blockedAt)}
                            </p>
                          ) : null}
                          <Link
                            href={`/supervisor/cards?customerId=${encodeURIComponent(String(customer.id ?? ''))}`}
                          >
                            Manage cards
                          </Link>
                        </>
                      ) : (
                        <p>No assigned card was provided.</p>
                      )}
                    </section>
                  ) : (
                    <section
                      className="supervisor-profile-card"
                      aria-labelledby="profile-consent-title"
                    >
                      <h3 id="profile-consent-title">Consent</h3>
                      {sourceFailed('consent') ? (
                        <ProfileDataError
                          message="Consent details could not be loaded."
                          onRetry={retryProfileProjection}
                        />
                      ) : projection?.consent ? (
                        <dl>
                          <dt>Loyalty service consent</dt>
                          <dd>
                            {projection.consent.loyaltyConsent
                              ? 'Granted'
                              : 'Not granted'}
                          </dd>
                          <dt>Marketing opt-in</dt>
                          <dd>
                            {projection.consent.marketingOptIn
                              ? 'Opted in'
                              : 'Not opted in'}
                          </dd>
                          <dt>Captured</dt>
                          <dd>{profileDate(projection.consent.capturedAt)}</dd>
                          <dt>Consent version</dt>
                          <dd>
                            {profileText(
                              projection.consent.consentVersion,
                              'Not provided',
                            )}
                          </dd>
                        </dl>
                      ) : (
                        <p>No consent record was returned.</p>
                      )}
                    </section>
                  )}
                </>
              ) : null}

              {message ? (
                <p role="status" aria-live="polite" className="text-sm">
                  {message}
                </p>
              ) : null}
              {loadFailed ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || loading}
                  onClick={onRetry}
                >
                  Retry customer details
                </Button>
              ) : null}

              <form
                className="sc-customer-details__form"
                onSubmit={submitProfile}
              >
                <section
                  className="sc-customer-details__section"
                  aria-labelledby="customer-profile-heading"
                >
                  <h3 id="customer-profile-heading">Profile</h3>
                  <div className="sc-customer-details__fields">
                    <label htmlFor="manage-customer-name">
                      Full name
                      <Input
                        ref={nameRef}
                        id="manage-customer-name"
                        required
                        disabled={busy || loading}
                        value={profile.fullName}
                        onChange={(event) =>
                          onProfileChange('fullName', event.target.value)
                        }
                      />
                    </label>
                    <label htmlFor="manage-customer-phone">
                      Phone number
                      <Input
                        id="manage-customer-phone"
                        type="tel"
                        required
                        disabled={busy || loading}
                        value={profile.phone}
                        onChange={(event) =>
                          onProfileChange('phone', event.target.value)
                        }
                      />
                    </label>
                    <label
                      className="sc-customer-details__email"
                      htmlFor="manage-customer-email"
                    >
                      Email
                      <Input
                        id="manage-customer-email"
                        type="email"
                        disabled={busy || loading}
                        value={profile.email}
                        onChange={(event) =>
                          onProfileChange('email', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </section>

                <section
                  className="sc-customer-details__section sc-customer-details__account"
                  aria-labelledby="customer-account-status-heading"
                >
                  <div className="sc-customer-details__section-heading">
                    <div>
                      <h3 id="customer-account-status-heading">
                        Account status
                      </h3>
                      <p>Manage whether this customer can use ShopCity.</p>
                    </div>
                    <SupervisorCustomerStatusBadge
                      status={customer.status}
                      fallback="Status not provided"
                    />
                  </div>
                  {statusEditorOpen ? (
                    <div className="sc-customer-details__status-editor">
                      <label htmlFor="customer-status">
                        New status
                        <select
                          id="customer-status"
                          className="sc-control sc-input"
                          disabled={busy || loading || profileDirty}
                          value={status}
                          onChange={(event) =>
                            onStatusChange(
                              event.target.value as 'ACTIVE' | 'BLOCKED',
                            )
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </label>
                      <label htmlFor="customer-status-confirmation">
                        Type {expectedConfirmation} to confirm
                        <input
                          id="customer-status-confirmation"
                          className="sc-control sc-input"
                          disabled={busy || loading || profileDirty}
                          value={confirmation}
                          onChange={(event) =>
                            onConfirmationChange(event.target.value)
                          }
                        />
                      </label>
                      {profileDirty ? (
                        <p>
                          Save or discard profile edits before changing account
                          status.
                        </p>
                      ) : null}
                      <div className="sc-customer-details__actions">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy || loading}
                          onClick={onCancelStatusEditor}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant={status === 'BLOCKED' ? 'danger' : 'primary'}
                          loading={busy}
                          disabled={
                            loading ||
                            profileDirty ||
                            status === customer.status ||
                            confirmation.trim().toUpperCase() !==
                              expectedConfirmation
                          }
                          onClick={onChangeStatus}
                        >
                          {status === 'BLOCKED'
                            ? 'Block customer'
                            : 'Activate customer'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        Change status only when the customer account needs to be
                        blocked or restored.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || loading || profileDirty}
                        onClick={onOpenStatusEditor}
                      >
                        Change status
                      </Button>
                      {profileDirty ? (
                        <p className="text-sm">
                          Save or discard profile edits before changing account
                          status.
                        </p>
                      ) : null}
                    </>
                  )}
                </section>

                <section
                  className="sc-customer-details__section sc-customer-details__linked-card"
                  aria-labelledby="customer-linked-card-heading"
                >
                  <h3 id="customer-linked-card-heading">Linked card</h3>
                  {cardNumber ? (
                    <p>Card ending {cardNumber.replace(/\W/g, '').slice(-4)}</p>
                  ) : (
                    <p>Card number not provided.</p>
                  )}
                  {customer.id ? (
                    <Link
                      className="sc-customer-details__card-link"
                      href={`/supervisor/cards?tab=assign&id=${encodeURIComponent(customer.id)}`}
                    >
                      Manage linked card →
                    </Link>
                  ) : null}
                </section>

                <footer className="sc-customer-details__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={requestClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={busy}
                    disabled={loading || !profileDirty}
                  >
                    Save changes
                  </Button>
                </footer>
              </form>
            </>
          ) : (
            <section className="sc-customer-details__load-state">
              <p role="status" aria-live="polite">
                {loading
                  ? 'Loading customer details…'
                  : message || 'Customer details could not be loaded.'}
              </p>
              {loadFailed ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || loading}
                  onClick={onRetry}
                >
                  Retry customer details
                </Button>
              ) : null}
              <div className="sc-customer-details__actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
  if (!open) return null;
  return presentation === 'page' ? (
    <section aria-label="Customer details">{content}</section>
  ) : (
    <Dialog open title="Customer details" onClose={requestClose}>
      {content}
    </Dialog>
  );
}
