'use client';

import { ArrowLeft, Copy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Input } from '../ui';
import { Money, MoneyInput } from '../shopcity';
import {
  useRedeemTransactionController,
  type RedeemLookupContext,
  type RedeemPolicyContext,
} from './use-redeem-transaction-controller';
import { SupervisorVirtualCardPreview } from './supervisor-virtual-card-preview';

type RedeemTransactionFormProps = {
  lookupContext?: RedeemLookupContext;
  policyContext?: RedeemPolicyContext | null;
  cashierId?: string | null;
  branchId?: string | null;
  cashierDisplayName?: string;
  onFlowStepChange?: (step: number) => void;
  onBackToLookup?: () => void;
};

type RedeemStage = 2 | 3 | 4;
type RedeemResponse = Record<string, unknown>;

export function RedeemTransactionForm({
  lookupContext,
  policyContext,
  cashierId,
  branchId,
  cashierDisplayName = 'Cashier',
  onFlowStepChange,
  onBackToLookup,
}: RedeemTransactionFormProps) {
  const [stage, setStage] = useState<RedeemStage>(2);
  const [copyMessage, setCopyMessage] = useState('');
  const {
    authoritativeCardSerial,
    basketAmount,
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
    onFlowStepChange?.(status === 'confirmed' ? 4 : stage - 1);
  }, [onFlowStepChange, stage, status]);

  const response = unwrapRedeemResponse(responseData);
  const customerPaysKobo = numberField(response, 'netPaidAmountKobo');
  const minimumRedemptionKobo = policyContext?.minRedemptionKobo;
  const limitDetails = [
    policyContext?.maxRedemptionBasketPercent && basketAmount !== null ? (
      <span key="basket-cap">
        {policyContext.maxRedemptionBasketPercent}% of{' '}
        <Money amountKobo={basketAmount} />
      </span>
    ) : null,
    typeof lookupContext?.availableBalanceKobo === 'number' ? (
      <span key="wallet-balance">
        wallet balance <Money amountKobo={lookupContext.availableBalanceKobo} />
      </span>
    ) : null,
    typeof minimumRedemptionKobo === 'number' ? (
      <span key="minimum">
        minimum <Money amountKobo={minimumRedemptionKobo} />
      </span>
    ) : null,
  ].filter(Boolean);

  async function copyCardNumber() {
    if (!authoritativeCardSerial) return;
    try {
      await navigator.clipboard.writeText(authoritativeCardSerial);
      setCopyMessage('Virtual card number copied.');
    } catch {
      setCopyMessage('Could not copy the card number. Select it manually.');
    }
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      status === 'submitting' ||
      status === 'confirmed' ||
      status === 'pending'
    )
      return;
    if (stage === 2) {
      if (!lookupReady || basketAmount === null || !receiptNumber.trim())
        return;
      setStage(3);
      return;
    }
    if (stage === 3) {
      if (
        requestedRedemption === null ||
        requestedRedemption <= 0 ||
        needsReview
      )
        return;
      setStage(4);
      return;
    }
    void handleSubmit(event);
  }

  function goBack() {
    if (stage === 2) {
      onBackToLookup?.();
      return;
    }
    setStage(stage === 4 ? 3 : 2);
  }

  return (
    <form
      onSubmit={advance}
      className="cashier-transaction-form cashier-redeem-form"
      data-od-id="redeem-form"
      data-stage={
        status === 'confirmed'
          ? 'success'
          : status === 'pending'
            ? 'pending'
            : stage
      }
    >
      {!response ? (
        <>
          {stage === 2 ? (
            <section
              className="cashier-redeem-stage"
              data-od-id="redeem-basket"
              aria-labelledby="redeem-basket-title"
            >
              <div className="cashier-stage-heading">
                <h2
                  id="redeem-basket-title"
                  className="cashier-stage-heading-title"
                >
                  Step 2 — Basket subtotal
                </h2>
                <p className="cashier-stage-heading-description">
                  Enter the subtotal shown on the POS after the basket is
                  scanned.
                </p>
              </div>
              <div className="cashier-redeem-customer-layout">
                <dl className="cashier-redeem-customer-details">
                  <RedeemCustomerField
                    label="Customer"
                    value={lookupContext?.customerName || 'Not provided'}
                  />
                  <RedeemCustomerField
                    label="Email"
                    value={lookupContext?.maskedEmail || 'Not provided'}
                  />
                  <RedeemCustomerField
                    label="Phone number"
                    value={lookupContext?.maskedPhone || 'Not provided'}
                  />
                  <div className="cashier-redeem-customer-field">
                    <dt>Virtual Card Number</dt>
                    <dd>
                      <span>{authoritativeCardSerial || 'Not provided'}</span>
                      {authoritativeCardSerial ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          className="cashier-redeem-copy-button"
                          aria-label={`Copy virtual card number ${authoritativeCardSerial}`}
                          onClick={() => void copyCardNumber()}
                        >
                          <Copy aria-hidden="true" size={14} />
                        </Button>
                      ) : null}
                    </dd>
                  </div>
                  <RedeemCustomerField
                    label="Available Credit"
                    value={
                      typeof lookupContext?.availableBalanceKobo ===
                      'number' ? (
                        <Money
                          amountKobo={lookupContext.availableBalanceKobo}
                        />
                      ) : (
                        'Not provided'
                      )
                    }
                  />
                  <MoneyInput
                    label="Basket subtotal (₦)"
                    hint="Enter the POS basket subtotal in naira."
                    valueKobo={basketAmount}
                    onValueChange={setBasketAmount}
                  />
                  <div className="cashier-redeem-field">
                    <label htmlFor="redeem-pos-receipt-number">
                      POS receipt number
                    </label>
                    <Input
                      id="redeem-pos-receipt-number"
                      className="cashier-redeem-receipt-number"
                      placeholder="e.g. RC-0297"
                      value={receiptNumber}
                      onChange={(event) => setReceiptNumber(event.target.value)}
                      required
                    />
                  </div>
                </dl>
                <div className="cashier-redeem-card-preview">
                  <SupervisorVirtualCardPreview
                    confirmation
                    customerName={lookupContext?.customerName || 'Customer'}
                    serialNumber={authoritativeCardSerial || 'Not provided'}
                    status={lookupContext?.cardStatus || 'Not provided'}
                  />
                  <p className="cashier-capture-card-preview__status">
                    Status: {lookupContext?.cardStatus || 'Not provided'}
                  </p>
                </div>
              </div>
              <p
                className="cashier-redeem-copy-status"
                role="status"
                aria-live="polite"
              >
                {copyMessage}
              </p>
              <RedeemFormActions
                backLabel="Back"
                nextLabel="Proceed"
                onBack={goBack}
                disabled={
                  !lookupReady || basketAmount === null || !receiptNumber.trim()
                }
              />
            </section>
          ) : null}

          {stage === 3 ? (
            <section
              className="cashier-redeem-stage"
              data-od-id="redeem-amount"
              aria-labelledby="redeem-amount-title"
            >
              <div className="cashier-stage-heading">
                <h2
                  id="redeem-amount-title"
                  className="cashier-stage-heading-title"
                >
                  Step 3 — Redemption amount
                </h2>
                <p className="cashier-stage-heading-description">
                  Enter the amount to redeem.
                </p>
              </div>
              <div className="cashier-redeem-limit-card">
                <span>Customer can redeem up to</span>
                <strong>
                  {maxAllowedRedemptionKobo === null ? (
                    'Not available'
                  ) : (
                    <Money amountKobo={maxAllowedRedemptionKobo} />
                  )}
                </strong>
                {limitDetails.length ? (
                  <p>
                    {limitDetails.map((detail, index) => (
                      <span key={index}>
                        {index > 0 ? ' · ' : ''}
                        {detail}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p>Redemption limits are verified by the server.</p>
                )}
              </div>
              <div className="cashier-redeem-amount-controls">
                <MoneyInput
                  label="Redemption amount (₦)"
                  hint="Enter the amount of credit to apply."
                  valueKobo={requestedRedemption}
                  onValueChange={setRequestedRedemption}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="cashier-redeem-maximum-button"
                  disabled={
                    maxAllowedRedemptionKobo === null ||
                    maxAllowedRedemptionKobo <= 0
                  }
                  onClick={() => {
                    if (maxAllowedRedemptionKobo !== null)
                      setRequestedRedemption(maxAllowedRedemptionKobo);
                  }}
                >
                  Use maximum
                </Button>
              </div>
              <RedeemBasketBreakdown
                basketAmountKobo={basketAmount}
                creditKobo={requestedRedemption}
                customerPaysKobo={
                  basketAmount !== null && requestedRedemption !== null
                    ? Math.max(0, basketAmount - requestedRedemption)
                    : null
                }
              />
              {needsReview ? (
                <Alert tone="warning" title="Review required">
                  The requested redemption exceeds the current calculated
                  maximum.
                </Alert>
              ) : null}
              <RedeemFormActions
                backLabel="Back"
                nextLabel="Proceed"
                onBack={goBack}
                disabled={
                  requestedRedemption === null ||
                  requestedRedemption <= 0 ||
                  needsReview
                }
              />
            </section>
          ) : null}

          {stage === 4 ? (
            <section
              className="cashier-redeem-stage"
              data-od-id="redeem-confirmation"
              aria-labelledby="redeem-confirmation-title"
            >
              <div className="cashier-stage-heading">
                <h2
                  id="redeem-confirmation-title"
                  className="cashier-stage-heading-title"
                >
                  Step 4 — Confirm redemption
                </h2>
                <p className="cashier-stage-heading-description">
                  Review the redemption before sending the request for
                  authoritative server validation.
                </p>
              </div>
              <RedeemBasketBreakdown
                basketAmountKobo={basketAmount}
                creditKobo={requestedRedemption}
                customerPaysKobo={
                  basketAmount !== null && requestedRedemption !== null
                    ? Math.max(0, basketAmount - requestedRedemption)
                    : null
                }
              />
              <dl className="cashier-redeem-review-grid">
                <RedeemCustomerField
                  label="Customer"
                  value={lookupContext?.customerName || 'Not provided'}
                />
                <RedeemCustomerField
                  label="POS receipt number"
                  value={receiptNumber || 'Not provided'}
                />
                <RedeemCustomerField
                  label="Card number"
                  value={authoritativeCardSerial || 'Not provided'}
                />
                <RedeemCustomerField
                  label="Available credit before redemption"
                  value={
                    typeof lookupContext?.availableBalanceKobo === 'number' ? (
                      <Money amountKobo={lookupContext.availableBalanceKobo} />
                    ) : (
                      'Not provided'
                    )
                  }
                />
              </dl>
              <details className="cashier-redeem-time-details">
                <summary>Transaction time</summary>
                <div>
                  <label htmlFor="redeem-occurred-at">Occurred at</label>
                  <Input
                    id="redeem-occurred-at"
                    type="datetime-local"
                    value={occurredAt.slice(0, 16)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value && !Number.isNaN(new Date(value).getTime()))
                        setOccurredAt(new Date(value).toISOString());
                    }}
                  />
                </div>
              </details>
              {status === 'error' ? (
                <Alert tone="danger" title="Redemption not submitted">
                  {message}
                </Alert>
              ) : null}
              <RedeemFormActions
                backLabel="Back"
                nextLabel={
                  status === 'submitting' ? 'Submitting…' : 'Confirm redemption'
                }
                onBack={goBack}
                disabled={
                  !lookupReady ||
                  basketAmount === null ||
                  requestedRedemption === null ||
                  !receiptNumber.trim() ||
                  needsReview ||
                  status === 'submitting'
                }
                loading={status === 'submitting'}
              />
              {status === 'idle' && message ? (
                <p className="cashier-redeem-form-message" role="status">
                  {message}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <RedeemOutcome
          status={status}
          message={message}
          response={response}
          cashierDisplayName={cashierDisplayName}
          customerName={lookupContext?.customerName || 'Not provided'}
          customerId={lookupContext?.customerId}
          lookupBalanceKobo={lookupContext?.availableBalanceKobo ?? null}
          customerPaysKobo={customerPaysKobo}
          resetDraft={resetDraft}
          setStage={setStage}
          onFlowStepChange={onFlowStepChange}
          onBackToLookup={onBackToLookup}
        />
      )}
    </form>
  );
}

function RedeemCustomerField({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="cashier-redeem-customer-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RedeemFormActions({
  backLabel,
  nextLabel,
  onBack,
  disabled,
  loading = false,
}: Readonly<{
  backLabel: string;
  nextLabel: string;
  onBack: () => void;
  disabled?: boolean;
  loading?: boolean;
}>) {
  return (
    <div className="cashier-redeem-actions">
      <Button
        type="button"
        variant="secondary"
        className="cashier-redeem-back-button"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" size={14} />
        {backLabel}
      </Button>
      <Button type="submit" disabled={disabled} loading={loading}>
        {nextLabel}
      </Button>
    </div>
  );
}

function RedeemBasketBreakdown({
  basketAmountKobo,
  creditKobo,
  customerPaysKobo,
}: Readonly<{
  basketAmountKobo: number | null;
  creditKobo: number | null;
  customerPaysKobo: number | null;
}>) {
  return (
    <dl className="cashier-redeem-breakdown">
      <div>
        <dt>Basket</dt>
        <dd>
          {basketAmountKobo === null ? (
            'Not provided'
          ) : (
            <Money amountKobo={basketAmountKobo} />
          )}
        </dd>
      </div>
      <div>
        <dt>ShopCity Credit</dt>
        <dd className="cashier-redeem-breakdown__credit">
          {creditKobo === null ? (
            'Not provided'
          ) : (
            <Money amountKobo={creditKobo} />
          )}
        </dd>
      </div>
      <div className="cashier-redeem-breakdown__total">
        <dt>Customer pays</dt>
        <dd>
          {customerPaysKobo === null ? (
            'Not provided'
          ) : (
            <Money amountKobo={customerPaysKobo} />
          )}
        </dd>
      </div>
    </dl>
  );
}

function RedeemOutcome({
  status,
  message,
  response,
  cashierDisplayName,
  customerName,
  customerId,
  lookupBalanceKobo,
  customerPaysKobo,
  resetDraft,
  setStage,
  onFlowStepChange,
  onBackToLookup,
}: Readonly<{
  status: 'confirmed' | 'pending' | 'error' | 'idle' | 'submitting';
  message: string;
  response: RedeemResponse;
  cashierDisplayName: string;
  customerName: string;
  customerId?: string;
  lookupBalanceKobo: number | null;
  customerPaysKobo: number | null;
  resetDraft: () => void;
  setStage: (value: RedeemStage) => void;
  onFlowStepChange?: (step: number) => void;
  onBackToLookup?: () => void;
}>) {
  const confirmed = status === 'confirmed';
  const id =
    stringField(response, 'redemptionId') ?? stringField(response, 'id');
  const state = stringField(response, 'state');
  const receiptNumber = stringField(response, 'posReceiptNumber');
  const serverBasketKobo = numberField(response, 'basketAmountKobo');
  const serverRedeemedKobo = numberField(response, 'redeemedAmountKobo');
  const serverCustomerPays = numberField(response, 'netPaidAmountKobo');
  const serverEarnedKobo = numberField(response, 'earnedKobo');
  const earnTransactionId = stringField(response, 'earnTransactionId');
  const remainingBalance = numberField(response, 'remainingBalanceKobo');
  const smsStatus = stringField(response, 'smsStatus');

  function done() {
    if (onBackToLookup) {
      onBackToLookup();
      return;
    }
    resetDraft();
    setStage(2);
    onFlowStepChange?.(0);
  }

  return (
    <section
      className={`cashier-redeem-outcome ${confirmed ? 'is-confirmed' : 'is-pending'}`}
      data-od-id="redeem-success"
      aria-live="polite"
      aria-label={
        confirmed ? 'Redemption successful' : 'Redemption pending approval'
      }
    >
      <div className="cashier-redeem-outcome__header">
        {confirmed ? (
          <Image
            src="/brand/cashier/redeem-success-illustration.svg"
            alt=""
            aria-hidden="true"
            width={197.357}
            height={207.565}
          />
        ) : (
          <div
            className="cashier-redeem-outcome__pending-icon"
            aria-hidden="true"
          >
            …
          </div>
        )}
        <h2>
          {confirmed ? 'Redemption successful' : 'Redemption pending approval'}
        </h2>
        <p>
          {confirmed
            ? message
            : 'The request is awaiting supervisor approval; no completed debit is claimed.'}
        </p>
      </div>
      <div
        className={`cashier-redeem-outcome__amount ${confirmed ? '' : 'is-pending'}`}
      >
        <span>Credit redeemed</span>
        <strong>
          {serverRedeemedKobo === null ? (
            'Pending approval'
          ) : (
            <Money amountKobo={serverRedeemedKobo} />
          )}
        </strong>
      </div>
      <dl className="cashier-redeem-outcome__details">
        {id ? (
          <RedeemCustomerField
            label="Redemption ID"
            value={<code>{id}</code>}
          />
        ) : null}
        <RedeemCustomerField label="Customer" value={customerName} />
        {receiptNumber ? (
          <RedeemCustomerField
            label="POS receipt number"
            value={receiptNumber}
          />
        ) : null}
        {serverBasketKobo !== null ? (
          <RedeemCustomerField
            label="Basket subtotal"
            value={<Money amountKobo={serverBasketKobo} />}
          />
        ) : null}
        {confirmed ? (
          <RedeemCustomerField
            label="Amount paid after redemption"
            value={
              serverCustomerPays === null ? (
                'Not available for this earlier transaction'
              ) : (
                <Money amountKobo={serverCustomerPays} />
              )
            }
          />
        ) : null}
        {confirmed ? (
          <RedeemCustomerField
            label="Credit earned on amount paid"
            value={
              serverEarnedKobo === null ? (
                'Not available for this earlier transaction'
              ) : (
                <Money amountKobo={serverEarnedKobo} />
              )
            }
          />
        ) : null}
        {earnTransactionId ? (
          <RedeemCustomerField
            label="Earn transaction ID"
            value={<code>{earnTransactionId}</code>}
          />
        ) : null}
        {lookupBalanceKobo !== null ? (
          <RedeemCustomerField
            label="Balance before (verified lookup)"
            value={<Money amountKobo={lookupBalanceKobo} />}
          />
        ) : null}
        {remainingBalance !== null ? (
          <RedeemCustomerField
            label="Remaining wallet balance"
            value={<Money amountKobo={remainingBalance} />}
          />
        ) : null}
        {smsStatus ? (
          <RedeemCustomerField label="Notification status" value={smsStatus} />
        ) : null}
        {state ? (
          <RedeemCustomerField
            label="Status"
            value={
              state === 'CONFIRMED'
                ? 'Confirmed'
                : state === 'PENDING_APPROVAL'
                  ? 'Pending approval'
                  : state
            }
          />
        ) : null}
        <RedeemCustomerField label="Captured by" value={cashierDisplayName} />
      </dl>
      {status === 'error' ? (
        <Alert tone="danger" title="Redemption not submitted">
          {message}
        </Alert>
      ) : null}
      <div className="cashier-redeem-outcome__actions">
        <Button
          type="button"
          className="cashier-redeem-primary-button"
          onClick={done}
        >
          Done
        </Button>
        {customerId ? (
          <Link
            className="cashier-redeem-secondary-link"
            href={`/cashier/customers?id=${encodeURIComponent(customerId)}`}
          >
            View customer
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function unwrapRedeemResponse(
  value: RedeemResponse | null,
): RedeemResponse | null {
  if (!value) return null;
  const nested = value.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested))
    return nested as RedeemResponse;
  return value;
}

function stringField(value: RedeemResponse, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' && field.trim() ? field : null;
}

function numberField(value: RedeemResponse | null, key: string): number | null {
  const field = value?.[key];
  return typeof field === 'number' && Number.isSafeInteger(field)
    ? field
    : null;
}
