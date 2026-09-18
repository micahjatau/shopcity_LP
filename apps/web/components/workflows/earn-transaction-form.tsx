'use client';

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
};
export function EarnTransactionForm({
  lookupContext,
  policyContext,
  cashierId,
  deviceId,
  branchId,
  branchTimezone,
  receiptWeekStartDay,
}: EarnTransactionFormProps) {
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
  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}
      data-od-id="capture-form"
    >
      <Alert tone="info" title="Review before submit" data-od-id="capture-review">
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
      <div data-od-id="capture-receipt">
        <Input
          aria-label="POS receipt number"
        aria-required="true"
        placeholder="Receipt number (required)"
        value={receiptNumber}
        onChange={(event) => setReceiptNumber(event.target.value)}
      />
        {!receiptNumber ? <span className="cashier-workflow-hint">Required</span> : null}
      </div>
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
          Submit earn
        </Button>
        <Button type="button" variant="secondary" onClick={resetDraft}>
          Reset draft
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
          style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}
          data-od-id="capture-success"
        >
          <Alert
            tone={status === 'confirmed' ? 'success' : 'warning'}
            title="Backend response"
          >
            The backend returned a{' '}
            {status === 'confirmed' ? 'confirmed' : 'pending'} earn result.
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
