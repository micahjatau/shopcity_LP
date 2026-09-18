'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionBootstrapState } from '../session-bootstrap';
import { ScannerContextScope } from '../scanner-context-scope';
import { Alert, Button, Input, Separator } from '../ui';
import { Money, StatusBadge } from '../shopcity';
import {
  WorkflowSection,
  EarnTransactionForm,
  RedeemTransactionForm,
} from './index';
import {
  customersControllerGetCustomerV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  useCashierLookupController,
  type CashierLookupRecord,
} from './use-cashier-lookup-controller';

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
  const {
    lookupValue,
    lookupMessage,
    lookupRecord,
    lookupPending,
    selectedCardSerial,
    setLookupValue,
    lookup: handleLookup,
  } = useCashierLookupController(initialCardSerial);
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


  const lookupSummary: Array<[string, ReactNode]> = lookupRecord
    ? [
        [
          'Customer',
          lookupRecord.customer?.fullName ?? lookupRecord.customerName ?? '—',
        ],
        ['Phone', lookupRecord.customer?.maskedPhone ?? '—'],
        ['Card status', lookupRecord.status ?? lookupRecord.cardStatus ?? '—'],
        [
          'Earn eligibility',
          lookupRecord.customer?.earningEligible === false
            ? 'Staff account — not eligible'
            : lookupRecord.customer?.earningEligible === true
              ? 'Eligible'
              : 'Not provided',
        ],
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
        customerId:
          lookupRecord.customer?.customerId ??
          lookupRecord.customer?.id ??
          lookupRecord.customerId,
        customerName:
          lookupRecord.customer?.fullName ?? lookupRecord.customerName,
        availableBalanceKobo:
          lookupRecord.availableBalanceKobo ?? lookupRecord.balanceKobo,
        expiringCreditKobo: lookupRecord.expiringCreditKobo,
        branchId: lookupRecord.branchId ?? branchContext?.id,
      }
    : undefined;
  const showTransactionForm = kind !== 'lookup';
  const routeHeader = (
    <header className="cashier-route-header">
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p className="cashier-route-description">{description}</p>
    </header>
  );

  return (
    <section className="cashier-route-page">
      <ScannerContextScope context="lookup" />
      {routeHeader}
      {kind !== 'lookup' ? (
        <nav className="cashier-flow-steps" aria-label={`${title} steps`}>
          <span>Find customer</span>
          <i aria-hidden="true" />
          <span>{kind === 'earn' ? 'Receipt details' : 'Basket subtotal'}</span>
          <i aria-hidden="true" />
          <span>{kind === 'earn' ? 'Review' : 'Confirm redemption'}</span>
        </nav>
      ) : null}
      {kind === 'lookup' ? (
        <FindCustomerView
          lookupValue={lookupValue}
          lookupMessage={lookupMessage}
          lookupPending={lookupPending}
          lookupRecord={lookupRecord}
          onLookup={(event) => void handleLookup(event)}
          onQueryChange={setLookupValue}
          selectedCardSerial={selectedCardSerial}
        />
      ) : (
        <WorkflowSection
        title="Find customer context"
        description="Look up the card first. The transaction form unlocks when the server confirms the customer context."
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
        </div>
        </WorkflowSection>
      )}

      {showTransactionForm ? (
        <article
          className="cashier-card cashier-flow-panel"
          aria-label={`${kind} transaction`}
          data-od-id={kind === 'earn' ? 'capture-flow' : 'redeem-flow'}
        >
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

      {kind !== 'lookup' ? (
        <div className="cashier-workspace-grid cashier-support-grid">
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

          <aside
            className="cashier-card cashier-support-note"
            aria-label="Sync queue"
          >
            <h2 style={{ marginTop: 0 }}>Need to sync?</h2>
            <p className="cashier-muted">
              Queue state stays in the shell header. Open the operations page
              when a batch needs review.
            </p>
            <Link href="/cashier/sync">Open sync queue</Link>
          </aside>
        </div>
      ) : null}

      <style>{`
        .cashier-route-page {
          display: grid;
          gap: 24px;
          max-width: 1088px;
          margin: 0 auto;
        }

        .cashier-route-header {
          display: grid;
          gap: 6px;
          padding: 0;
        }

        .cashier-route-header h1 {
          color: var(--sc-color-brand-700);
          font-family: 'Avenir Next', 'Century Gothic', 'Trebuchet MS', var(--sc-font-family-sans);
          font-size: clamp(30px, 4vw, 34px);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1.05;
          text-transform: none;
        }

        .cashier-route-description {
          color: var(--sc-color-brand-700);
          margin: 0;
        }

        .cashier-flow-steps {
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--sc-prototype-muted);
          font-size: 12px;
        }

        .cashier-flow-steps i {
          flex: 1;
          height: 1px;
          background: var(--sc-prototype-border);
        }

        .cashier-muted {
          color: var(--sc-color-semantic-textSecondary);
          margin: 0;
        }

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

        .cashier-route-page > section:first-of-type {
          max-width: 712px;
          justify-self: center;
          width: 100%;
          border-radius: 16px !important;
          box-shadow: none !important;
        }

        .cashier-support-note {
          display: grid;
          gap: var(--sc-spacing-3);
        }

        .cashier-card {
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          padding: clamp(var(--sc-spacing-5), 3vw, var(--sc-spacing-7));
          box-shadow: none;
        }

        .cashier-flow-panel {
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
        }

        .cashier-card h2 {
          letter-spacing: -0.03em;
        }

        .cashier-card .sc-input:focus-visible {
          border-color: var(--sc-color-brand-500);
          box-shadow: 0 0 0 3px rgba(177, 0, 0, 0.14);
        }

        .cashier-card .sc-button--primary {
          border-radius: 999px;
          background: linear-gradient(90deg, var(--sc-color-brand-700), #d86200);
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

        .find-customer-view {
          display: grid;
          gap: 18px;
          max-width: 1080px;
          margin: 0 auto;
        }

        .find-customer-search,
        .find-customer-recent {
          max-width: 712px;
          width: 100%;
          margin: 0 auto;
          padding: 16px 24px 17px;
          border: 1px solid var(--sc-prototype-border);
          border-radius: 16px;
          background: var(--sc-prototype-surface);
        }

        .find-customer-search-row {
          display: grid;
          grid-template-columns: 1fr 160px 160px;
          gap: 9px;
          align-items: center;
        }

        .find-customer-query {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .find-customer-query .sc-input {
          min-height: 33px;
        }

        .find-customer-hint,
        .find-customer-notice,
        .find-customer-recent p,
        .find-customer-empty,
        .find-customer-row span {
          color: var(--sc-prototype-muted);
          font-size: 12px;
        }

        .find-customer-hint,
        .find-customer-notice {
          margin: 10px 0 0;
        }

        .find-customer-notice {
          max-width: 712px;
          width: 100%;
          margin-inline: auto;
        }

        .find-customer-recent {
          min-height: 398px;
          padding: 16px 23px;
        }

        .find-customer-recent h2 {
          margin: 0;
          font-size: 18px;
        }

        .find-customer-list {
          display: grid;
          gap: 9px;
          margin-top: 18px;
        }

        .find-customer-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 14px 18px;
          border-radius: 13px;
          background: var(--sc-color-neutral-50);
        }

        .find-customer-row > div:first-child {
          display: grid;
          gap: 4px;
        }

        .find-customer-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .find-customer-actions a {
          color: var(--sc-color-brand-700);
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 767px) {
          .find-customer-search-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function FindCustomerView({
  lookupValue,
  lookupMessage,
  lookupPending,
  lookupRecord,
  onLookup,
  onQueryChange,
  selectedCardSerial,
}: Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  lookupRecord: CashierLookupRecord | null;
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
  selectedCardSerial: string;
}>) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="find-customer-view">
      <section className="find-customer-search" data-od-id="customer-search">
        <form onSubmit={onLookup}>
          <div className="find-customer-search-row">
            <label className="find-customer-query" htmlFor="customer-search-query">
              <span aria-hidden="true">⌕</span>
              <Input
                ref={queryInputRef}
                id="customer-search-query"
                type="search"
                aria-label="Customer search"
                placeholder="Phone, card serial or name"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={lookupPending}>
              {lookupPending ? 'Searching…' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => queryInputRef.current?.focus()}
            >
              Scan
            </Button>
          </div>
          <p className="find-customer-hint">
            Press enter or select Search to look up a customer.
          </p>
        </form>
      </section>

      <p className="find-customer-notice" role="status">
        {lookupMessage}
      </p>

      <section className="find-customer-recent">
        <div>
          <h2>Recent customers</h2>
          <p>Customers served most recently at this branch.</p>
        </div>
        <div className="find-customer-list">
          {lookupRecord ? (
            <div className="find-customer-row">
              <div>
                <strong>
                  {lookupRecord.customer?.fullName ??
                    lookupRecord.customerName ??
                    'Customer'}
                </strong>
                <span>
                  {lookupRecord.customer?.maskedPhone ?? selectedCardSerial}
                </span>
              </div>
              <div className="find-customer-actions">
                <Link href={`/cashier/earn?card=${encodeURIComponent(selectedCardSerial)}`}>
                  Capture Purchase
                </Link>
                <Link href={`/cashier/redeem?card=${encodeURIComponent(selectedCardSerial)}`}>
                  Redeem Credit
                </Link>
              </div>
            </div>
          ) : (
            <p className="find-customer-empty">
              Search for a customer to continue a loyalty transaction.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
