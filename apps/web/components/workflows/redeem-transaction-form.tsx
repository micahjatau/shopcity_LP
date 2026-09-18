'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  redemptionsControllerRedeemV1,
  type RedeemTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Table } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';

function createDraftKey() {
  return crypto.randomUUID();
}

const redeemDraftStorageKey = 'shopcity-redeemdraft-v1';

type RedeemDraftState = {
  idempotencyKey: string;
  cardSerialNumber: string;
  receiptNumber: string;
  basketAmount: number | null;
  requestedRedemption: number | null;
  occurredAt: string;
};

type CashierPolicyContext = {
  minRedemptionKobo?: number;
  maxRedemptionBasketPercent?: number;
  redemptionApprovalThresholdKobo?: number;
  offlineRedemptionDisabled?: boolean;
};

type RedeemTransactionFormProps = {
  lookupContext?: {
    cardSerialNumber?: string;
    customerName?: string;
    availableBalanceKobo?: number | null;
    expiringCreditKobo?: number | null;
    receiptNumber?: string;
    branchId?: string | null;
  };
  policyContext?: CashierPolicyContext | null;
  cashierId?: string | null;
  branchId?: string | null;
};

export function RedeemTransactionForm({
  lookupContext,
  policyContext,
  cashierId,
  branchId,
}: RedeemTransactionFormProps) {
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [basketAmount, setBasketAmount] = useState<number | null>(null);
  const [requestedRedemption, setRequestedRedemption] = useState<number | null>(
    null,
  );
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'confirmed' | 'pending' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(redeemDraftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<RedeemDraftState>;
        if (typeof draft.idempotencyKey === 'string') {
          idempotencyKeyRef.current = draft.idempotencyKey;
        }
        if (typeof draft.cardSerialNumber === 'string') {
          setCardSerialNumber(draft.cardSerialNumber);
        }
        if (typeof draft.receiptNumber === 'string') {
          setReceiptNumber(draft.receiptNumber);
        }
        if (typeof draft.basketAmount === 'number') {
          setBasketAmount(draft.basketAmount);
        }
        if (typeof draft.requestedRedemption === 'number') {
          setRequestedRedemption(draft.requestedRedemption);
        }
        if (typeof draft.occurredAt === 'string') {
          setOccurredAt(draft.occurredAt);
        }
      }
    } catch {
      // Ignore malformed local drafts.
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!lookupContext) return;
    if (lookupContext.cardSerialNumber) {
      setCardSerialNumber(lookupContext.cardSerialNumber);
    }
    if (lookupContext.receiptNumber) {
      setReceiptNumber(lookupContext.receiptNumber);
    }
  }, [lookupContext]);

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined') return;
    const draft: RedeemDraftState = {
      idempotencyKey: idempotencyKeyRef.current,
      cardSerialNumber,
      receiptNumber,
      basketAmount,
      requestedRedemption,
      occurredAt,
    };
    window.localStorage.setItem(redeemDraftStorageKey, JSON.stringify(draft));
  }, [
    basketAmount,
    cardSerialNumber,
    draftHydrated,
    occurredAt,
    receiptNumber,
    requestedRedemption,
  ]);

  const authoritativeCardSerial = lookupContext?.cardSerialNumber?.trim() ?? '';
  const lookupReady = Boolean(authoritativeCardSerial);
  const maxAllowedByBasketKobo =
    basketAmount === null || !policyContext?.maxRedemptionBasketPercent
      ? null
      : Math.floor(
          (basketAmount * policyContext.maxRedemptionBasketPercent) / 100,
        );
  const maxAllowedRedemptionKobo =
    typeof lookupContext?.availableBalanceKobo === 'number' &&
    maxAllowedByBasketKobo !== null
      ? Math.min(lookupContext.availableBalanceKobo, maxAllowedByBasketKobo)
      : typeof lookupContext?.availableBalanceKobo === 'number'
        ? lookupContext.availableBalanceKobo
        : maxAllowedByBasketKobo;
  const needsReview =
    typeof maxAllowedRedemptionKobo === 'number' &&
    requestedRedemption !== null &&
    requestedRedemption > maxAllowedRedemptionKobo;

  function resetDraft() {
    idempotencyKeyRef.current = createDraftKey();
    setCardSerialNumber('');
    setReceiptNumber('');
    setBasketAmount(null);
    setRequestedRedemption(null);
    setOccurredAt(new Date().toISOString());
    setStatus('idle');
    setMessage('Draft cleared.');
    setResponseData(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('Reviewing redemption…');
    setResponseData(null);

    if (!lookupReady) {
      setStatus('error');
      setMessage('Look up an active customer card before submitting.');
      return;
    }

    if (basketAmount === null || requestedRedemption === null) {
      setStatus('error');
      setMessage('Enter both basket and requested redemption amounts.');
      return;
    }

    const payload: RedeemTransactionDto = {
      cardSerialNumber: authoritativeCardSerial,
      posReceiptNumber: receiptNumber,
      basketAmountKobo: basketAmount,
      requestedRedemptionKobo: requestedRedemption,
      occurredAt,
    };

    try {
      const response = await redemptionsControllerRedeemV1(
        payload,
        createApiRequest({
          csrf: true,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      );

      if (response.status === 201 || response.status === 202) {
        setStatus(response.status === 201 ? 'confirmed' : 'pending');
        setMessage(
          response.status === 201
            ? 'Redemption confirmed by backend contract.'
            : 'Redemption awaiting approval.',
        );
        setResponseData(
          response.data && typeof response.data === 'object'
            ? (response.data as Record<string, unknown>)
            : null,
        );
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(redeemDraftStorageKey);
        }
        idempotencyKeyRef.current = createDraftKey();
        setCardSerialNumber('');
        setReceiptNumber('');
        setBasketAmount(null);
        setRequestedRedemption(null);
        setOccurredAt(new Date().toISOString());
        router.refresh();
        return;
      }

      setStatus('error');
      setMessage(
        cashierRedeemErrorMessage(
          getResponseErrorCode(response.data),
          response.status,
        ),
      );
    } catch {
      setStatus('error');
      setMessage('Redemption could not be submitted.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}
    >
      <Alert tone="info" title="Review before submit">
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
      <Input
        aria-label="Card serial number"
        placeholder="Look up a card first"
        value={lookupReady ? authoritativeCardSerial : cardSerialNumber}
        readOnly={lookupReady}
        onChange={(event) => {
          if (!lookupReady) setCardSerialNumber(event.target.value);
        }}
      />
      <Input
        aria-label="POS receipt number"
        placeholder="Receipt number"
        value={receiptNumber}
        onChange={(event) => setReceiptNumber(event.target.value)}
      />
      <MoneyInput
        label="Basket amount"
        hint="Basket amount in naira"
        valueKobo={basketAmount}
        onValueChange={setBasketAmount}
      />
      <MoneyInput
        label="Requested redemption"
        hint="Requested redemption in naira"
        valueKobo={requestedRedemption}
        onValueChange={setRequestedRedemption}
      />
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
          disabled={
            !lookupReady ||
            basketAmount === null ||
            requestedRedemption === null ||
            needsReview
          }
        >
          Submit redemption
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
        <section style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
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

function getResponseErrorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as { error?: unknown; code?: unknown };
  if (typeof body.code === 'string') return body.code;
  if (body.error && typeof body.error === 'object') {
    const nested = body.error as { code?: unknown };
    return typeof nested.code === 'string' ? nested.code : null;
  }
  return null;
}

function cashierRedeemErrorMessage(code: string | null, status: number) {
  switch (code) {
    case 'RECEIPT_ALREADY_USED':
      return 'This receipt has already been used this week. Check the receipt number.';
    case 'CARD_NOT_FOUND':
    case 'CARD_INACTIVE':
      return 'This card cannot currently redeem credit. Confirm the card status.';
    case 'INSUFFICIENT_BALANCE':
      return 'Available credit is lower than this redemption.';
    case 'APPROVAL_REQUIRED':
      return 'Supervisor approval is required before this redemption can complete.';
    case 'AUTH_SESSION_EXPIRED':
      return 'Your session has expired. Sign in again before continuing.';
    default:
      return status === 0
        ? 'Redemption could not be submitted because the network is unavailable.'
        : `Redemption could not be submitted (status ${status}). Review the transaction and try again.`;
  }
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
