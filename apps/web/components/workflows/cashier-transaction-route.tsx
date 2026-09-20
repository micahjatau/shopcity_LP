'use client';

import { Search, ScanLine } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
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
  const showTransactionForm = kind !== 'lookup';
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
      : ['Find customer', 'Confirm customer', 'Basket & redemption', 'Confirm'];
  const routeHeader = (
    <CashierPageHeader
      className="cashier-route-header"
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
          onLookup={(event) => void handleLookup(event)}
          onQueryChange={setLookupValue}
          selectedCardSerial={selectedCardSerial}
        />
      ) : kind === 'earn' ? (
        <section
          className="cashier-card cashier-stage-card cashier-earn-stage"
          data-od-id="capture-stage"
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
              aria-label="Lookup and status"
            >
              <div className="cashier-stage-heading">
                <span className="cashier-stage-kicker">Step 2</span>
                <h2 className="cashier-stage-heading-title">
                  Confirm customer
                </h2>
                <p className="cashier-stage-heading-description">
                  Read the name back to the customer before continuing.
                </p>
              </div>
              <div className="cashier-confirm-layout">
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
                    {lookupContext?.cardSerialNumber ?? 'SC—CARD—0000'}
                  </span>
                  <StatusBadge label="Active" tone="success" />
                </div>
              </div>
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
          ) : null}
        </section>
      ) : kind === 'redeem' && lookupRecord && !redeemConfirmed ? (
        <section
          className="cashier-card cashier-stage-card cashier-redeem-stage"
          data-od-id="redeem-stage"
        >
          <div className="cashier-stage-content" aria-label="Lookup and status">
            <div className="cashier-stage-heading">
              <span className="cashier-stage-kicker">Step 2</span>
              <h2 className="cashier-stage-heading-title">Confirm customer</h2>
              <p className="cashier-stage-heading-description">
                Verify the customer and card before entering the redemption.
              </p>
            </div>
            <div className="cashier-confirm-layout">
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
                  {lookupContext?.cardSerialNumber ?? 'SC—CARD—0000'}
                </span>
                <StatusBadge label="Active" tone="success" />
              </div>
            </div>
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
        </section>
      ) : kind === 'redeem' && redeemConfirmed ? null : (
        <VerifiedCardLookupStep
          lookupValue={lookupValue}
          lookupMessage={lookupMessage}
          lookupPending={lookupPending}
          policyMessage={policyMessage}
          onLookup={(event) => void handleLookup(event)}
          onQueryChange={setLookupValue}
        />
      )}

      {showTransactionForm &&
      ((kind === 'earn' && earnConfirmed) ||
        (kind === 'redeem' && redeemConfirmed)) ? (
        <CashierFlowPanel
          flow={kind}
          className="cashier-card cashier-flow-panel"
          dataOdId={kind === 'earn' ? 'capture-flow' : 'redeem-flow'}
        >
          <h2 className="cashier-flow-panel-heading">
            {kind === 'earn'
              ? flowStep >= 3
                ? 'Step 4 — Review'
                : 'Step 3 — Receipt details'
              : 'Step 3 — Basket & redemption'}
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
              onFlowStepChange={setFlowStep}
            />
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
      ) : null}
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
                placeholder="Card serial number"
                className="sc-input--compact"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={lookupPending}>
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              {lookupPending ? 'Searching…' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => queryInputRef.current?.focus()}
            >
              <ScanLine aria-hidden="true" size={16} strokeWidth={1.8} />
              Scan
            </Button>
          </div>
          <p className="find-customer-hint">
            Press enter or select Search to look up the card and customer
            context.
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
              <div className="find-customer-row-main">
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
                <Link
                  href={`/cashier/earn?card=${encodeURIComponent(selectedCardSerial)}`}
                >
                  Capture Purchase
                </Link>
                <Link
                  href={`/cashier/redeem?card=${encodeURIComponent(selectedCardSerial)}`}
                >
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
