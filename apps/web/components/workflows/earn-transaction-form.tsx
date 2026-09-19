'use client';

import { CircleCheck, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Textarea, Table } from '../ui';
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
}: EarnTransactionFormProps) {
  const [reviewing, setReviewing] = useState(false);
  const {
    authoritativeCardSerial,
    cardSerialNumber,
    expectedCreditKobo,
    handleSubmit,
    lookupReady,
    message,
    occurredAt,
    overrideReason,
    purchaseAmount,
    receiptNumber,
    resetDraft,
    responseData,
    setCardSerialNumber,
    setOccurredAt,
    setOverrideReason,
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
    const hasReceiptDraft = Boolean(
      receiptNumber.trim() || purchaseAmount !== null,
    );
    onFlowStepChange(
      status === 'confirmed' || status === 'pending'
        ? 3
        : reviewing || hasReceiptDraft
          ? 3
          : 2,
    );
  }, [onFlowStepChange, purchaseAmount, receiptNumber, reviewing, status]);

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
      style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}
      data-od-id="capture-form"
    >
      <Alert
        tone="info"
        title="Review before submit"
        data-od-id="capture-review"
      >
        Use lookup first, confirm the customer context, then submit the earn.
        {expectedCreditKobo !== null ? (
          <>
            {' '}
            Expected credit: <Money amountKobo={expectedCreditKobo} />.
          </>
        ) : null}
      </Alert>
      <p className="cashier-workflow-status" role="status">
        {lookupReady ? 'Context ready' : 'Awaiting lookup'}
      </p>
      {lookupContext ? (
        <Alert tone="success" title="Lookup context applied">
          {lookupContext.customerName ?? 'Customer'} is loaded.
          {typeof lookupContext.availableBalanceKobo === 'number' ? (
            <>
              {' '}
              Available balance:{' '}
              <Money amountKobo={lookupContext.availableBalanceKobo} />.
            </>
          ) : null}
          {typeof lookupContext.expiringCreditKobo === 'number' ? (
            <>
              {' '}
              Expiring credit:{' '}
              <Money amountKobo={lookupContext.expiringCreditKobo} />.
            </>
          ) : null}
        </Alert>
      ) : (
        <Alert tone="warning" title="Lookup recommended">
          Lookup first so the cashier can review the customer and card context
          before submitting.
        </Alert>
      )}
      <div data-od-id="capture-find">
        <Input
          aria-label="Card serial number"
          placeholder="Look up a card first"
          value={lookupReady ? authoritativeCardSerial : cardSerialNumber}
          readOnly={lookupReady}
          onChange={(event) => {
            if (!lookupReady) setCardSerialNumber(event.target.value);
          }}
        />
      </div>
      {!reviewing ? (
        <div className="cashier-receipt-fields" data-od-id="capture-receipt">
          <Input
            aria-label="POS receipt number"
            aria-required="true"
            placeholder="Receipt number (required)"
            value={receiptNumber}
            onChange={(event) => setReceiptNumber(event.target.value)}
          />
          <MoneyInput
            label="Purchase amount"
            hint="Enter the purchase amount in naira"
            valueKobo={purchaseAmount}
            onValueChange={setPurchaseAmount}
          />
          <Input
            aria-label="Occurred at"
            type="datetime-local"
            value={occurredAt.slice(0, 16)}
            onChange={(event) =>
              setOccurredAt(new Date(event.target.value).toISOString())
            }
          />
          <Textarea
            aria-label="Override reason"
            placeholder="Optional override reason"
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            rows={3}
          />
          {!receiptNumber ? (
            <span className="cashier-workflow-hint">
              Receipt number is required
            </span>
          ) : null}
        </div>
      ) : (
        <section
          className="cashier-review-card"
          data-od-id="capture-review-details"
        >
          <div className="cashier-review-grid">
            <div>
              <span>Receipt number</span>
              <strong>{receiptNumber || '—'}</strong>
            </div>
            <div>
              <span>Purchase amount</span>
              <strong>
                {purchaseAmount !== null ? (
                  <Money amountKobo={purchaseAmount} />
                ) : (
                  '—'
                )}
              </strong>
            </div>
            <div>
              <span>Receipt date</span>
              <strong>{new Date(occurredAt).toLocaleString()}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{lookupContext?.customerName ?? 'Customer'}</strong>
            </div>
          </div>
          <p>
            Confirm the receipt details and the ShopCity earn policy will
            calculate the final credit.
          </p>
        </section>
      )}
      <div
        style={{
          display: 'flex',
          gap: 'var(--sc-spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          type="submit"
          loading={status === 'submitting'}
          disabled={!submissionReady}
        >
          <CircleCheck aria-hidden="true" size={16} strokeWidth={1.8} />
          {reviewing ? 'Confirm & add credit' : 'Proceed to review'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (reviewing) {
              setReviewing(false);
              onFlowStepChange?.(2);
              return;
            }
            resetDraft();
          }}
        >
          <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
          {reviewing ? 'Edit receipt' : 'Reset draft'}
        </Button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 'var(--sc-spacing-2)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
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
        <p aria-live="polite" style={{ margin: 0, minHeight: '1.25rem' }}>
          {message || 'The backend decides the final state.'}
        </p>
      </div>
      {responseData ? (
        <section
          className="capture-result-card"
          data-od-id="capture-success"
          aria-live="polite"
        >
          <div className="capture-result-card__hero" aria-hidden="true">
            <CircleCheck size={30} strokeWidth={1.8} />
            <span>ShopCity Credit earned</span>
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

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
