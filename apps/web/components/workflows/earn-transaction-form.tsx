'use client';

import { useEffect, useState } from 'react';
import { Button, Input } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';
import {
  useEarnTransactionController,
  type EarnPolicyContext,
  type EarnLookupContext,
} from './use-earn-transaction-controller';
import { EarnTransactionSuccess } from './earn-transaction-success';

type EarnTransactionFormProps = {
  lookupContext?: EarnLookupContext;
  currentWalletBalanceKobo?: number | null;
  policyContext?: EarnPolicyContext | null;
  cashierId?: string | null;
  cashierDisplayName?: string | null;
  deviceId?: string | null;
  branchId?: string | null;
  branchTimezone?: string | null;
  receiptWeekStartDay?: number | null;
  onFlowStepChange?: (step: number) => void;
  onBackToCustomerConfirmation?: () => void;
};
export function EarnTransactionForm({
  lookupContext,
  currentWalletBalanceKobo,
  policyContext,
  cashierId,
  cashierDisplayName,
  deviceId,
  branchId,
  branchTimezone,
  receiptWeekStartDay,
  onFlowStepChange,
  onBackToCustomerConfirmation,
}: EarnTransactionFormProps) {
  const [reviewing, setReviewing] = useState(false);
  const {
    expectedCreditKobo,
    handleSubmit,
    lookupReady,
    message,
    occurredAt,
    occurredAtValid,
    purchaseAmount,
    receiptNumber,
    resetDraft,
    responseData,
    setOccurredAt,
    setPurchaseAmount,
    setReceiptNumber,
    status,
    submissionReady,
  } = useEarnTransactionController({
    lookupContext,
    policyContext,
    cashierId,
    deviceId,
    branchId,
    branchTimezone,
    receiptWeekStartDay,
  });

  useEffect(() => {
    if (!onFlowStepChange) return;
    onFlowStepChange(
      status === 'confirmed' ? 4 : status === 'pending' || reviewing ? 3 : 2,
    );
  }, [onFlowStepChange, reviewing, status]);

  const reviewReceiptDate = occurredAtValid
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(occurredAt))
    : '—';
  const balanceBeforeKobo =
    currentWalletBalanceKobo !== undefined
      ? currentWalletBalanceKobo
      : lookupContext?.availableBalanceKobo;
  const canShowBalanceBefore =
    typeof balanceBeforeKobo === 'number' &&
    Number.isSafeInteger(balanceBeforeKobo);
  const estimatedBalanceKobo =
    canShowBalanceBefore &&
    expectedCreditKobo !== null &&
    Number.isSafeInteger(expectedCreditKobo) &&
    Number.isSafeInteger(balanceBeforeKobo + expectedCreditKobo)
      ? balanceBeforeKobo + expectedCreditKobo
      : null;
  // The Earn API records the full receipt total; it has no separate item-level eligible amount.
  const eligibleAmountKobo = purchaseAmount;
  const cashbackRateBps = policyContext?.defaultEarnRateBps;
  const cashbackRateLabel =
    typeof cashbackRateBps === 'number' && Number.isFinite(cashbackRateBps)
      ? `${(cashbackRateBps / 100).toLocaleString('en-GB', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}%`
      : 'Set by ShopCity';
  const pendingEarnResult =
    status === 'pending' && responseData
      ? getPendingEarnResult(responseData)
      : null;
  const pendingCustomerName = lookupContext?.customerName?.trim();
  const pendingCardSerial = lookupContext?.cardSerialNumber?.trim();
  const pendingReceiptDate = pendingEarnResult?.occurredAt
    ? formatPendingDateTime(pendingEarnResult.occurredAt, branchTimezone)
    : null;
  const pendingCapturedDate = pendingEarnResult?.capturedAt
    ? formatPendingDateTime(pendingEarnResult.capturedAt, branchTimezone)
    : null;
  const pendingDetails = [
    pendingCustomerName
      ? { label: 'Customer', value: pendingCustomerName }
      : null,
    pendingCardSerial
      ? { label: 'Card number', value: pendingCardSerial }
      : null,
    pendingEarnResult?.receiptNumber
      ? { label: 'Receipt number', value: pendingEarnResult.receiptNumber }
      : null,
    typeof pendingEarnResult?.purchaseAmountKobo === 'number'
      ? {
          label: 'Purchase amount',
          value: <Money amountKobo={pendingEarnResult.purchaseAmountKobo} />,
        }
      : null,
    pendingReceiptDate
      ? { label: 'Receipt date', value: pendingReceiptDate }
      : null,
    pendingCapturedDate
      ? { label: 'Submitted at', value: pendingCapturedDate }
      : null,
    pendingEarnResult?.approvalReason
      ? { label: 'Approval reason', value: pendingEarnResult.approvalReason }
      : null,
  ].flatMap((detail) => (detail ? [detail] : []));

  return (
    <form
      onSubmit={(event) => {
        if (!reviewing) {
          event.preventDefault();
          setReviewing(true);
          onFlowStepChange?.(3);
          return;
        }
        void handleSubmit(event);
      }}
      className={`cashier-transaction-form cashier-earn-receipt-form${
        reviewing && !responseData ? ' cashier-earn-receipt-form--review' : ''
      }`}
      data-od-id="capture-form"
    >
      <p className="sr-only" role="status">
        {lookupReady ? 'Verified customer context ready.' : 'Awaiting lookup'}
      </p>
      {!reviewing ? (
        <section
          className="cashier-workflow-stage"
          data-od-id="capture-receipt"
        >
          <div className="cashier-stage-heading">
            <h2 className="cashier-stage-heading-title">
              Step 3 — Receipt details
            </h2>
            <p className="cashier-stage-heading-description">
              {lookupContext?.customerName?.trim() || 'Verified customer'}
              {' · '}
              {occurredAtValid
                ? new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  }).format(new Date(occurredAt))
                : 'Receipt date and time required'}
            </p>
          </div>
          <div className="cashier-receipt-fields">
            <div className="cashier-receipt-field">
              <label htmlFor="earn-receipt-number">Receipt number *</label>
              <Input
                id="earn-receipt-number"
                className="cashier-earn-receipt-control"
                aria-required="true"
                required
                placeholder="Enter receipt number"
                value={receiptNumber}
                onChange={(event) => setReceiptNumber(event.target.value)}
              />
            </div>
            <MoneyInput
              id="earn-purchase-amount"
              className="cashier-earn-receipt-control"
              label="Receipt amount (₦) *"
              valueKobo={purchaseAmount}
              onValueChange={setPurchaseAmount}
            />
            <div className="cashier-earn-receipt-estimate-field">
              <span className="cashier-earn-receipt-estimate-label">
                Estimated ShopCity credit
              </span>
              <div className="cashier-earn-receipt-estimate" aria-live="polite">
                <output>
                  {expectedCreditKobo !== null ? (
                    <Money amountKobo={expectedCreditKobo} />
                  ) : (
                    'Enter receipt amount to estimate'
                  )}
                </output>
              </div>
            </div>
            <div className="cashier-receipt-time-field">
              <label htmlFor="earn-occurred-at">
                Receipt date &amp; time *
              </label>
              <Input
                id="earn-occurred-at"
                className="cashier-earn-receipt-control"
                aria-required="true"
                aria-invalid={!occurredAtValid}
                aria-describedby={
                  occurredAtValid
                    ? 'earn-receipt-age-hint'
                    : 'earn-receipt-age-hint earn-occurred-at-error'
                }
                required
                type="datetime-local"
                value={occurredAtValid ? toDateTimeLocalValue(occurredAt) : ''}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  const parsed = new Date(value);
                  setOccurredAt(
                    value && Number.isFinite(parsed.getTime())
                      ? parsed.toISOString()
                      : '',
                  );
                }}
              />
              <p
                id="earn-receipt-age-hint"
                className="cashier-receipt-age-hint"
              >
                Enter the timestamp shown on the receipt. ShopCity validates
                receipt age and approval eligibility.
              </p>
              {!occurredAtValid ? (
                <p
                  id="earn-occurred-at-error"
                  className="cashier-receipt-time-hint"
                  role="alert"
                >
                  Receipt date and time is required.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : !responseData ? (
        <section
          className="cashier-workflow-stage cashier-earn-review-stage"
          data-od-id="capture-review-details"
        >
          <div className="cashier-stage-heading">
            <h2 className="cashier-stage-heading-title">Step 4 — Review</h2>
            <p className="cashier-stage-heading-description">
              {lookupContext?.customerName?.trim() || 'Verified customer'}
              {' · '}
              {reviewReceiptDate}
            </p>
          </div>
          <div className="cashier-review-card">
            <div className="cashier-review-grid">
              <div>
                <span>Customer</span>
                <strong>
                  {lookupContext?.customerName?.trim() || 'Verified customer'}
                </strong>
              </div>
              <div>
                <span>Receipt number</span>
                <strong>{receiptNumber || '—'}</strong>
              </div>
              <div>
                <span>Receipt amount</span>
                <strong>
                  {purchaseAmount !== null ? (
                    <Money amountKobo={purchaseAmount} />
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
              <div>
                <span>Eligible amount</span>
                <strong>
                  {eligibleAmountKobo !== null ? (
                    <Money amountKobo={eligibleAmountKobo} />
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
              <div>
                <span>Cashback rate</span>
                <strong>{cashbackRateLabel}</strong>
              </div>
              <div>
                <span>Receipt date</span>
                <strong>{reviewReceiptDate}</strong>
              </div>
            </div>
            <div className="cashier-review-credit" aria-live="polite">
              <span>Estimated ShopCity Credit</span>
              <strong
                className={
                  expectedCreditKobo === null
                    ? 'cashier-review-credit__value--unavailable'
                    : undefined
                }
              >
                {expectedCreditKobo !== null ? (
                  <Money amountKobo={expectedCreditKobo} signed />
                ) : (
                  'Calculated after confirmation'
                )}
              </strong>
            </div>
            <div className="cashier-review-divider" aria-hidden="true" />
            <div className="cashier-review-balances">
              <div>
                <span>Balance before</span>
                <strong>
                  {canShowBalanceBefore ? (
                    <Money amountKobo={balanceBeforeKobo} />
                  ) : (
                    'Not available'
                  )}
                </strong>
              </div>
              <div>
                <span>Estimated new balance</span>
                <strong>
                  {estimatedBalanceKobo !== null ? (
                    <Money amountKobo={estimatedBalanceKobo} />
                  ) : (
                    'Calculated after confirmation'
                  )}
                </strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {!responseData ? (
        <div className="cashier-form-actions cashier-earn-receipt-actions">
          <Button
            type="button"
            variant="secondary"
            className="cashier-earn-receipt-back"
            aria-label={reviewing ? 'Edit receipt' : undefined}
            onClick={() => {
              if (reviewing) {
                setReviewing(false);
                onFlowStepChange?.(2);
                return;
              }
              onBackToCustomerConfirmation?.();
            }}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="cashier-earn-receipt-proceed"
            loading={status === 'submitting'}
            disabled={!submissionReady}
            aria-label={
              reviewing ? 'Confirm & add credit' : 'Proceed to review'
            }
          >
            {reviewing ? 'Confirm & Add Credit' : 'Proceed'}
          </Button>
        </div>
      ) : null}
      {status !== 'idle' && message && !responseData ? (
        <section
          className="cashier-form-status"
          data-od-id="capture-outcome"
          aria-live="polite"
          aria-label="Capture purchase outcome"
        >
          <StatusBadge
            label={
              status === 'pending'
                ? 'Awaiting approval'
                : status === 'confirmed'
                  ? 'Confirmed'
                  : status === 'error'
                    ? 'Error'
                    : 'Draft'
            }
            tone={
              status === 'error'
                ? 'danger'
                : status === 'pending'
                  ? 'warning'
                  : status === 'confirmed'
                    ? 'success'
                    : 'neutral'
            }
          />
          <p className="cashier-form-status__message">{message}</p>
        </section>
      ) : null}
      {responseData && status === 'confirmed' ? (
        <EarnTransactionSuccess
          responseData={responseData}
          lookupContext={lookupContext}
          cashierDisplayName={cashierDisplayName}
          cashbackRateLabel={cashbackRateLabel}
          branchTimezone={branchTimezone}
          onCaptureAnother={() => {
            setReviewing(false);
            resetDraft();
          }}
        />
      ) : responseData ? (
        <section
          className="cashier-workflow-stage capture-pending-result"
          data-od-id="capture-success"
          aria-live="polite"
          aria-label="Capture purchase result"
        >
          <div className="capture-result-card capture-result-card--pending">
            <div className="capture-result-card__pending-notice">
              <p className="capture-result-card__pending-eyebrow">
                Purchase recorded
              </p>
              <h2 id="earn-pending-result-title">Awaiting approval</h2>
              <p>
                A supervisor needs to review this purchase before rewards are
                added.
              </p>
            </div>
          </div>
          {pendingDetails.length > 0 ? (
            <dl className="capture-result-card__pending-details">
              {pendingDetails.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="capture-result-card__actions">
            <button
              className="sc-button sc-button--primary"
              type="button"
              onClick={() => {
                setReviewing(false);
                resetDraft();
              }}
            >
              Capture another
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

type PendingEarnResult = {
  receiptNumber?: string;
  purchaseAmountKobo?: number;
  occurredAt?: string;
  capturedAt?: string;
  approvalReason?: string;
};

function getPendingEarnResult(
  responseData: Record<string, unknown>,
): PendingEarnResult {
  let value: unknown = responseData;
  for (let depth = 0; depth < 2; depth += 1) {
    if (!isRecord(value) || !isRecord(value.data)) break;
    value = value.data;
  }
  if (!isRecord(value)) return {};

  const amount = value.purchaseAmountKobo;
  const reasonCode = value.reasonCode;
  return {
    ...(typeof value.posReceiptNumber === 'string' &&
    value.posReceiptNumber.trim()
      ? { receiptNumber: value.posReceiptNumber.trim() }
      : {}),
    ...(typeof amount === 'number' &&
    Number.isSafeInteger(amount) &&
    amount >= 0
      ? { purchaseAmountKobo: amount }
      : {}),
    ...(typeof value.occurredAt === 'string'
      ? { occurredAt: value.occurredAt }
      : {}),
    ...(typeof value.capturedAt === 'string'
      ? { capturedAt: value.capturedAt }
      : {}),
    ...(reasonCode === 'LATE_RECEIPT_CLAIM'
      ? { approvalReason: 'Late receipt claim' }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatPendingDateTime(value: string, timezone?: string | null) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };
  try {
    return new Intl.DateTimeFormat('en-GB', {
      ...options,
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }
}
