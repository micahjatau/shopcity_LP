'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

  const lookupReady = Boolean(
    lookupContext?.cardSerialNumber || lookupContext?.customerName,
  );
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
  const resultingBalanceKobo =
    typeof lookupContext?.availableBalanceKobo === 'number' &&
    requestedRedemption !== null
      ? lookupContext.availableBalanceKobo - requestedRedemption
      : null;
  const needsReview =
    typeof maxAllowedRedemptionKobo === 'number' &&
    requestedRedemption !== null &&
    requestedRedemption > maxAllowedRedemptionKobo;

  const draftSummary = useMemo(
    () => [
      {
        label: 'Card',
        value: cardSerialNumber || 'Scan or type a card serial',
      },
      { label: 'Receipt', value: receiptNumber || 'Optional' },
      { label: 'Cashier', value: cashierId || 'Current session' },
      {
        label: 'Branch',
        value: branchId || lookupContext?.branchId || 'Current branch',
      },
      {
        label: 'Basket',
        value:
          basketAmount === null ? (
            'Enter basket amount'
          ) : (
            <Money amountKobo={basketAmount} />
          ),
      },
      {
        label: 'Requested',
        value:
          requestedRedemption === null ? (
            'Enter redemption amount'
          ) : (
            <Money amountKobo={requestedRedemption} />
          ),
      },
      { label: 'Draft key', value: idempotencyKeyRef.current.slice(0, 8) },
    ],
    [
      basketAmount,
      branchId,
      cardSerialNumber,
      cashierId,
      lookupContext?.branchId,
      receiptNumber,
      requestedRedemption,
    ],
  );

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
    setStatus('submitting');
    setMessage('Reviewing redemption…');
    setResponseData(null);

    if (basketAmount === null || requestedRedemption === null) {
      setStatus('error');
      setMessage('Enter both basket and requested redemption amounts.');
      return;
    }

    const payload: RedeemTransactionDto = {
      cardSerialNumber,
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
      setMessage(`Redemption failed with ${response.status}.`);
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
      <div
        style={{
          display: 'flex',
          gap: 'var(--sc-spacing-2)',
          flexWrap: 'wrap',
        }}
      >
        <StatusBadge
          label={lookupReady ? 'Context ready' : 'Awaiting lookup'}
          tone={lookupReady ? 'success' : 'warning'}
        />
        <StatusBadge
          label={`Draft ${idempotencyKeyRef.current.slice(0, 8)}`}
          tone="info"
        />
        {typeof maxAllowedRedemptionKobo === 'number' ? (
          <StatusBadge
            label={`Ceiling ${maxAllowedRedemptionKobo} kobo`}
            tone="neutral"
          />
        ) : null}
        {policyContext?.offlineRedemptionDisabled ? (
          <StatusBadge label="Offline disabled" tone="danger" />
        ) : null}
      </div>
      <Input
        aria-label="Card serial number"
        placeholder="Card serial"
        value={cardSerialNumber}
        onChange={(event) => setCardSerialNumber(event.target.value)}
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
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <strong>Draft summary</strong>
        {draftSummary.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--sc-spacing-3)',
            }}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
      <Table>
        <tbody>
          <tr>
            <th scope="row">Minimum redemption</th>
            <td>
              {policyContext?.minRedemptionKobo ? (
                <Money amountKobo={policyContext.minRedemptionKobo} />
              ) : (
                '—'
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">Maximum allowed</th>
            <td>
              {typeof maxAllowedRedemptionKobo === 'number' ? (
                <Money amountKobo={maxAllowedRedemptionKobo} />
              ) : (
                '—'
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">Approval threshold</th>
            <td>
              {policyContext?.redemptionApprovalThresholdKobo ? (
                <Money
                  amountKobo={policyContext.redemptionApprovalThresholdKobo}
                />
              ) : (
                '—'
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">Resulting balance</th>
            <td>
              {typeof resultingBalanceKobo === 'number' ? (
                <Money amountKobo={resultingBalanceKobo} />
              ) : (
                '—'
              )}
            </td>
          </tr>
        </tbody>
      </Table>
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
            basketAmount === null || requestedRedemption === null || needsReview
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

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
