'use client';

import { Search, ScanLine } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { customersControllerListCustomersV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { useSessionBootstrapState } from '../session-bootstrap';
import { ScannerContextScope } from '../scanner-context-scope';
import { Alert, Button, Input } from '../ui';
import {
  CashierFlowPanel,
  CashierPageHeader,
  Money,
  StatusBadge,
} from '../shopcity';
import { EarnTransactionForm, RedeemTransactionForm } from './index';
import {
  useCashierLookupController,
  type CashierDiscoveryRecord,
  type CashierLookupRecord,
} from './use-cashier-lookup-controller';
import { VerifiedCardLookupStep } from './verified-card-lookup-step';

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
    discoveryMatches,
    selectedCardSerial,
    setLookupValue,
    clearLookup,
    lookup: handleLookup,
  } = useCashierLookupController(initialCardSerial);
  const {
    userId,
    deviceId,
    publicConfig,
    configMessage: policyMessage,
  } = useSessionBootstrapState();
  const policyConfig = publicConfig as CashierPolicyConfig | null;
  const [flowStep, setFlowStep] = useState(0);
  const [earnConfirmed, setEarnConfirmed] = useState(false);
  const [redeemConfirmed, setRedeemConfirmed] = useState(false);

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
  const currentFlowStep =
    kind === 'earn'
      ? !lookupRecord
        ? 0
        : !earnConfirmed
          ? 1
          : flowStep
      : !lookupRecord
        ? 0
        : !redeemConfirmed
          ? 1
          : flowStep;
  const flowSteps =
    kind === 'earn'
      ? ['Find customer', 'Confirm customer', 'Receipt details', 'Review']
      : ['Find customer', 'Basket subtotal', 'Redemption amount', 'Confirm'];
  const routeHeader = (
    <CashierPageHeader
      className="cashier-route-header"
      dataOdId={
        kind === 'lookup'
          ? 'find-customer-heading'
          : kind === 'earn'
            ? 'capture-purchase-heading'
            : 'redeem-heading'
      }
      title={title}
      description={description}
    />
  );

  return (
    <section
      className={`cashier-route-page cashier-route-page--${kind}`}
      data-od-id={kind === 'earn' ? 'capture-purchase-page' : `${kind}-page`}
    >
      <ScannerContextScope context="lookup" />
      {routeHeader}
      {kind !== 'lookup' ? (
        <nav
          key={currentFlowStep}
          className="cashier-flow-steps"
          aria-label={`${title} steps`}
          data-od-id={kind === 'earn' ? 'capture-stages' : 'redeem-stages'}
        >
          {flowSteps.map((step, index) => (
            <span
              className={`cashier-flow-step ${
                index === currentFlowStep ? 'is-active' : ''
              } ${index < currentFlowStep ? 'is-complete' : ''}`}
              aria-current={index === currentFlowStep ? 'step' : undefined}
              key={step}
            >
              <b aria-hidden="true">
                {index < currentFlowStep ? '✓' : index + 1}
              </b>
              <span>{step}</span>
            </span>
          ))}
        </nav>
      ) : null}
      {kind === 'lookup' ? (
        <FindCustomerView
          lookupValue={lookupValue}
          lookupMessage={lookupMessage}
          lookupPending={lookupPending}
          lookupRecord={lookupRecord}
          discoveryMatches={discoveryMatches}
          onLookup={(eventOrValue) => void handleLookup(eventOrValue)}
          onQueryChange={setLookupValue}
          selectedCardSerial={selectedCardSerial}
          onClearLookup={clearLookup}
        />
      ) : kind === 'earn' ? (
        <CashierFlowPanel
          flow="earn"
          state={`step-${currentFlowStep + 1}`}
          className="cashier-flow-panel cashier-earn-workflow-panel"
          dataOdId="capture-flow"
        >
          {!lookupRecord ? (
            <VerifiedCardLookupStep
              lookupValue={lookupValue}
              lookupMessage={lookupMessage}
              lookupPending={lookupPending}
              policyMessage={policyMessage}
              onLookup={(event) => void handleLookup(event)}
              onQueryChange={setLookupValue}
            />
          ) : !earnConfirmed ? (
            <div
              className="cashier-stage-content cashier-confirm-stage"
              data-od-id="capture-confirm-customer"
              aria-label="Confirm customer"
            >
              <div className="cashier-stage-heading">
                <span className="cashier-stage-kicker">Step 2</span>
                <h2 className="cashier-stage-heading-title">
                  Step 2 — Confirm customer
                </h2>
                <p className="cashier-stage-heading-description">
                  Read the name back to the customer before continuing.
                </p>
              </div>
              <CustomerConfirmationSummary
                lookupSummary={lookupSummary}
                cardSerialNumber={lookupContext?.cardSerialNumber}
              />
              <div className="cashier-stage-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearLookup();
                    setEarnConfirmed(false);
                  }}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => setEarnConfirmed(true)}>
                  Proceed
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="cashier-flow-panel-form"
              data-od-id="capture-flow-form"
            >
              <EarnTransactionForm
                lookupContext={lookupContext}
                policyContext={policyContext}
                cashierId={userId}
                deviceId={deviceId}
                branchId={policyConfig?.branch?.id ?? null}
                branchTimezone={branchContext?.timezone ?? null}
                receiptWeekStartDay={branchReceiptWeekStartDay}
                onFlowStepChange={setFlowStep}
              />
            </div>
          )}
        </CashierFlowPanel>
      ) : (
        <CashierFlowPanel
          flow="redeem"
          state={`step-${currentFlowStep + 1}`}
          className="cashier-flow-panel cashier-redeem-flow-panel"
          dataOdId="redeem-flow"
        >
          {!lookupRecord ? (
            <VerifiedCardLookupStep
              lookupValue={lookupValue}
              lookupMessage={lookupMessage}
              lookupPending={lookupPending}
              policyMessage={policyMessage}
              onLookup={(event) => void handleLookup(event)}
              onQueryChange={setLookupValue}
            />
          ) : !redeemConfirmed ? (
            <div
              className="cashier-stage-content"
              aria-label="Confirm customer"
            >
              <div className="cashier-stage-heading">
                <span className="cashier-stage-kicker">Step 2</span>
                <h2 className="cashier-stage-heading-title">
                  Confirm customer
                </h2>
                <p className="cashier-stage-heading-description">
                  Verify the customer and card before entering the redemption.
                </p>
              </div>
              <CustomerConfirmationSummary
                lookupSummary={lookupSummary}
                cardSerialNumber={lookupContext?.cardSerialNumber}
              />
              <div className="cashier-stage-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearLookup();
                    setRedeemConfirmed(false);
                  }}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => setRedeemConfirmed(true)}>
                  Continue to redemption
                </Button>
              </div>
            </div>
          ) : (
            <RedeemTransactionForm
              lookupContext={lookupContext}
              policyContext={policyContext}
              cashierId={userId}
              branchId={policyConfig?.branch?.id ?? null}
              onFlowStepChange={setFlowStep}
            />
          )}
        </CashierFlowPanel>
      )}
    </section>
  );
}

