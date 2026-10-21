'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  customersControllerGetCustomerProfileProjectionV1,
  loyaltyControllerGetCustomerLedgerV1,
  reportsControllerListCashierTodayV1,
  type CustomersControllerGetCustomerProfileProjectionV1200Data,
  type LoyaltyControllerGetCustomerLedgerV1200DataItemsItem,
  type LoyaltyControllerGetCustomerLedgerV1Params,
  type ReportsControllerListCashierTodayV1200DataItemsItem,
  type ReportsControllerListCashierTodayV1Params,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Money } from '../shopcity';
import { resolveCustomerCardNumber } from '../../lib/customer-card-number';
import { Button, Dialog, Input } from '../ui';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';
import { SupervisorVirtualCardPreview } from './supervisor-virtual-card-preview';
import { SupervisorCardManagement } from './supervisor-card-management';
import { TransactionCreditBreakdown } from './transaction-credit-breakdown';

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
      <strong className={typeof value === 'string' ? 'is-textual' : undefined}>
        {value}
      </strong>
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

function profileDateOnly(value: unknown): string {
  if (typeof value !== 'string') return 'Date not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function profileDateTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return 'Not provided';
  }
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function profileValue(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : 'Not provided';
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

function walletLedgerExpiryDate(value: unknown): string {
  if (typeof value !== 'string') return 'Not provided';
  const calendarDate = value.slice(0, 10);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(calendarDate)) {
    return 'Not provided';
  }
  const date = new Date(`${calendarDate}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== calendarDate
    ? 'Not provided'
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
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

function profileStatusLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Status not provided';
  }
  return value
    .split(/[_\s]+/)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function profileStatusTone(
  value: unknown,
): 'success' | 'pending' | 'danger' | 'neutral' {
  const status = typeof value === 'string' ? value.toUpperCase() : '';
  if (['CONFIRMED', 'APPROVED', 'ACTIVE', 'ISSUED'].includes(status)) {
    return 'success';
  }
  if (status === 'PENDING') return 'pending';
  if (['DENIED', 'REJECTED', 'FAILED', 'BLOCKED'].includes(status)) {
    return 'danger';
  }
  return 'neutral';
}

function profileActivityDate(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return 'Date not provided';
  }
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function CustomerProfileEditorLayer({
  presentation,
  open,
  onClose,
  children,
}: Readonly<{
  presentation: 'dialog' | 'page';
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  return presentation === 'page' ? (
    <Dialog open={open} title="Edit customer details" onClose={onClose}>
      {children}
    </Dialog>
  ) : (
    <>{children}</>
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

type ProfileTransactionRow =
  CustomersControllerGetCustomerProfileProjectionV1200Data['transactions'][number] & {
    receiptNumber?: string;
    operation?: 'EARN' | 'REDEEM';
    status?: string | null;
    loyaltyAmountKobo?: number | null;
    redeemedAmountKobo?: number | null;
    earnedAmountKobo?: number | null;
  };

type CashierRecentTransaction =
  ReportsControllerListCashierTodayV1200DataItemsItem;

function toProfileTransactionRow(
  row: CashierRecentTransaction,
): ProfileTransactionRow {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    occurredAt: row.occurredAt,
    purchaseAmountKobo: row.purchaseAmountKobo,
    captureStatus: row.status,
    reviewStatus: row.status,
    operation: row.operation,
    status: row.status,
    loyaltyAmountKobo: row.loyaltyAmountKobo,
    redeemedAmountKobo: row.redeemedAmountKobo,
    earnedAmountKobo: row.earnedAmountKobo,
  };
}

function CashierRecentActivity({
  rows,
  loading,
  failed,
  onRetry,
}: {
  rows: CashierRecentTransaction[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <section
      className="supervisor-profile-activity supervisor-profile-recent-activity"
      aria-labelledby="profile-activity-title"
    >
      <header className="supervisor-profile-recent-activity__header">
        <h3 id="profile-activity-title">Recent activity</h3>
        <p>Latest cashier-recorded credit activity for this customer.</p>
      </header>
      {failed ? (
        <ProfileDataError
          message="Recent activity could not be loaded."
          onRetry={onRetry}
        />
      ) : loading ? (
        <p className="supervisor-profile-recent-activity__empty">
          Loading recent activity…
        </p>
      ) : rows.length ? (
        <div className="supervisor-profile-recent-activity__list">
          {rows.map((row) => {
            const isRedemption = row.operation === 'REDEEM';
            return (
              <article
                key={row.id}
                className="supervisor-profile-recent-activity__entry"
              >
                <div className="supervisor-profile-recent-activity__copy">
                  <div className="supervisor-profile-recent-activity__title">
                    <span
                      className={`supervisor-profile-recent-activity__status supervisor-profile-recent-activity__status--${profileStatusTone(row.status)}`}
                    >
                      {profileStatusLabel(row.status)}
                    </span>
                    <h4>
                      {isRedemption ? 'Credit redeemed' : 'Credit earned'}
                    </h4>
                  </div>
                  <time
                    className="supervisor-profile-recent-activity__date"
                    dateTime={row.occurredAt}
                  >
                    {profileDateTime(row.occurredAt)}
                  </time>
                </div>
                {typeof row.loyaltyAmountKobo === 'number' ? (
                  <span className="supervisor-profile-recent-activity__amount">
                    {isRedemption ? '−' : '+'}
                    <Money
                      amountKobo={row.loyaltyAmountKobo}
                      emphasis={isRedemption ? 'negative' : 'positive'}
                    />
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="supervisor-profile-recent-activity__empty">
          No recent customer activity was returned.
        </p>
      )}
    </section>
  );
}

function ProfileTransactions({
  rows,
  failed,
  loading = false,
  onRetry,
}: {
  rows: ProfileTransactionRow[];
  failed: boolean;
  loading?: boolean;
  onRetry: () => void;
}) {
  return (
    <section
      className="supervisor-profile-activity supervisor-profile-transactions"
      aria-labelledby="profile-transactions-title"
    >
      <header className="supervisor-profile-transactions__header">
        <h3 id="profile-transactions-title">Transactions</h3>
        <p id="profile-transactions-description">
          Transaction history for this customer.
        </p>
      </header>
      {failed ? (
        <div className="supervisor-profile-transactions__message supervisor-profile-transactions__message--error">
          <ProfileDataError
            message="Transactions could not be loaded."
            onRetry={onRetry}
          />
        </div>
      ) : (
        <div className="supervisor-profile-transactions__table-wrap">
          <table
            className="supervisor-profile-transactions__table"
            aria-label="Customer transactions"
            aria-describedby="profile-transactions-description"
          >
            <thead>
              <tr>
                <th scope="col">Receipt No.</th>
                <th scope="col">Date &amp; Time</th>
                <th scope="col">Amount</th>
                <th scope="col">Credit</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="supervisor-profile-transactions__empty"
                    colSpan={5}
                  >
                    Loading recent transactions…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => {
                  const captureStatus = profileStatusLabel(row.captureStatus);
                  return (
                    <tr key={row.id}>
                      <td>{profileValue(row.receiptNumber)}</td>
                      <td>
                        <time dateTime={row.occurredAt}>
                          {profileDateTime(row.occurredAt)}
                        </time>
                      </td>
                      <td>
                        {typeof row.purchaseAmountKobo === 'number' ? (
                          <Money amountKobo={row.purchaseAmountKobo} />
                        ) : (
                          profileValue(undefined)
                        )}
                      </td>
                      <td>
                        {row.operation ? (
                          <TransactionCreditBreakdown
                            operation={row.operation}
                            status={row.status ?? row.reviewStatus}
                            loyaltyAmountKobo={row.loyaltyAmountKobo}
                            redeemedAmountKobo={row.redeemedAmountKobo}
                            earnedAmountKobo={row.earnedAmountKobo}
                          />
                        ) : (
                          profileValue(undefined)
                        )}
                      </td>
                      <td>
                        <div className="supervisor-profile-transactions__outcome">
                          <span
                            className={`supervisor-profile-recent-activity__status supervisor-profile-recent-activity__status--${profileStatusTone(row.captureStatus)}`}
                            aria-label={`Capture status: ${captureStatus}`}
                          >
                            {captureStatus}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="supervisor-profile-transactions__empty"
                    colSpan={5}
                  >
                    No transactions were returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const PROFILE_LEDGER_PAGE_LIMIT = '25';

async function getProfileWalletLedgerPage(customerId: string, cursor: string) {
  const response = await loyaltyControllerGetCustomerLedgerV1(
    customerId,
    {
      limit: PROFILE_LEDGER_PAGE_LIMIT,
      cursor,
    } satisfies LoyaltyControllerGetCustomerLedgerV1Params,
    createApiRequest({ csrf: true }),
  );
  if (response.status !== 200 || response.data.data.customerId !== customerId) {
    throw new Error('Wallet ledger response could not be verified.');
  }
  return response.data.data;
}

function walletLedgerTypeLabel(type: unknown): string {
  const labels: Record<string, string> = {
    EARN: 'Earned',
    REDEEM: 'Redeemed',
    REVERSAL: 'Reversal',
    ADJUSTMENT: 'Adjustment',
    EXPIRY: 'Expired',
  };
  return typeof type === 'string' ? (labels[type] ?? type) : 'Not provided';
}

function ProfileWalletLedger({ customerId }: { customerId: string }) {
  const [entries, setEntries] = useState<
    LoyaltyControllerGetCustomerLedgerV1200DataItemsItem[]
  >([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreFailed, setLoadingMoreFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setEntries([]);
    setNextCursor(null);
    setHasMore(false);
    setLoadingMoreFailed(false);
    void getProfileWalletLedgerPage(customerId, '')
      .then((page) => {
        if (!active) return;
        setEntries(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore && Boolean(page.nextCursor));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId, retryAttempt]);

  async function loadOlderEntries() {
    if (!nextCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadingMoreFailed(false);
    try {
      const page = await getProfileWalletLedgerPage(customerId, nextCursor);
      setEntries((current) => {
        const currentIds = new Set(current.map((entry) => entry.id));
        return [
          ...current,
          ...page.items.filter((entry) => !currentIds.has(entry.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore && Boolean(page.nextCursor));
    } catch {
      setLoadingMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section
      className="supervisor-profile-activity supervisor-profile-wallet-ledger"
      aria-labelledby="profile-wallet-ledger-title"
    >
      <header className="supervisor-profile-wallet-ledger__header">
        <h3 id="profile-wallet-ledger-title">Wallet ledger</h3>
        <p id="profile-wallet-ledger-description">
          Read-only history from this customer&apos;s wallet ledger.
        </p>
      </header>
      <span id="profile-wallet-balance-help" className="sr-only">
        A historical balance after each entry is not provided by the API.
      </span>
      <div className="supervisor-profile-wallet-ledger__table-wrap">
        <table
          className="supervisor-profile-wallet-ledger__table"
          aria-label="Customer wallet ledger"
          aria-describedby="profile-wallet-ledger-description"
        >
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Date &amp; Time</th>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
              <th scope="col" aria-describedby="profile-wallet-balance-help">
                Balance After
              </th>
              <th scope="col">Expiry</th>
              <th scope="col">Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="supervisor-profile-wallet-ledger__message"
                  colSpan={7}
                >
                  <div role="status">Loading wallet ledger…</div>
                </td>
              </tr>
            ) : failed ? (
              <tr>
                <td
                  className="supervisor-profile-wallet-ledger__message"
                  colSpan={7}
                >
                  <div role="alert">
                    <p>Wallet ledger could not be loaded.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRetryAttempt((attempt) => attempt + 1)}
                    >
                      Retry this section
                    </Button>
                  </div>
                </td>
              </tr>
            ) : entries.length ? (
              entries.map((entry) => {
                const isCredit = entry.direction === 'CREDIT';
                const signedAmount = isCredit
                  ? Math.abs(entry.amountKobo)
                  : -Math.abs(entry.amountKobo);
                const typeTone =
                  entry.status === 'INVALID'
                    ? 'danger'
                    : isCredit
                      ? 'success'
                      : 'neutral';
                return (
                  <tr key={entry.id}>
                    <td>{profileValue(entry.source)}</td>
                    <td>
                      <time dateTime={entry.effectiveAt}>
                        {profileDateTime(entry.effectiveAt)}
                      </time>
                    </td>
                    <td>
                      <span
                        className={`supervisor-profile-recent-activity__status supervisor-profile-recent-activity__status--${typeTone}`}
                      >
                        {walletLedgerTypeLabel(entry.type)}
                      </span>
                    </td>
                    <td>
                      <Money
                        amountKobo={signedAmount}
                        signed
                        emphasis={isCredit ? 'positive' : 'negative'}
                      />
                    </td>
                    <td>{profileValue(undefined)}</td>
                    <td>
                      {walletLedgerExpiryDate(entry.creditLot?.expiresAt)}
                    </td>
                    <td>{profileValue(entry.staffUsername)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  className="supervisor-profile-wallet-ledger__message"
                  colSpan={7}
                >
                  No wallet ledger entries were returned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && nextCursor ? (
        <div className="supervisor-profile-wallet-ledger__footer">
          {loadingMoreFailed ? (
            <p role="alert">Older wallet entries could not be loaded.</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={loadingMore}
            onClick={loadOlderEntries}
          >
            {loadingMore ? 'Loading older entries…' : 'Load older entries'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ExpirySchedule({
  entries,
  failed,
  onRetry,
  unavailable = false,
}: {
  entries: Array<[string, number]>;
  failed: boolean;
  onRetry: () => void;
  unavailable?: boolean;
}) {
  return (
    <section
      className="supervisor-profile-activity supervisor-profile-expiry"
      aria-labelledby="profile-expiry-title"
    >
      <h3 id="profile-expiry-title">Credit expiry schedule</h3>
      {failed ? (
        <ProfileDataError
          message="Credit expiry data could not be loaded."
          onRetry={onRetry}
        />
      ) : unavailable ? (
        <p>Expiry details are not provided in the Cashier profile.</p>
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
      {!unavailable ? (
        <p>
          Upcoming positive remaining-credit lots; schedule is limited to the
          next 12 entries.
        </p>
      ) : null}
    </section>
  );
}

export type SupervisorCustomerRecord = Record<string, unknown> & {
  id?: string;
  customerId?: string;
  fullName?: string;
  phoneE164?: string;
  maskedPhone?: string;
  email?: string;
  status?: string;
  cardStatus?: string;
  activeCardStatus?: string;
  availableBalanceKobo?: number;
  lifetimeEarnedKobo?: number;
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
  onDiscardProfileEdit,
  onChangeStatus,
  onClose,
  presentation = 'dialog',
  initialTab,
  profileAudience = 'supervisor',
  cashierCardHint,
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
  onSave: () => void | Promise<boolean>;
  onDiscardProfileEdit?: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
  presentation?: 'dialog' | 'page';
  initialTab?: string;
  profileAudience?: 'supervisor' | 'cashier';
  cashierCardHint?: string;
}>) {
  const resolvedInitialTab =
    initialTab === 'virtual-card' ? 'Virtual Card' : 'Overview';
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileEditDiscardPrompt, setProfileEditDiscardPrompt] =
    useState(false);
  const [profileTab, setProfileTab] = useState('Overview');
  const [cardManagementOpen, setCardManagementOpen] = useState(false);
  const [projection, setProjection] =
    useState<CustomersControllerGetCustomerProfileProjectionV1200Data | null>(
      null,
    );
  const [projectionState, setProjectionState] = useState<
    'loading' | 'loaded' | 'error'
  >('loading');
  const [projectionAttempt, setProjectionAttempt] = useState(0);
  const [cashierTransactions, setCashierTransactions] = useState<
    CashierRecentTransaction[]
  >([]);
  const [monthlyEarnKobo, setMonthlyEarnKobo] = useState<number | null>(null);
  const [cashierTransactionsState, setCashierTransactionsState] = useState<
    'loading' | 'loaded' | 'error'
  >('loading');
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const activeCard =
    customer?.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const isCashierProfile =
    presentation === 'page' && profileAudience === 'cashier';
  const cashierMaskedEmail =
    typeof customer?.email === 'string' && customer.email.includes('*')
      ? customer.email
      : null;
  const visibleEmail = isCashierProfile
    ? cashierMaskedEmail
    : profile.email || customer?.email;
  const cardStatus =
    customer?.activeCardStatus ?? customer?.cardStatus ?? activeCard?.status;
  const cardNumber = resolveCustomerCardNumber(customer);
  const actionCardNumber = isCashierProfile
    ? (cashierCardHint ?? cardNumber)
    : cardNumber;
  const lastPurchaseAmountKobo = cashierTransactions.find(
    (transaction) => transaction.operation === 'EARN',
  )?.purchaseAmountKobo;
  const lastAmountRedeemedKobo = cashierTransactions.find(
    (transaction) => transaction.operation === 'REDEEM',
  )?.loyaltyAmountKobo;
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
    ...(isCashierProfile ? [] : ['Redemptions']),
    'Virtual Card',
    ...(isCashierProfile ? [] : ['Consent']),
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
    if (discardPrompt || profileEditDiscardPrompt) {
      keepEditingRef.current?.focus();
    }
  }, [discardPrompt, profileEditDiscardPrompt]);

  useEffect(() => {
    setDiscardPrompt(false);
    setProfileTab(customer?.id ? resolvedInitialTab : 'Overview');
    setCardManagementOpen(false);
  }, [customer?.id, open, resolvedInitialTab]);

  useEffect(() => {
    if (presentation !== 'page' || !customer?.id) return;
    setProjection(null);
    if (profileAudience === 'cashier') {
      let active = true;
      setProjectionState('loaded');
      setCashierTransactions([]);
      setMonthlyEarnKobo(null);
      setCashierTransactionsState('loading');
      void reportsControllerListCashierTodayV1(
        {
          customerId: customer.id,
          limit: 10,
        } satisfies ReportsControllerListCashierTodayV1Params,
        createApiRequest({ csrf: true }),
      )
        .then((response) => {
          if (!active) return;
          if (response.status !== 200) {
            setCashierTransactionsState('error');
            return;
          }
          setCashierTransactions(response.data.data.items);
          setMonthlyEarnKobo(response.data.data.monthlyEarnKobo);
          setCashierTransactionsState('loaded');
        })
        .catch(() => {
          if (active) setCashierTransactionsState('error');
        });
      return () => {
        active = false;
      };
    }
    let active = true;
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
  }, [customer?.id, presentation, profileAudience, projectionAttempt]);

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

  function requestProfileEditorClose() {
    if (busy) return;
    if (hasPendingEdits) {
      setProfileEditDiscardPrompt(true);
      return;
    }
    setProfileEditorOpen(false);
  }

  function keepProfileEditing() {
    setProfileEditDiscardPrompt(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function discardProfileEdits() {
    setProfileEditDiscardPrompt(false);
    if (statusEditorOpen) onCancelStatusEditor();
    onDiscardProfileEdit?.();
    setProfileEditorOpen(false);
  }

  function discardChanges() {
    setDiscardPrompt(false);
    onClose();
  }

  function keepEditing() {
    setDiscardPrompt(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading || !profileDirty) return;
    const saved = await onSave();
    if (presentation === 'page' && saved === true) {
      setProfileEditDiscardPrompt(false);
      setProfileEditorOpen(false);
    }
  }

  const hasProfileOverviewLayout =
    presentation === 'page' && profileTab === 'Overview' && !discardPrompt;
  const content = (
    <div
      className={`sc-customer-details ${presentation === 'page' ? 'sc-customer-details--page' : ''} ${hasProfileOverviewLayout ? 'supervisor-profile-overview-layout' : ''}`}
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
              <header
                className={`sc-customer-details__identity ${presentation === 'page' ? 'supervisor-profile-header' : ''}`}
              >
                <div className="min-w-0">
                  {presentation === 'page' ? (
                    <div className="supervisor-profile-header__customer">
                      <h1>{String(customer.fullName ?? 'Customer')}</h1>
                      {!isCashierProfile ? (
                        <SupervisorCustomerStatusBadge
                          status={customer.status}
                          fallback="Status not provided"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <h2>{String(customer.fullName ?? 'Customer')}</h2>
                  )}
                  {presentation === 'page' ? (
                    !isCashierProfile ? (
                      <p>
                        Member since{' '}
                        {profileDateOnly(
                          projection?.memberSince ?? customer.createdAt,
                        )}
                      </p>
                    ) : null
                  ) : (
                    <p>{String(customer.phoneE164 ?? 'Phone not provided')}</p>
                  )}
                </div>
                {presentation === 'page' ? (
                  <div className="supervisor-profile-actions">
                    <Link
                      className="supervisor-profile-action--primary"
                      href={`/cashier/earn${actionCardNumber ? `?card=${encodeURIComponent(actionCardNumber)}` : ''}`}
                    >
                      Capture Purchase
                    </Link>
                    <Link
                      className="supervisor-profile-action--secondary"
                      href={`/cashier/redeem${actionCardNumber ? `?card=${encodeURIComponent(actionCardNumber)}` : ''}`}
                    >
                      Redeem Credit
                    </Link>
                  </div>
                ) : (
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
                )}
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
                      label={
                        isCashierProfile
                          ? 'Last purchase amount'
                          : 'Pending approvals'
                      }
                      value={
                        isCashierProfile ? (
                          typeof lastPurchaseAmountKobo === 'number' ? (
                            <Money amountKobo={lastPurchaseAmountKobo} />
                          ) : (
                            'Not provided'
                          )
                        ) : projectionState === 'loading' ? (
                          'Loading'
                        ) : sourceFailed('pendingApprovals') ||
                          projection?.pendingApprovalsCount == null ? (
                          'Unavailable'
                        ) : (
                          projection.pendingApprovalsCount
                        )
                      }
                    />
                    <ProfileMetric
                      label={
                        isCashierProfile
                          ? 'Total monthly Earn'
                          : 'Lifetime earned'
                      }
                      value={
                        isCashierProfile ? (
                          typeof monthlyEarnKobo === 'number' ? (
                            <Money amountKobo={monthlyEarnKobo} />
                          ) : (
                            'Not provided'
                          )
                        ) : sourceFailed('lifetimeEarned') ? (
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
                      label={
                        isCashierProfile
                          ? 'Last amount redeemed'
                          : 'Annual Purchases'
                      }
                      value={
                        isCashierProfile ? (
                          typeof lastAmountRedeemedKobo === 'number' ? (
                            <Money amountKobo={lastAmountRedeemedKobo} />
                          ) : (
                            'Not provided'
                          )
                        ) : (
                          'Not provided'
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
                      {isCashierProfile ? (
                        <CashierRecentActivity
                          rows={cashierTransactions}
                          loading={cashierTransactionsState === 'loading'}
                          failed={cashierTransactionsState === 'error'}
                          onRetry={retryProfileProjection}
                        />
                      ) : (
                        <section
                          className="supervisor-profile-activity supervisor-profile-recent-activity"
                          aria-labelledby="profile-activity-title"
                        >
                          <header className="supervisor-profile-recent-activity__header">
                            <h3 id="profile-activity-title">Recent activity</h3>
                            <p>
                              {isCashierProfile
                                ? 'Activity details are not provided in the Cashier profile.'
                                : 'Latest account events and credit movements.'}
                            </p>
                          </header>
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
                            <div className="supervisor-profile-recent-activity__list">
                              {projection.recentActivity.map((item, index) => {
                                const isEarning = item.type === 'EARNING';
                                const isRedemption = item.type === 'REDEMPTION';
                                const statusTone = profileStatusTone(
                                  item.status,
                                );
                                const amountEmphasis = isRedemption
                                  ? 'negative'
                                  : typeof item.amountKobo === 'number' &&
                                      item.amountKobo > 0
                                    ? 'positive'
                                    : typeof item.amountKobo === 'number' &&
                                        item.amountKobo < 0
                                      ? 'negative'
                                      : 'normal';
                                return (
                                  <article
                                    key={profileText(
                                      item.id,
                                      `activity-${index}`,
                                    )}
                                    className="supervisor-profile-recent-activity__entry"
                                  >
                                    <div className="supervisor-profile-recent-activity__copy">
                                      <div className="supervisor-profile-recent-activity__title">
                                        <span
                                          className={`supervisor-profile-recent-activity__status supervisor-profile-recent-activity__status--${statusTone}`}
                                        >
                                          {profileStatusLabel(item.status)}
                                        </span>
                                        <h4>
                                          {profileEventLabel(
                                            item.type,
                                            item.targetType,
                                          )}
                                        </h4>
                                      </div>
                                      <time
                                        className="supervisor-profile-recent-activity__date"
                                        dateTime={
                                          typeof item.occurredAt === 'string'
                                            ? item.occurredAt
                                            : undefined
                                        }
                                      >
                                        {profileActivityDate(item.occurredAt)}
                                      </time>
                                    </div>
                                    {typeof item.amountKobo === 'number' ? (
                                      <span className="supervisor-profile-recent-activity__amount">
                                        {isRedemption && item.amountKobo > 0 ? (
                                          <span aria-hidden="true">−</span>
                                        ) : null}
                                        <Money
                                          amountKobo={item.amountKobo}
                                          signed={isEarning}
                                          emphasis={amountEmphasis}
                                        />
                                      </span>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                          ) : !isCashierProfile &&
                            ![
                              'walletLedger',
                              'redemptions',
                              'approvals',
                              'statusEvents',
                              'card',
                            ].some(sourceFailed) ? (
                            <p className="supervisor-profile-recent-activity__empty">
                              No recent customer activity was returned.
                            </p>
                          ) : null}
                        </section>
                      )}
                      {!isCashierProfile ? (
                        <ExpirySchedule
                          entries={groupedExpirySchedule}
                          failed={sourceFailed('expirySchedule')}
                          onRetry={retryProfileProjection}
                        />
                      ) : null}
                    </div>
                  ) : profileTab === 'Transactions' ? (
                    <ProfileTransactions
                      rows={
                        isCashierProfile
                          ? cashierTransactions
                              .slice(0, 3)
                              .map(toProfileTransactionRow)
                          : (projection?.transactions ?? [])
                      }
                      loading={
                        isCashierProfile &&
                        cashierTransactionsState === 'loading'
                      }
                      failed={
                        isCashierProfile
                          ? cashierTransactionsState === 'error'
                          : sourceFailed('transactions')
                      }
                      onRetry={retryProfileProjection}
                    />
                  ) : profileTab === 'Wallet Ledger' ? (
                    typeof customer.id === 'string' && customer.id ? (
                      <ProfileWalletLedger customerId={customer.id} />
                    ) : (
                      <section
                        className="supervisor-profile-activity"
                        role="alert"
                      >
                        <p>Customer identity could not be verified.</p>
                      </section>
                    )
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
                      {isCashierProfile ? (
                        <>
                          <SupervisorVirtualCardPreview
                            customerName={profileValue(customer.fullName)}
                            serialNumber={actionCardNumber ?? ''}
                            status={profileText(cardStatus, 'Not provided')}
                          />
                          <p>
                            Status: {profileText(cardStatus, 'Not provided')}
                          </p>
                        </>
                      ) : sourceFailed('card') ? (
                        <ProfileDataError
                          message="Card details could not be loaded."
                          onRetry={retryProfileProjection}
                        />
                      ) : projection?.card ? (
                        <>
                          <SupervisorVirtualCardPreview
                            customerName={profileValue(customer.fullName)}
                            serialNumber={profileValue(
                              projection.card.identifier,
                            )}
                            status={profileValue(projection.card.status)}
                          />
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
                          <Button
                            type="button"
                            onClick={() => setCardManagementOpen(true)}
                          >
                            Manage card
                          </Button>
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
                      {isCashierProfile ? (
                        <p>
                          Consent details are not provided in the Cashier
                          profile.
                        </p>
                      ) : sourceFailed('consent') ? (
                        <ProfileDataError
                          message="Consent details could not be loaded."
                          onRetry={retryProfileProjection}
                        />
                      ) : projection?.consent ? (
                        <dl className="supervisor-profile-consent-grid">
                          <div>
                            <dt>Loyalty service consent</dt>
                            <dd>
                              {projection.consent.loyaltyConsent
                                ? 'Granted'
                                : 'Not granted'}
                            </dd>
                          </div>
                          <div>
                            <dt>Marketing opt-in</dt>
                            <dd>
                              {projection.consent.marketingOptIn
                                ? 'Opted in'
                                : 'Not opted in'}
                            </dd>
                          </div>
                          <div>
                            <dt>Captured</dt>
                            <dd>
                              {profileDate(projection.consent.capturedAt)}
                            </dd>
                          </div>
                          <div>
                            <dt>Consent version</dt>
                            <dd>
                              {profileText(
                                projection.consent.consentVersion,
                                'Not provided',
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Privacy notice version</dt>
                            <dd>
                              {profileText(
                                projection.consent.privacyNoticeVersion,
                                'Not provided',
                              )}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p>No consent record was returned.</p>
                      )}
                    </section>
                  )}
                </>
              ) : null}

              {presentation === 'page' && profileTab === 'Overview' ? (
                <section
                  className="supervisor-profile-details-card"
                  aria-labelledby="customer-details-card-title"
                >
                  <header className="supervisor-profile-details-card__header">
                    <h3 id="customer-details-card-title">Customer details</h3>
                    {!isCashierProfile ? (
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label="Edit customer details"
                        disabled={busy || loading || loadFailed}
                        onClick={() => {
                          setProfileEditDiscardPrompt(false);
                          setProfileEditorOpen(true);
                        }}
                      >
                        Edit details
                      </Button>
                    ) : null}
                  </header>
                  <dl className="supervisor-profile-details-grid">
                    <div>
                      <dt>Full name</dt>
                      <dd
                        className={
                          profileValue(
                            profile.fullName || customer.fullName,
                          ) === 'Not provided'
                            ? 'is-not-provided'
                            : undefined
                        }
                      >
                        {profileValue(profile.fullName || customer.fullName)}
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd
                        className={
                          profileValue(
                            isCashierProfile
                              ? customer.maskedPhone
                              : profile.phone || customer.phoneE164,
                          ) === 'Not provided'
                            ? 'is-not-provided'
                            : undefined
                        }
                      >
                        {profileValue(
                          isCashierProfile
                            ? customer.maskedPhone
                            : profile.phone || customer.phoneE164,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd
                        className={`supervisor-profile-details-grid__email${profileValue(visibleEmail) === 'Not provided' ? ' is-not-provided' : ''}`}
                      >
                        {profileValue(visibleEmail)}
                      </dd>
                    </div>
                    <div>
                      <dt>Birthday month</dt>
                      <dd
                        className={
                          profileValue(customer.birthdayMonth) ===
                          'Not provided'
                            ? 'is-not-provided'
                            : undefined
                        }
                      >
                        {profileValue(customer.birthdayMonth)}
                      </dd>
                    </div>
                    {!isCashierProfile ? (
                      <>
                        <div>
                          <dt>Registered</dt>
                          <dd
                            className={
                              profileDateTime(
                                projection?.memberSince ?? customer.createdAt,
                              ) === 'Not provided'
                                ? 'is-not-provided'
                                : undefined
                            }
                          >
                            {profileDateTime(
                              projection?.memberSince ?? customer.createdAt,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Transactions</dt>
                          <dd className="is-not-provided">Not provided</dd>
                        </div>
                        <div>
                          <dt>Redemptions</dt>
                          <dd className="is-not-provided">Not provided</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                </section>
              ) : null}

              {message && (presentation !== 'page' || !profileEditorOpen) ? (
                <p role="status" aria-live="polite" className="text-sm">
                  {message}
                </p>
              ) : null}
              {loadFailed && (presentation !== 'page' || !profileEditorOpen) ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || loading}
                  onClick={onRetry}
                >
                  Retry customer details
                </Button>
              ) : null}

              <CustomerProfileEditorLayer
                presentation={presentation}
                open={profileEditorOpen && !isCashierProfile}
                onClose={requestProfileEditorClose}
              >
                {presentation === 'page' && profileEditDiscardPrompt ? (
                  <section
                    className="sc-customer-details__discard"
                    aria-labelledby="customer-edit-discard-title"
                    aria-describedby="customer-edit-discard-description"
                  >
                    <h2 id="customer-edit-discard-title">
                      Discard unsaved changes?
                    </h2>
                    <p id="customer-edit-discard-description">
                      Your edits haven&apos;t been saved.
                    </p>
                    <div className="sc-customer-details__actions">
                      <Button
                        ref={keepEditingRef}
                        type="button"
                        variant="secondary"
                        onClick={keepProfileEditing}
                      >
                        Keep editing
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={discardProfileEdits}
                      >
                        Discard
                      </Button>
                    </div>
                  </section>
                ) : (
                  <form
                    className={`sc-customer-details__form ${presentation === 'page' ? 'supervisor-profile-edit-form' : ''}`}
                    hidden={
                      presentation === 'page' &&
                      profileTab !== 'Overview' &&
                      !hasPendingEdits
                    }
                    onSubmit={submitProfile}
                  >
                    {presentation === 'page' && message ? (
                      <p role="status" aria-live="polite" className="text-sm">
                        {message}
                      </p>
                    ) : null}
                    {presentation === 'page' && loadFailed ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || loading}
                        onClick={onRetry}
                      >
                        Retry customer details
                      </Button>
                    ) : null}
                    <section
                      className="sc-customer-details__section"
                      aria-labelledby="customer-profile-heading"
                    >
                      <h3 id="customer-profile-heading">
                        {presentation === 'page'
                          ? 'Customer details'
                          : 'Profile'}
                      </h3>
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
                              Save or discard profile edits before changing
                              account status.
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
                              variant={
                                status === 'BLOCKED' ? 'danger' : 'primary'
                              }
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
                            Change status only when the customer account needs
                            to be blocked or restored.
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
                              Save or discard profile edits before changing
                              account status.
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
                        <p>
                          Card ending {cardNumber.replace(/\W/g, '').slice(-4)}
                        </p>
                      ) : (
                        <p>Card number not provided.</p>
                      )}
                      <p>{cardStatusLabel}</p>
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
                        onClick={
                          presentation === 'page'
                            ? requestProfileEditorClose
                            : requestClose
                        }
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
                )}
              </CustomerProfileEditorLayer>
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
    <>
      <section aria-label="Customer details">{content}</section>
      <Dialog
        open={cardManagementOpen && !isCashierProfile}
        title="Manage customer card"
        onClose={() => setCardManagementOpen(false)}
      >
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCardManagementOpen(false)}
            >
              Close
            </Button>
          </div>
          <SupervisorCardManagement
            initialSerial={
              typeof projection?.card?.identifier === 'string'
                ? projection.card.identifier
                : ''
            }
            compact
            expectedCustomerId={customer?.id}
          />
        </div>
      </Dialog>
    </>
  ) : (
    <Dialog open title="Customer details" onClose={requestClose}>
      {content}
    </Dialog>
  );
}
