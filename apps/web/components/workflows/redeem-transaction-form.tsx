'use client';

import { CircleCheck, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Table } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';
import {
  useRedeemTransactionController,
  type RedeemLookupContext,
  type RedeemPolicyContext,
} from './use-redeem-transaction-controller';

type RedeemTransactionFormProps = {
  lookupContext?: RedeemLookupContext;
  policyContext?: RedeemPolicyContext | null;
  cashierId?: string | null;
  branchId?: string | null;
  onFlowStepChange?: (step: number) => void;
};
export function RedeemTransactionForm({
  lookupContext,
  policyContext,
  cashierId,
  branchId,
  onFlowStepChange,
}: RedeemTransactionFormProps) {
  const [reviewing, setReviewing] = useState(false);
  const {
    authoritativeCardSerial,
    basketAmount,
    cardSerialNumber,
    handleSubmit,
    lookupReady,
    maxAllowedRedemptionKobo,
    message,
    needsReview,
    occurredAt,
    receiptNumber,
    requestedRedemption,
    resetDraft,
    responseData,
    setBasketAmount,
    setCardSerialNumber,
    setOccurredAt,
    setReceiptNumber,
    setRequestedRedemption,
    status,
  } = useRedeemTransactionController({
    lookupContext,
    policyContext,
    cashierId,
    branchId,
  });

  useEffect(() => {
    onFlowStepChange?.(reviewing ? 3 : 2);
  }, [onFlowStepChange, reviewing]);

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
      className="cashier-transaction-form"
      data-od-id="redeem-form"
    >
      <Alert
        tone="info"
        title="Review before submit"
        data-od-id="redeem-confirm"
      >
        Use lookup first, verify the remaining balance and allowed redemption,
        then confirm the redemption.
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
        </Alert>
      ) : (
        <Alert tone="warning" title="Lookup recommended">
          Lookup first so the cashier can review the customer and card context
          before submitting.
        </Alert>
      )}
      <div data-od-id="redeem-find">
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
      <Input
        aria-label="POS receipt number"
        placeholder="Receipt number"
        value={receiptNumber}
        onChange={(event) => setReceiptNumber(event.target.value)}
      />
      <div data-od-id="redeem-basket">
        <MoneyInput
          label="Basket amount"
          hint="Basket amount in naira"
          valueKobo={basketAmount}
          onValueChange={setBasketAmount}
        />
      </div>
      <div data-od-id="redeem-amount">
        <MoneyInput
          label="Requested redemption"
          hint="Requested redemption in naira"
          valueKobo={requestedRedemption}
          onValueChange={setRequestedRedemption}
        />
      </div>
      <div data-od-id="redeem-summary" className="cashier-redemption-summary">
        <div>
          <span className="cashier-workflow-hint">Basket total</span>
          <strong>
            {basketAmount === null ? '—' : <Money amountKobo={basketAmount} />}
          </strong>
        </div>
        <div>
          <span className="cashier-workflow-hint">Requested credit</span>
          <strong>
            {requestedRedemption === null ? (
              '—'
            ) : (
              <Money amountKobo={requestedRedemption} />
            )}
          </strong>
        </div>
      </div>
      <Input
        aria-label="Occurred at"
        type="datetime-local"
        value={occurredAt.slice(0, 16)}
        onChange={(event) =>
          setOccurredAt(new Date(event.target.value).toISOString())
        }
      />
      {needsReview ? (
        <Alert tone="warning" title="Review required">
          The requested redemption exceeds the current calculated maximum.
        </Alert>
      ) : null}
      {reviewing ? (
        <section
          className="cashier-review-card"
          data-od-id="redeem-confirmation"
        >
          <div className="cashier-review-grid">
            <div>
              <span>Customer</span>
              <strong>{lookupContext?.customerName ?? 'Customer'}</strong>
            </div>
            <div>
              <span>Basket amount</span>
              <strong>
                {basketAmount === null ? (
                  '—'
                ) : (
                  <Money amountKobo={basketAmount} />
                )}
              </strong>
            </div>
            <div>
              <span>Requested credit</span>
              <strong>
                {requestedRedemption === null ? (
                  '—'
                ) : (
                  <Money amountKobo={requestedRedemption} />
                )}
              </strong>
            </div>
            <div>
              <span>Receipt number</span>
              <strong>{receiptNumber || '—'}</strong>
            </div>
          </div>
          <p>
            Confirm the redemption details before sending the authoritative
            request.
          </p>
        </section>
      ) : null}
      <div className="cashier-form-actions">
        <Button
          type="submit"
          loading={status === 'submitting'}
          disabled={
            !lookupReady ||
            basketAmount === null ||
            requestedRedemption === null ||
            needsReview
          }
        >
          <CircleCheck aria-hidden="true" size={16} strokeWidth={1.8} />
          {reviewing ? 'Confirm redemption' : 'Proceed to confirmation'}
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
          {reviewing ? 'Edit redemption' : 'Reset draft'}
        </Button>
      </div>
      <div className="cashier-form-status">
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
        <p aria-live="polite" className="cashier-form-status__message">
          {message || 'The final redemption status will appear here.'}
        </p>
      </div>
      {responseData ? (
        <section
          className="cashier-transaction-result"
          data-od-id="redeem-success"
        >
          <Alert
            tone={status === 'confirmed' ? 'success' : 'warning'}
            title="Backend response"
          >
            The backend returned a{' '}
            {status === 'confirmed' ? 'confirmed' : 'pending'} redemption
            result.
          </Alert>
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