function CustomerConfirmationSummary({
  lookupSummary,
  cardSerialNumber,
}: Readonly<{
  lookupSummary: Array<[string, ReactNode]>;
  cardSerialNumber?: string;
}>) {
  return (
    <div
      className="cashier-confirm-layout"
      role="region"
      aria-label="Lookup and status"
    >
      <div className="cashier-confirm-details">
        {lookupSummary.map(([label, value]) => (
          <div key={label} className="cashier-detail-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div
        className="cashier-card-preview"
        aria-label="Virtual ShopCity card preview"
      >
        <span className="cashier-card-preview__mark">S</span>
        <strong>SHOPCITY</strong>
        <small>SUPERMARKET</small>
        <span className="cashier-card-preview__number">
          {cardSerialNumber ?? 'SC—CARD—0000'}
        </span>
        <StatusBadge label="Active" tone="success" />
      </div>
    </div>
  );
}

function FindCustomerView({
  lookupValue,
  lookupMessage,
  lookupPending,
  lookupRecord,
  discoveryMatches,
  onLookup,
  onQueryChange,
  selectedCardSerial,
  onClearLookup,
}: Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  lookupRecord: CashierLookupRecord | null;
  discoveryMatches: CashierDiscoveryRecord[];
  onLookup: (eventOrValue: FormEvent<HTMLFormElement> | string) => void;
  onQueryChange: (value: string) => void;
  selectedCardSerial: string;
  onClearLookup: () => void;
}>) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const lookupHandlerRef = useRef(onLookup);
  const previousLookupValue = useRef(lookupValue);
  const searchTimerRef = useRef<number | null>(null);
  const triggeredSearchRef = useRef('');
  const scrollRegionProps = { tabIndex: 0 };
  const [recentCustomers, setRecentCustomers] = useState<
    CashierDiscoveryRecord[]
  >([]);
  const [recentPending, setRecentPending] = useState(true);
  const [recentError, setRecentError] = useState('');
  const [directoryPending, setDirectoryPending] = useState(false);

  useEffect(() => {
    lookupHandlerRef.current = onLookup;
  }, [onLookup]);

  useEffect(() => {
    let active = true;

    async function loadRecentCustomers() {
      try {
        const response = await customersControllerListCustomersV1(
          { q: '', limit: '10', cursor: '' },
          createApiRequest({ csrf: true }),
        );
        if (!active) return;
        if (response.status !== 200) {
          setRecentError(`Recent customers unavailable (${response.status}).`);
          return;
        }
        const data = response.data.data;
        const items = Array.isArray(data) ? data : data.items;
        setRecentCustomers((items ?? []) as CashierDiscoveryRecord[]);
      } catch {
        if (active) setRecentError('Recent customers unavailable.');
      } finally {
        if (active) setRecentPending(false);
      }
    }

    void loadRecentCustomers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lookupValue === previousLookupValue.current) return;
    previousLookupValue.current = lookupValue;
    const term = lookupValue.trim();
    if (term.length < 2) {
      triggeredSearchRef.current = '';
      setDirectoryPending(false);
      return;
    }

    setDirectoryPending(true);
    const timer = window.setTimeout(() => {
      searchTimerRef.current = null;
      triggeredSearchRef.current = term;
      lookupHandlerRef.current(term);
    }, 280);
    searchTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (searchTimerRef.current === timer) searchTimerRef.current = null;
    };
  }, [lookupValue]);

  useEffect(() => {
    if (
      triggeredSearchRef.current &&
      triggeredSearchRef.current === lookupValue.trim() &&
      !lookupPending
    ) {
      setDirectoryPending(false);
      triggeredSearchRef.current = '';
    }
  }, [lookupPending, lookupValue]);

  useEffect(() => {
    function restoreLookupFocus(event: KeyboardEvent) {
      if (
        event.key !== 'Escape' ||
        (!lookupValue && !lookupRecord && discoveryMatches.length === 0)
      ) {
        return;
      }
      event.preventDefault();
      onClearLookup();
      queryInputRef.current?.focus();
    }

    window.addEventListener('keydown', restoreLookupFocus);
    return () => window.removeEventListener('keydown', restoreLookupFocus);
  }, [discoveryMatches.length, lookupRecord, lookupValue, onClearLookup]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    const term = lookupValue.trim();
    if (term.length >= 2) {
      triggeredSearchRef.current = term;
      setDirectoryPending(true);
    }
    lookupHandlerRef.current(event);
  }

  const verifiedCustomer: CashierDiscoveryRecord | null = lookupRecord
    ? {
        customerId:
          lookupRecord.customerId ??
          lookupRecord.customer?.customerId ??
          lookupRecord.customer?.id,
        fullName: lookupRecord.customer?.fullName ?? lookupRecord.customerName,
        maskedPhone: lookupRecord.customer?.maskedPhone,
        cardStatus: lookupRecord.cardStatus ?? lookupRecord.status,
        availableBalanceKobo:
          lookupRecord.availableBalanceKobo ?? lookupRecord.balanceKobo,
      }
    : null;
  const hasSearchTerm = Boolean(lookupValue.trim());
  const visibleCustomers = verifiedCustomer
    ? [verifiedCustomer]
    : hasSearchTerm
      ? discoveryMatches
      : recentCustomers;
  const tableBusy = hasSearchTerm
    ? lookupPending || directoryPending
    : recentPending;
  const statusMessage = hasSearchTerm
    ? lookupValue.trim().length < 2 && !lookupPending
      ? 'Enter at least 2 characters to search.'
      : directoryPending && !lookupPending
        ? `Searching for “${lookupValue.trim()}”…`
        : lookupMessage
    : recentPending
      ? 'Loading recent customers…'
      : recentError;

  return (
    <div className="find-customer-view" data-od-id="find-customer-content">
      <header
        className="find-customer-recent-head"
        data-od-id="recent-customers-heading"
      >
        <h2
          className="sc-discovery-section-title"
          id="find-customer-results-title"
        >
          Recent customers
        </h2>
        <p className="sc-discovery-muted">
          Up to ten of the most recently registered customer profiles.
        </p>
      </header>
      <section
        className="find-customer-search sc-discovery-panel"
        data-od-id="customer-search"
        aria-busy={lookupPending || directoryPending}
      >
        <form id="customer-search-form" onSubmit={submitSearch}>
          <div className="find-customer-search-row">
            <label
              className="find-customer-query table-search"
              htmlFor="customer-search-query"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              <Input
                ref={queryInputRef}
                id="customer-search-query"
                type="search"
                aria-label="Customer search"
                placeholder="Search customers, phone, or card…"
                autoComplete="off"
                className="sc-input--compact"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              disabled={lookupPending}
              className="find-customer-search-action find-customer-search-action--primary"
              data-od-id="customer-search-button"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              {lookupPending ? 'Searching…' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="find-customer-search-action find-customer-search-action--secondary"
              data-od-id="customer-scan-button"
              onClick={() => queryInputRef.current?.focus()}
            >
              <ScanLine aria-hidden="true" size={16} strokeWidth={1.8} />
              Scan
            </Button>
          </div>
        </form>
      </section>

      {statusMessage ? (
        <p
          className="find-customer-notice sc-discovery-muted"
          data-od-id="customer-search-state"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}

      <section
        className="find-customer-recent sc-discovery-panel"
        data-od-id="recent-customers"
        aria-labelledby="find-customer-results-title"
        aria-busy={tableBusy}
      >
        <div
          className="find-customer-table-wrap"
          data-od-id="customer-results"
          role="region"
          aria-label="Customer results"
          {...scrollRegionProps}
        >
          <table className="find-customer-table">
            <caption className="sr-only">
              Customer name, masked phone, card status, available balance, and
              profile action.
            </caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Phone</th>
                <th scope="col">Card status</th>
                <th scope="col">Available balance</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.length ? (
                visibleCustomers.map((customer, index) => {
                  const customerId = customer.customerId ?? customer.id;
                  const customerName = customer.fullName ?? 'Name unavailable';
                  const profileQuery = customerId
                    ? new URLSearchParams({ id: customerId })
                    : null;
                  if (profileQuery && verifiedCustomer && selectedCardSerial) {
                    profileQuery.set('card', selectedCardSerial);
                  }
                  const normalizedCardStatus = customer.cardStatus
                    ?.trim()
                    .toUpperCase();
                  const cardStatus =
                    normalizedCardStatus === 'ACTIVE'
                      ? 'Active card'
                      : customer.cardStatus
                        ? customer.cardStatus
                            .replaceAll('_', ' ')
                            .toLowerCase()
                            .replace(/^\w/, (letter) => letter.toUpperCase())
                        : 'Card status unavailable';
                  const cardStatusTone =
                    normalizedCardStatus === 'ACTIVE'
                      ? 'active'
                      : ['PENDING', 'ISSUING'].includes(
                            normalizedCardStatus ?? '',
                          )
                        ? 'pending'
                        : [
                              'BLOCKED',
                              'CANCELLED',
                              'DEACTIVATED',
                              'EXPIRED',
                              'INACTIVE',
                              'LOST',
                              'REVOKED',
                              'SUSPENDED',
                            ].includes(normalizedCardStatus ?? '')
                          ? 'inactive'
                          : 'unknown';
                  const balanceKobo = customer.availableBalanceKobo;
                  const balanceTone =
                    typeof balanceKobo !== 'number' ||
                    !Number.isFinite(balanceKobo)
                      ? 'unknown'
                      : balanceKobo > 0
                        ? 'positive'
                        : balanceKobo < 0
                          ? 'negative'
                          : 'zero';

                  return (
                    <tr
                      key={customerId ?? `${customerName}-${index}`}
                      data-od-id={
                        verifiedCustomer
                          ? 'customer-selection'
                          : `customer-card-${customerId ?? index}`
                      }
                    >
                      <td>{customerName}</td>
                      <td>{customer.maskedPhone ?? 'Phone unavailable'}</td>
                      <td>
                        <span
                          className={`find-customer-card-status find-customer-card-status--${cardStatusTone}`}
                        >
                          {cardStatus}
                        </span>
                      </td>
                      <td className="find-customer-table__balance">
                        <span
                          className={`find-customer-balance find-customer-balance--${balanceTone}`}
                        >
                          {typeof balanceKobo === 'number' &&
                          Number.isFinite(balanceKobo) ? (
                            <Money amountKobo={balanceKobo} />
                          ) : (
                            'Balance unavailable'
                          )}
                        </span>
                      </td>
                      <td>
                        {profileQuery ? (
                          <Link
                            className="cashier-primary-action find-customer-profile-action"
                            href={`/cashier/customers?${profileQuery.toString()}`}
                            aria-label={`View profile for ${customerName}`}
                          >
                            View profile
                          </Link>
                        ) : (
                          'Profile unavailable'
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="find-customer-empty-cell" colSpan={5}>
                    {tableBusy
                      ? hasSearchTerm
                        ? `Searching for “${lookupValue.trim()}”…`
                        : 'Loading recent customers…'
                      : hasSearchTerm
                        ? lookupMessage || 'No customers found.'
                        : recentError || 'No customers found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!verifiedCustomer && hasSearchTerm && visibleCustomers.length > 0 ? (
          <p className="find-customer-discovery-note sc-discovery-muted">
            Scan an active card to continue
          </p>
        ) : null}
      </section>
    </div>
  );
}
