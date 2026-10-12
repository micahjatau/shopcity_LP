'use client';

import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Input, Table } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';
import {
  useEarnTransactionController,
  type EarnPolicyContext,
  type EarnLookupContext,
} from './use-earn-transaction-controller';

type EarnTransactionFormProps = {
  lookupContext?: EarnLookupContext;
  policyContext?: EarnPolicyContext | null;
  cashierId?: string | null;
  deviceId?: string | null;
  branchId?: string | null;
  branchTimezone?: string | null;
  receiptWeekStartDay?: number | null;
  onFlowStepChange?: (step: number) => void;
  onBackToCustomerConfirmation?: () => void;
};
export function EarnTransactionForm({
  lookupContext,
  policyContext,
  cashierId,
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
      status === 'confirmed' || status === 'pending' || reviewing ? 3 : 2,
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
  const balanceBeforeKobo = lookupContext?.availableBalanceKobo;
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
  const cashbackRateBps = policyContext?.defaultEarnRateBps;
  const cashbackRateLabel =
    typeof cashbackRateBps === 'number' && Number.isFinite(cashbackRateBps)
      ? `${(cashbackRateBps / 100).toLocaleString('en-GB', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        })}%`
      : 'Set by ShopCity';

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
                  {purchaseAmount !== null ? (
                    <Money amountKobo={purchaseAmount} />
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
      {responseData ? (
        <section
          className={`capture-result-card cashier-workflow-stage capture-result-card--${status}`}
          data-od-id="capture-success"
          aria-live="polite"
          aria-label="Capture purchase result"
        >
          <div className="cashier-stage-heading">
            <span className="cashier-stage-kicker">Result</span>
            <h2 className="cashier-stage-heading-title">
              {status === 'confirmed'
                ? 'Purchase captured'
                : 'Purchase pending approval'}
            </h2>
            <p className="cashier-stage-heading-description">
              The authoritative transaction status is shown below; pending
              approval is not a completed credit.
            </p>
          </div>
          <div className="capture-result-card__hero">
            {status === 'confirmed' ? (
              <CircleCheck aria-hidden="true" size={30} strokeWidth={1.8} />
            ) : (
              <span aria-hidden="true">…</span>
            )}
            <span>
              {status === 'confirmed'
                ? 'ShopCity Credit earned'
                : 'Awaiting supervisor approval'}
            </span>
          </div>
          <div>
            <p className="capture-result-card__eyebrow">
              {status === 'confirmed'
                ? 'Transaction complete'
                : 'Approval required'}
            </p>
            <h3>
              {status === 'confirmed'
                ? 'Purchase captured successfully'
                : 'Purchase is awaiting approval'}
            </h3>
            <p>
              {status === 'confirmed'
                ? 'ShopCity Credit has been issued to the customer wallet.'
                : 'The transaction was recorded and will complete after supervisor review.'}
            </p>
          </div>
          <Table>
            <tbody>
              {Object.entries(responseData)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
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

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
