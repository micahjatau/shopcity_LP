'use client';

import { CreditCard, Search, ScanLine } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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
          onLookup={(event) => void handleLookup(event)}
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
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
  selectedCardSerial: string;
  onClearLookup: () => void;
}>) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <div className="find-customer-view" data-od-id="find-customer-content">
      <section
        className="find-customer-search sc-discovery-panel"
        data-od-id="customer-search"
        aria-busy={lookupPending}
      >
        <form id="customer-search-form" onSubmit={onLookup}>
          <div className="find-customer-search-row">
            <label
              className="find-customer-query"
              htmlFor="customer-search-query"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              <Input
                ref={queryInputRef}
                id="customer-search-query"
                type="search"
                aria-label="Customer search"
                aria-describedby="customer-search-hint"
                placeholder="Search"
                autoComplete="off"
                className="sc-input--compact"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              disabled={lookupPending}
              data-od-id="customer-search-button"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              {lookupPending ? 'Searching…' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-od-id="customer-scan-button"
              onClick={() => queryInputRef.current?.focus()}
            >
              <ScanLine aria-hidden="true" size={16} strokeWidth={1.8} />
              Scan
            </Button>
          </div>
          <p
            id="customer-search-hint"
            className="find-customer-hint sc-discovery-muted"
          >
            Search by name, phone number, or card serial. Press enter or select
            Search to look up a customer.
          </p>
        </form>
      </section>

      <p
        className="find-customer-notice sc-discovery-muted"
        data-od-id="customer-search-state"
        role="status"
        aria-live="polite"
      >
        {lookupMessage}
      </p>

      <section
        className="find-customer-recent sc-discovery-panel"
        data-od-id="recent-customers"
      >
        <div className="find-customer-recent-head">
          <h2 className="sc-discovery-section-title">Recent customers</h2>
          <p className="sc-discovery-muted">
            Customers served most recently at this branch.
          </p>
        </div>
        <div className="find-customer-list" data-od-id="customer-results">
          {lookupRecord ? (
            <article
              className="find-customer-row sc-discovery-row"
              data-od-id="customer-selection"
            >
              <div
                className="find-customer-row-main"
                data-od-id="verified-card-handoff"
              >
                <strong>
                  {lookupRecord.customer?.fullName ??
                    lookupRecord.customerName ??
                    'Customer'}
                </strong>
                <span className="sc-discovery-muted">
                  {lookupRecord.customer?.maskedPhone ?? selectedCardSerial}
                </span>
                <span className="find-customer-status sc-discovery-muted">
                  {lookupRecord.status ??
                    lookupRecord.cardStatus ??
                    'Card verified'}
                </span>
              </div>
              <div className="find-customer-row-side">
                <span className="find-customer-balance">
                  {typeof lookupRecord.availableBalanceKobo === 'number' ? (
                    <Money amountKobo={lookupRecord.availableBalanceKobo} />
                  ) : (
                    'Balance unavailable'
                  )}
                </span>
                <div className="find-customer-actions">
                  <Link
                    className="sc-discovery-action"
                    href={`/cashier/earn?card=${encodeURIComponent(selectedCardSerial)}`}
                  >
                    Capture Purchase
                  </Link>
                  <Link
                    className="sc-discovery-action"
                    href={`/cashier/redeem?card=${encodeURIComponent(selectedCardSerial)}`}
                  >
                    Redeem Credit
                  </Link>
                </div>
              </div>
            </article>
          ) : discoveryMatches.length > 0 ? (
            discoveryMatches.map((customer, index) => {
              const customerKey = customer.customerId ?? customer.id ?? index;
              const cardStatus =
                customer.cardStatus?.toLowerCase() === 'active'
                  ? 'Active card'
                  : 'Card status unavailable';

              return (
                <article
                  className="find-customer-row sc-discovery-row"
                  data-od-id={`customer-card-${customerKey}`}
                  key={customerKey}
                >
                  <div className="find-customer-row-main">
                    <strong>{customer.fullName ?? 'Customer'}</strong>
                    <span className="sc-discovery-muted">
                      {customer.maskedPhone ?? 'Phone unavailable'}
                    </span>
                    <span className="find-customer-status sc-discovery-muted">
                      {cardStatus}
                    </span>
                  </div>
                  <div className="find-customer-row-side">
                    <span className="find-customer-balance">
                      {typeof customer.availableBalanceKobo === 'number' ? (
                        <Money amountKobo={customer.availableBalanceKobo} />
                      ) : (
                        'Balance unavailable'
                      )}
                    </span>
                    <span className="find-customer-discovery-hint sc-discovery-muted">
                      Scan an active card to continue
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="find-customer-empty">
              <CreditCard aria-hidden="true" size={62} strokeWidth={1.2} />
              <strong>No customers found</strong>
              <span>Search by name, phone, or an active card to continue.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
