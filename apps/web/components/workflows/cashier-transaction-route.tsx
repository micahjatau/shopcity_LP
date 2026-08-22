'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSessionBootstrapState } from '../session-bootstrap';
import { ScannerContextScope } from '../scanner-context-scope';
import { ConnectionStatus, SyncQueueIndicator } from '../offline';
import { Alert, Button, Input, Separator } from '../ui';
import { Money, StatusBadge } from '../shopcity';
import {
  WorkflowSection,
  EarnTransactionForm,
  RedeemTransactionForm,
} from './index';
import {
  cardsControllerLookupCardV1,
  customersControllerGetCustomerV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api';

type CashierLookupRecord = {
  customer?: { id?: string; fullName?: string };
  customerId?: string;
  customerName?: string;
  serialNumber?: string;
  cardSerialNumber?: string;
  status?: string;
  cardStatus?: string;
  availableBalanceKobo?: number;
  balanceKobo?: number;
  expiringCreditKobo?: number;
  branchId?: string;
};

type CashierCustomerRecord = {
  fullName?: string;
  name?: string;
  status?: string;
  balanceKobo?: number;
  availableBalanceKobo?: number;
};

type CashierLedgerItem = {
  id?: string;
  type?: string;
  transactionType?: string;
  amountKobo?: number;
};

type CashierLedgerRecord = {
  items?: CashierLedgerItem[];
};

type CashierPolicyConfig = {
  tenant?: { id?: string; name?: string };
  branch?: {
    id?: string;
    name?: string;
    timezone?: string;
    receiptWeekStartDay?: number;
  };
  policies?: {
    defaultEarnRateBps?: number;
    minRedemptionKobo?: number;
    maxRedemptionBasketPercent?: number;
    purchaseFlagThresholdKobo?: number;
    redemptionApprovalThresholdKobo?: number;
    offlineRedemptionDisabled?: boolean;
  };
};

export type CashierWorkflowRouteProps = {
  kind: 'lookup' | 'earn' | 'redeem';
  title: string;
  description: string;
  initialCardSerial?: string | null;
};

export function CashierWorkflowRoute({
  kind,
  title,
  description,
  initialCardSerial,
}: Readonly<CashierWorkflowRouteProps>) {
  const [lookupValue, setLookupValue] = useState(initialCardSerial ?? '');
  const [lookupMessage, setLookupMessage] = useState(
    initialCardSerial
      ? 'Card context loaded from the route. Lookup to refresh if needed.'
      : 'Scan or type a card serial.',
  );
  const [lookupRecord, setLookupRecord] = useState<CashierLookupRecord | null>(
    null,
  );
  const [lookupPending, setLookupPending] = useState(false);
  const [customerRecord, setCustomerRecord] =
    useState<CashierCustomerRecord | null>(null);
  const [ledgerRecord, setLedgerRecord] = useState<CashierLedgerRecord | null>(
    null,
  );
  const {
    userId,
    deviceId,
    publicConfig,
    configMessage: policyMessage,
  } = useSessionBootstrapState();
  const policyConfig = publicConfig as CashierPolicyConfig | null;

  const customerId = useMemo(
    () => lookupRecord?.customer?.id ?? lookupRecord?.customerId ?? null,
    [lookupRecord],
  );

  useEffect(() => {
    let ignore = false;

    async function loadCustomer() {
      if (kind === 'lookup' || !customerId) {
        setCustomerRecord(null);
        setLedgerRecord(null);
        return;
      }

      try {
        const response = await customersControllerGetCustomerV1(
          customerId,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setCustomerRecord(response.data.data);
        }
      } catch {
        if (!ignore) setCustomerRecord(null);
      }

      try {
        const response = await loyaltyControllerGetCustomerLedgerV1(
          customerId,
          { limit: '5', cursor: '' },
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setLedgerRecord(response.data.data);
        }
      } catch {
        if (!ignore) setLedgerRecord(null);
      }
    }

    void loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId, kind]);

  useEffect(() => {
    if (!initialCardSerial || lookupRecord) {
      return;
    }

    setLookupValue(initialCardSerial);
    void handleLookup(initialCardSerial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardSerial, lookupRecord]);

  async function handleLookup(
    eventOrValue: FormEvent<HTMLFormElement> | string,
  ) {
    if (typeof eventOrValue !== 'string') {
      eventOrValue.preventDefault();
    }

    const query =
      typeof eventOrValue === 'string'
        ? eventOrValue.trim()
        : lookupValue.trim();
    if (!query) {
      setLookupMessage('Enter a card serial number first.');
      setLookupRecord(null);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLookupRecord(null);
      setLookupMessage('Lookup unavailable offline. Reconnect to try again.');
      return;
    }

    setLookupMessage('Looking up customer and card context…');
    setLookupPending(true);
    try {
      const response = await cardsControllerLookupCardV1(
        query,
        createApiRequest({ csrf: true }),
      );

      if (response.status === 200) {
        const record = response.data.data;
        setLookupRecord(record);
        setLookupMessage(
          'Lookup resolved. The workflow can now use this context.',
        );
        return;
      }

      setLookupRecord(null);
      setLookupMessage(`Lookup unavailable (${response.status}).`);
    } catch {
      setLookupRecord(null);
      setLookupMessage('Lookup could not be completed.');
    } finally {
      setLookupPending(false);
    }
  }

  const lookupSummary: Array<[string, ReactNode]> = lookupRecord
    ? [
        [
          'Customer',
          lookupRecord.customer?.fullName ?? lookupRecord.customerName ?? '—',
        ],
        ['Card status', lookupRecord.status ?? lookupRecord.cardStatus ?? '—'],
        [
          'Available balance',
          typeof lookupRecord.availableBalanceKobo === 'number' ? (
            <Money amountKobo={lookupRecord.availableBalanceKobo} />
          ) : (
            '—'
          ),
        ],
        [
          'Expiring credit',
          typeof lookupRecord.expiringCreditKobo === 'number' ? (
            <Money amountKobo={lookupRecord.expiringCreditKobo} />
          ) : (
            '—'
          ),
        ],
      ]
    : [];

  const policyContext = policyConfig?.policies ?? null;
  const branchContext = policyConfig?.branch ?? null;
  const tenantContext = policyConfig?.tenant ?? null;
  const branchReceiptWeekStartDay =
    typeof branchContext?.receiptWeekStartDay === 'number'
      ? branchContext.receiptWeekStartDay
      : null;
  const lookupContext = lookupRecord
    ? {
        cardSerialNumber:
          lookupRecord.serialNumber ??
          lookupRecord.cardSerialNumber ??
          lookupValue.trim(),
        customerId: lookupRecord.customer?.id ?? lookupRecord.customerId,
        customerName:
          lookupRecord.customer?.fullName ?? lookupRecord.customerName,
        availableBalanceKobo:
          lookupRecord.availableBalanceKobo ?? lookupRecord.balanceKobo,
        expiringCreditKobo: lookupRecord.expiringCreditKobo,
        branchId: lookupRecord.branchId ?? branchContext?.id,
      }
    : undefined;
  const showTransactionForm = kind !== 'lookup';
  const selectedCardSerial =
    lookupRecord?.serialNumber ??
    lookupRecord?.cardSerialNumber ??
    lookupValue.trim();

  const routeHeader = (
    <header className="cashier-route-header">
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p className="cashier-route-description">{description}</p>
      <div className="cashier-route-chip-row">
        <StatusBadge
          label={tenantContext?.name ?? tenantContext?.id ?? 'Tenant pending'}
          tone="info"
        />
        <StatusBadge
          label={branchContext?.name ?? branchContext?.id ?? 'Branch pending'}
          tone="neutral"
        />
        <StatusBadge
          label={branchContext?.timezone ?? 'Timezone pending'}
          tone="success"
        />
        {typeof policyContext?.defaultEarnRateBps === 'number' ? (
          <StatusBadge
            label={`Earn ${policyContext.defaultEarnRateBps / 100}%`}
            tone="info"
          />
        ) : null}
      </div>
    </header>
  );

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="lookup" />
      {routeHeader}
      {showTransactionForm ? (
        <article className="cashier-card" aria-label={`${kind} transaction`}>
          <h2 style={{ marginTop: 0 }}>
            {kind === 'earn' ? 'Earn transaction' : 'Redeem transaction'}
          </h2>
          {kind === 'earn' ? (
            <EarnTransactionForm
              lookupContext={lookupContext}
              policyContext={policyContext}
              cashierId={userId}
              deviceId={deviceId}
              branchId={policyConfig?.branch?.id ?? null}
              branchTimezone={branchContext?.timezone ?? null}
              receiptWeekStartDay={branchReceiptWeekStartDay}
            />
          ) : (
            <RedeemTransactionForm
              lookupContext={lookupContext}
              policyContext={policyContext}
              cashierId={userId}
              branchId={policyConfig?.branch?.id ?? null}
            />
          )}
        </article>
      ) : null}
      <WorkflowSection
        title={kind === 'lookup' ? 'Find a customer' : 'Policy and lookup'}
        description={
          kind === 'lookup'
            ? 'Scan or enter a card serial, then continue with the smallest task that matches the customer need.'
            : 'Rehydrate the customer context after the workflow form so the supporting context stays visible.'
        }
      >
        <div className="cashier-workspace-grid">
          <article className="cashier-card" aria-label="Lookup and status">
            <h2 style={{ marginTop: 0 }}>Lookup and status</h2>
            <form
              onSubmit={(event) => void handleLookup(event)}
              style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}
            >
              <Input
                placeholder="Scan card serial number"
                aria-label="Lookup"
                value={lookupValue}
                onChange={(event) => setLookupValue(event.target.value)}
              />
              <Button type="submit" disabled={lookupPending}>
                {lookupPending ? 'Looking up…' : 'Lookup'}
              </Button>
            </form>
            <Alert tone="info" title="Session-aware workflow">
              {lookupMessage}
            </Alert>
            {lookupRecord ? (
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
                {lookupSummary.map(([label, value]) => (
                  <div key={label} className="cashier-stat-row">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
                <div className="cashier-tag-row">
                  {kind === 'lookup' && selectedCardSerial ? (
                    <>
                      <Link
                        href={`/cashier/earn?card=${encodeURIComponent(selectedCardSerial)}`}
                      >
                        Earn
                      </Link>
                      <Link
                        href={`/cashier/redeem?card=${encodeURIComponent(selectedCardSerial)}`}
                      >
                        Redeem
                      </Link>
                    </>
                  ) : null}
                  <StatusBadge
                    label={lookupRecord.status ?? 'LOOKUP'}
                    tone="success"
                  />
                  {lookupRecord.customer?.id || lookupRecord.customerId ? (
                    <Link
                      href={`/cashier/customers${lookupRecord.customer?.id || lookupRecord.customerId ? `?id=${lookupRecord.customer?.id ?? lookupRecord.customerId}` : ''}`}
                    >
                      View customer
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>

          {kind !== 'lookup' ? (
            <article className="cashier-card" aria-label="Policy context">
              <h2 style={{ marginTop: 0 }}>Policy context</h2>
              <p className="cashier-muted">{policyMessage}</p>
              {policyContext ? (
                <div className="cashier-stat-list">
                  {kind === 'earn' ? (
                    <>
                      <div className="cashier-stat-row">
                        <span>Active earn rate</span>
                        <strong>
                          {(policyContext.defaultEarnRateBps ?? 0) / 100}%
                        </strong>
                      </div>
                      <div className="cashier-stat-row">
                        <span>Purchase review threshold</span>
                        {typeof policyContext.purchaseFlagThresholdKobo ===
                        'number' ? (
                          <Money
                            amountKobo={policyContext.purchaseFlagThresholdKobo}
                          />
                        ) : (
                          'Not configured'
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cashier-stat-row">
                        <span>Minimum redemption</span>
                        {typeof policyContext.minRedemptionKobo === 'number' ? (
                          <Money amountKobo={policyContext.minRedemptionKobo} />
                        ) : (
                          'Not configured'
                        )}
                      </div>
                      <div className="cashier-stat-row">
                        <span>Basket limit</span>
                        <strong>
                          {policyContext.maxRedemptionBasketPercent ??
                            'Not configured'}
                          {typeof policyContext.maxRedemptionBasketPercent ===
                          'number'
                            ? '%'
                            : ''}
                        </strong>
                      </div>
                      {policyContext.offlineRedemptionDisabled ? (
                        <Alert
                          tone="warning"
                          title="Offline redemption disabled"
                        >
                          Redemption requires a live server response.
                        </Alert>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <Alert tone="warning" title="Policy unavailable">
                  Active policy guidance is unavailable; the server remains
                  authoritative for this transaction.
                </Alert>
              )}
            </article>
          ) : null}
        </div>
      </WorkflowSection>

      {kind !== 'lookup' ? (
        <div className="cashier-workspace-grid">
          <article className="cashier-card" aria-label="Customer detail">
            <h2 style={{ marginTop: 0 }}>Customer detail</h2>
            {customerRecord ? (
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
                <div className="cashier-stat-row">
                  <span>Name</span>
                  <strong>
                    {customerRecord.fullName ?? customerRecord.name ?? '—'}
                  </strong>
                </div>
                <div className="cashier-stat-row">
                  <span>Status</span>
                  <StatusBadge
                    label={customerRecord.status ?? 'UNKNOWN'}
                    tone="info"
                  />
                </div>
                <div className="cashier-stat-row">
                  <span>Balance</span>
                  <Money
                    amountKobo={
                      customerRecord.balanceKobo ??
                      customerRecord.availableBalanceKobo ??
                      0
                    }
                  />
                </div>
                <Separator />
                <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
                  <strong>Recent ledger</strong>
                  {Array.isArray(ledgerRecord?.items) &&
                  ledgerRecord.items.length > 0 ? (
                    ledgerRecord.items.slice(0, 4).map((item) => {
                      const ledgerKey = String(
                        item.id ?? item.type ?? item.transactionType ?? 'Entry',
                      );
                      return (
                        <div key={ledgerKey} className="cashier-stat-row">
                          <span>
                            {item.type ?? item.transactionType ?? 'Entry'}
                          </span>
                          <span>
                            {item.amountKobo ? (
                              <Money amountKobo={item.amountKobo} />
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="cashier-muted">
                      Ledger history will appear once the customer is loaded.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Alert tone="warning" title="No customer selected">
                Lookup a card first to load customer balance and history.
              </Alert>
            )}
          </article>

          <article className="cashier-card" aria-label="Shift snapshot">
            <h2 style={{ marginTop: 0 }}>Shift snapshot</h2>
            <p className="cashier-muted">
              Offline queue state is shown in the shell header and on the sync
              route.
            </p>
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <Link href="/cashier/sync">Open sync queue</Link>
            </div>
            <Separator style={{ margin: 'var(--sc-spacing-4) 0' }} />
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <ConnectionStatus />
              <SyncQueueIndicator />
            </div>
          </article>
        </div>
      ) : null}

      <style>{`
        .cashier-route-header {
          display: grid;
          gap: var(--sc-spacing-2);
        }

        .cashier-route-description,
        .cashier-muted {
          color: var(--sc-color-semantic-textSecondary);
          margin: 0;
        }

        .cashier-route-chip-row,
        .cashier-tag-row {
          display: flex;
          gap: var(--sc-spacing-2);
          flex-wrap: wrap;
        }

        .cashier-workspace-grid {
          display: grid;
          gap: var(--sc-spacing-4);
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .cashier-card {
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: var(--sc-radius-lg);
          padding: var(--sc-spacing-5);
          box-shadow: var(--sc-shadow-level1);
        }

        .cashier-stat-list {
          display: grid;
          gap: var(--sc-spacing-3);
        }

        .cashier-stat-row {
          display: flex;
          justify-content: space-between;
          gap: var(--sc-spacing-3);
          align-items: center;
        }
      `}</style>
    </section>
  );
}
