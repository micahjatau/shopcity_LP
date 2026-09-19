'use client';

import { Search, ScanLine } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useSessionBootstrapState } from '../session-bootstrap';
import { ScannerContextScope } from '../scanner-context-scope';
import { Alert, Button, Input } from '../ui';
import { Money, StatusBadge } from '../shopcity';
import { EarnTransactionForm, RedeemTransactionForm } from './index';
import {
  useCashierLookupController,
  type CashierLookupRecord,
  type CashierDiscoveryRecord,
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
    <header className="cashier-route-header">
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p className="cashier-route-description">{description}</p>
    </header>
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
          discoveryMatches={discoveryMatches}
          onLookup={(event) => void handleLookup(event)}
          onQueryChange={setLookupValue}
          selectedCardSerial={selectedCardSerial}
        />
      ) : kind === 'earn' && (!lookupRecord || !earnConfirmed) ? (
        <section
          className={
            lookupRecord
              ? 'cashier-card cashier-earn-stage'
              : 'cashier-stage-container'
          }
          data-od-id="capture-stage"
        >
          {!lookupRecord ? (
            <VerifiedCardLookupStep
              lookupValue={lookupValue}
              lookupMessage={lookupMessage}
              lookupPending={lookupPending}
              policyMessage={policyMessage}
              discoveryMatches={discoveryMatches}
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
                <h2>Confirm customer</h2>
                <p>Read the name back to the customer before continuing.</p>
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
          className="cashier-card cashier-earn-stage"
          data-od-id="redeem-stage"
        >
          <div className="cashier-stage-content" aria-label="Lookup and status">
            <div className="cashier-stage-heading">
              <span className="cashier-stage-kicker">Step 2</span>
              <h2>Confirm customer</h2>
              <p>
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
      ) : kind === 'redeem' && !redeemConfirmed ? (
        <VerifiedCardLookupStep
          lookupValue={lookupValue}
          lookupMessage={lookupMessage}
          lookupPending={lookupPending}
          policyMessage={policyMessage}
          discoveryMatches={discoveryMatches}
          onLookup={(event) => void handleLookup(event)}
          onQueryChange={setLookupValue}
        />
      ) : null}

      {showTransactionForm &&
      ((kind === 'earn' && earnConfirmed) ||
        (kind === 'redeem' && redeemConfirmed)) ? (
        <article
          className="cashier-card cashier-flow-panel"
          aria-label={`${kind} transaction`}
          data-od-id={kind === 'earn' ? 'capture-flow' : 'redeem-flow'}
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
        </article>
      ) : null}

      <style>{`
        .cashier-route-page {
          display: grid;
          gap: 32px;
          max-width: 1088px;
          margin: 0 auto;
        }

        .cashier-route-page--earn {
          gap: 34px;
        }

        .cashier-route-header {
          display: grid;
          gap: 10px;
          padding: 0;
        }

        .cashier-route-page--earn .cashier-route-header {
          max-width: 760px;
        }

        .cashier-route-header h1 {
          color: var(--sc-color-brand-700);
          font-family: var(--sc-prototype-fontDisplaySans);
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
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: min(860px, 100%);
          margin: 0 auto;
          padding: 8px;
          border: 1px solid var(--sc-prototype-border);
          border-radius: 14px;
          background: var(--sc-prototype-surface);
          color: var(--sc-prototype-muted);
          font-size: 12px;
          animation: cashier-step-flow-in 320ms ease both;
        }

        .cashier-flow-step {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 36px;
          padding: 0 12px;
          transition: color 220ms ease, background-color 220ms ease;
        }

        .cashier-flow-step:not(:last-child)::after {
          position: absolute;
          top: 50%;
          right: -1px;
          width: 1px;
          height: 18px;
          background: var(--sc-prototype-border);
          content: '';
          transform: translateY(-50%);
        }

        .cashier-flow-step b {
          display: grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border: 1px solid currentColor;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          transition: background-color 220ms ease, color 220ms ease, transform 220ms ease;
        }

        .cashier-flow-step.is-active {
          border-radius: 9px;
          background: color-mix(in oklch, var(--sc-prototype-accent) 9%, transparent);
          color: var(--sc-prototype-accent);
          font-weight: 650;
        }

        .cashier-flow-step.is-active b {
          background: var(--sc-prototype-accent);
          color: white;
          transform: scale(1.08);
        }

        .cashier-flow-step.is-complete {
          color: var(--sc-prototype-accent);
        }

        .cashier-flow-step.is-complete b {
          background: var(--sc-prototype-accent);
          color: white;
        }

        @keyframes cashier-step-flow-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cashier-flow-steps,
          .cashier-flow-step,
          .cashier-flow-step b,
          .cashier-flow-panel,
          .cashier-confirmation-card,
          .capture-result-card,
          .cashier-earn-stage {
            animation: none;
            transition: none;
          }
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

        .cashier-stage-container {
          width: 100%;
          max-width: 860px;
          justify-self: center;
        }

        .cashier-support-note {
          display: grid;
          gap: var(--sc-spacing-3);
        }

        .cashier-card {
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          padding: clamp(28px, 4vw, 40px);
          box-shadow: none;
        }

        .cashier-route-page--earn > .cashier-earn-stage {
          gap: 24px !important;
          padding: clamp(28px, 4vw, 38px) !important;
        }

        .cashier-route-page--earn .cashier-flow-panel {
          padding: clamp(30px, 4vw, 42px);
          animation: cashier-panel-enter 360ms ease both;
        }

        .cashier-route-page--earn .cashier-confirmation-card {
          padding: var(--sc-spacing-4);
          border: 1px solid color-mix(in oklch, var(--sc-prototype-accent) 16%, var(--sc-prototype-border));
          border-radius: 14px;
          background: color-mix(in oklch, var(--sc-prototype-accent) 4%, var(--sc-prototype-surface));
          animation: cashier-context-enter 420ms ease both;
        }

        .cashier-route-page--earn .cashier-confirmation-card::before {
          content: 'Customer context confirmed';
          color: var(--sc-prototype-accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        @keyframes cashier-context-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cashier-panel-enter {
          from { opacity: 0.5; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cashier-flow-panel {
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
        }

        .cashier-flow-panel-heading {
          padding-bottom: 18px;
          margin: 0 0 24px;
          border-bottom: 1px solid var(--sc-prototype-border);
          font-size: 20px;
        }

        .cashier-stage-container { max-width: 860px; width: 100%; margin: 0 auto; }
        .cashier-earn-stage {
          max-width: 860px;
          padding: 32px 40px 40px;
          animation: cashier-panel-enter 360ms ease both;
        }

        .cashier-stage-content {
          display: grid;
          gap: 24px;
        }

        .cashier-stage-heading {
          display: grid;
          gap: 4px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--sc-prototype-border);
        }

        .cashier-stage-heading h2,
        .cashier-stage-heading p {
          margin: 0;
        }

        .cashier-stage-heading h2 {
          font-size: 20px;
          letter-spacing: -0.025em;
        }

        .cashier-stage-heading p {
          color: var(--sc-prototype-muted);
          font-size: 12px;
        }

        .cashier-stage-kicker {
          color: var(--sc-prototype-accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .cashier-lookup-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px;
          gap: 12px;
          align-items: center;
        }

        .cashier-confirm-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 248px;
          gap: 32px;
          align-items: start;
        }

        .cashier-confirm-details,
        .cashier-review-grid {
          display: grid;
          gap: 16px;
        }

        .cashier-detail-row {
          display: grid;
          gap: 3px;
        }

        .cashier-detail-row span,
        .cashier-review-grid span {
          color: var(--sc-prototype-muted);
          font-size: 11px;
        }

        .cashier-detail-row strong,
        .cashier-review-grid strong {
          font-size: 14px;
          font-weight: 600;
        }

        .cashier-card-preview {
          display: grid;
          gap: 2px;
          min-height: 158px;
          padding: 18px;
          border: 1px solid var(--sc-prototype-border);
          border-radius: 16px;
          background: linear-gradient(135deg, var(--sc-prototype-surface), var(--sc-color-neutral-50));
          box-shadow: var(--sc-shadow-level1);
        }

        .cashier-card-preview__mark {
          display: grid;
          width: 24px;
          height: 24px;
          place-items: center;
          border-radius: 50%;
          background: var(--sc-prototype-accent);
          color: var(--sc-prototype-surface);
          font-size: 12px;
          font-weight: 700;
        }

        .cashier-card-preview strong {
          font-size: 11px;
          letter-spacing: 0.04em;
        }

        .cashier-card-preview small {
          color: var(--sc-prototype-muted);
          font-size: 7px;
          letter-spacing: 0.07em;
        }

        .cashier-card-preview__number {
          margin-top: auto;
          font-size: 12px;
          letter-spacing: 0.04em;
        }

        .cashier-card-preview .sc-badge {
          justify-self: end;
          min-height: 20px;
          font-size: 10px;
        }

        .cashier-stage-actions {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
        }

        .cashier-receipt-fields {
          display: grid;
          gap: 16px;
        }

        .cashier-review-card {
          display: grid;
          gap: 20px;
          padding: 20px;
          border: 1px solid var(--sc-prototype-border);
          border-radius: 12px;
          background: var(--sc-color-neutral-50);
        }

        .cashier-review-card p {
          margin: 0;
          color: var(--sc-prototype-muted);
          font-size: 12px;
        }

        .cashier-review-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cashier-review-grid div {
          display: grid;
          gap: 3px;
        }

        .cashier-workflow-steps {
          display: flex;
          align-items: center;
          gap: 13px;
          width: max-content;
          max-width: 100%;
          padding: 10px 17px;
          border-radius: 999px;
          background: var(--sc-prototype-surface);
          color: var(--sc-prototype-muted);
          font-size: 12px;
          overflow-x: auto;
        }

        .cashier-workflow-steps span {
          white-space: nowrap;
        }

        .cashier-workflow-steps .is-active {
          color: var(--sc-prototype-accent);
          font-weight: 650;
        }

        .cashier-workflow-steps i {
          width: 24px;
          flex: 0 0 24px;
          border-top: 1px dotted var(--sc-prototype-muted);
        }

        .cashier-card h2 {
          letter-spacing: -0.03em;
        }

        .capture-result-card {
          display: grid;
          gap: var(--sc-spacing-3);
          padding: var(--sc-spacing-4);
          border: 1px solid color-mix(in oklch, var(--sc-color-success-strong) 18%, var(--sc-prototype-border));
          border-radius: 14px;
          background: color-mix(in oklch, var(--sc-color-success-strong) 6%, var(--sc-prototype-surface));
          animation: cashier-result-enter 480ms ease both;
        }

        .capture-result-card__hero {
          display: grid;
          min-height: 112px;
          place-items: center;
          align-content: center;
          gap: 8px;
          border-radius: 14px;
          background: var(--sc-color-success-surface);
          color: var(--sc-color-success-strong);
        }

        .capture-result-card__hero span {
          font-size: 12px;
        }

        .capture-result-card__eyebrow {
          margin: 0 0 4px;
          color: var(--sc-color-success-strong);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .capture-result-card h3,
        .capture-result-card p {
          margin: 0;
        }

        .capture-result-card > div:nth-child(2) p:last-child {
          margin-top: 4px;
          color: var(--sc-prototype-muted);
          font-size: 13px;
        }

        .capture-result-card__actions {
          display: flex;
          justify-content: flex-end;
        }

        @keyframes cashier-result-enter {
          from { opacity: 0; transform: scale(0.98) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .cashier-card .sc-input:focus-visible {
          border-color: var(--sc-color-brand-500);
          box-shadow: 0 0 0 3px rgba(177, 0, 0, 0.14);
        }

        .cashier-card .sc-button {
          border-radius: 9px;
        }

        .cashier-card .sc-button--primary {
          background: var(--sc-prototype-accent);
        }

        .cashier-card .sc-button--primary:hover:not(:disabled) {
          background: color-mix(in oklch, var(--sc-prototype-accent) 88%, black);
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
          width: min(640px, 100%);
          max-width: 100%;
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

          .cashier-flow-steps {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .cashier-flow-step {
            justify-content: flex-start;
          }

          .cashier-flow-step:not(:last-child)::after {
            display: none;
          }

          .cashier-route-page--earn {
            gap: 24px;
          }

          .cashier-earn-stage {
            padding: 24px 20px 28px;
          }

          .cashier-lookup-form,
          .cashier-confirm-layout,
          .cashier-review-grid {
            grid-template-columns: 1fr;
          }

          .cashier-stage-actions {
            flex-direction: column-reverse;
          }

          .cashier-stage-actions .sc-button {
            width: 100%;
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
  discoveryMatches,
  onLookup,
  onQueryChange,
  selectedCardSerial,
}: Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  lookupRecord: CashierLookupRecord | null;
  discoveryMatches: CashierDiscoveryRecord[];
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
                placeholder="Name, phone or card serial"
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
          <h2>Customer results</h2>
          <p>
            Search by name or phone, then verify the active card to continue.
          </p>
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
          ) : discoveryMatches.length > 0 ? (
            discoveryMatches.map((customer, index) => (
              <div
                className="find-customer-row"
                key={customer.customerId ?? customer.id ?? index}
              >
                <div>
                  <strong>{customer.fullName ?? 'Customer'}</strong>
                  <span>{customer.maskedPhone ?? 'Phone unavailable'}</span>
                </div>
                <span>Scan active card to continue</span>
              </div>
            ))
          ) : (
            <p className="find-customer-empty">
              Search by name, phone, or an active card serial to continue.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
