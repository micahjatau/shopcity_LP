'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loyaltyControllerEarnV1,
  type EarnTransactionDto,
} from '../../lib/api/generated-client';
import { saveOfflineEarnRecord } from '../../lib/browser/offline-earn-queue';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Textarea, Table } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';

function createDraftKey() {
  return crypto.randomUUID();
}

const earnDraftStorageKey = 'shopcity-earnedraft-v1';

type EarnDraftState = {
  idempotencyKey: string;
  cardSerialNumber: string;
  receiptNumber: string;
  purchaseAmount: number | null;
  occurredAt: string;
  overrideReason: string;
};

type CashierPolicyContext = {
  defaultEarnRateBps?: number;
  purchaseFlagThresholdKobo?: number;
  purchaseApprovalThresholdKobo?: number;
  redemptionApprovalThresholdKobo?: number;
  minRedemptionKobo?: number;
  maxRedemptionBasketPercent?: number;
  offlineRedemptionDisabled?: boolean;
};

type EarnTransactionFormProps = {
  lookupContext?: {
    cardSerialNumber?: string;
    customerId?: string | null;
    customerName?: string;
    availableBalanceKobo?: number | null;
    expiringCreditKobo?: number | null;
    receiptNumber?: string;
    branchId?: string | null;
  };
  policyContext?: CashierPolicyContext | null;
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
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [overrideReason, setOverrideReason] = useState('');
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
      const raw = window.localStorage.getItem(earnDraftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<EarnDraftState>;
        if (typeof draft.idempotencyKey === 'string') {
          idempotencyKeyRef.current = draft.idempotencyKey;
        }
        if (typeof draft.cardSerialNumber === 'string') {
          setCardSerialNumber(draft.cardSerialNumber);
        }
        if (typeof draft.receiptNumber === 'string') {
          setReceiptNumber(draft.receiptNumber);
        }
        if (typeof draft.purchaseAmount === 'number') {
          setPurchaseAmount(draft.purchaseAmount);
        }
        if (typeof draft.occurredAt === 'string') {
          setOccurredAt(draft.occurredAt);
        }
        if (typeof draft.overrideReason === 'string') {
          setOverrideReason(draft.overrideReason);
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
    const draft: EarnDraftState = {
      idempotencyKey: idempotencyKeyRef.current,
      cardSerialNumber,
      receiptNumber,
      purchaseAmount,
      occurredAt,
      overrideReason,
    };
    window.localStorage.setItem(earnDraftStorageKey, JSON.stringify(draft));
  }, [
    cardSerialNumber,
    draftHydrated,
    occurredAt,
    overrideReason,
    purchaseAmount,
    receiptNumber,
  ]);

  const lookupReady = Boolean(
    lookupContext?.cardSerialNumber || lookupContext?.customerName,
  );
  const expectedCreditKobo =
    purchaseAmount === null || !policyContext?.defaultEarnRateBps
      ? null
      : Math.round((purchaseAmount * policyContext.defaultEarnRateBps) / 10000);
  const approvalFlagThresholdKobo =
    policyContext?.purchaseFlagThresholdKobo ?? null;
  const approvalThresholdKobo =
    policyContext?.purchaseApprovalThresholdKobo ?? null;

  const draftSummary = useMemo(
    () => [
      {
        label: 'Card',
        value: cardSerialNumber || 'Scan or type a card serial',
      },
      { label: 'Receipt', value: receiptNumber || 'Optional' },
      {
        label: 'Purchase',
        value:
          purchaseAmount === null ? (
            'Enter an amount'
          ) : (
            <Money amountKobo={purchaseAmount} />
          ),
      },
      { label: 'Draft key', value: idempotencyKeyRef.current.slice(0, 8) },
    ],
    [cardSerialNumber, purchaseAmount, receiptNumber],
  );

  function resetDraft() {
    idempotencyKeyRef.current = createDraftKey();
    setCardSerialNumber('');
    setReceiptNumber('');
    setPurchaseAmount(null);
    setOccurredAt(new Date().toISOString());
    setOverrideReason('');
    setStatus('idle');
    setMessage('Draft cleared.');
    setResponseData(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('Reviewing earn transaction…');
    setResponseData(null);

    if (purchaseAmount === null) {
      setStatus('error');
      setMessage('Enter a valid purchase amount before submitting.');
      return;
    }

    const payload: EarnTransactionDto = {
      cardSerialNumber,
      posReceiptNumber: receiptNumber,
      purchaseAmountKobo: purchaseAmount,
      occurredAt,
      overrideReason: overrideReason.trim() || undefined,
    };

    try {
      const response = await loyaltyControllerEarnV1(
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
            ? 'Earn confirmed by backend contract.'
            : 'Earn awaiting approval.',
        );
        setResponseData(
          response.data && typeof response.data === 'object'
            ? response.data
            : null,
        );
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(earnDraftStorageKey);
        }
        idempotencyKeyRef.current = createDraftKey();
        setCardSerialNumber('');
        setReceiptNumber('');
        setPurchaseAmount(null);
        setOccurredAt(new Date().toISOString());
        setOverrideReason('');
        router.refresh();
        return;
      }

      setStatus('error');
      setMessage(`Earn failed with ${response.status}.`);
    } catch {
      setStatus('error');
      setMessage('Earn could not be submitted.');

      const offlineBranchId = branchId ?? lookupContext?.branchId ?? null;
      if (!deviceId || !offlineBranchId) {
        setMessage(
          'Earn could not be submitted. Offline save is unavailable until the device-bound session is ready.',
        );
        return;
      }

      try {
        const offlineResult = await saveOfflineEarnRecord({
          localId: crypto.randomUUID(),
          idempotencyKey: idempotencyKeyRef.current,
          cashierId: cashierId ?? '',
          branchId: offlineBranchId,
          deviceId,
          customerId: lookupContext?.customerId ?? undefined,
          cardBarcode: cardSerialNumber.trim(),
          receiptNumber: receiptNumber.trim(),
          receiptWeekStart: deriveReceiptWeekStart(
            branchTimezone ?? null,
            receiptWeekStartDay ?? null,
            occurredAt,
          ),
          purchaseAmountKobo: purchaseAmount ?? 0,
          occurredAtLocal: occurredAt,
          syncState: 'waiting-to-sync',
          lastError: 'Earn request failed before reaching the backend.',
          serverTransactionId: null,
          serverApprovalId: null,
        });

        if (offlineResult.ok) {
          setStatus('pending');
          setMessage('Earn could not be submitted. Saved locally for sync.');
          return;
        }

        setMessage(
          `Earn could not be saved locally for sync (${offlineResult.error}).`,
        );
      } catch {
        // Keep the network error state if offline capture fails.
      }
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}
    >
      <Alert tone="info" title="Review before submit">
        Use lookup first, confirm the customer context, then submit the earn.
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
        {policyContext?.defaultEarnRateBps ? (
          <StatusBadge
            label={`Earn ${policyContext.defaultEarnRateBps / 100}%`}
            tone="neutral"
          />
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
      {policyContext ? (
        <Table>
          <tbody>
            <tr>
              <th scope="row">Expected credit</th>
              <td>
                {expectedCreditKobo === null ? (
                  'Enter purchase amount'
                ) : (
                  <Money amountKobo={expectedCreditKobo} />
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Flag threshold</th>
              <td>
                {approvalFlagThresholdKobo === null ? (
                  '—'
                ) : (
                  <Money amountKobo={approvalFlagThresholdKobo} />
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Approval threshold</th>
              <td>
                {approvalThresholdKobo === null ? (
                  '—'
                ) : (
                  <Money amountKobo={approvalThresholdKobo} />
                )}
              </td>
            </tr>
          </tbody>
        </Table>
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
          disabled={purchaseAmount === null}
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
        <section style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
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

function deriveReceiptWeekStart(
  timezone: string | null,
  receiptWeekStartDay: number | null,
  occurredAt: string,
) {
  if (
    typeof receiptWeekStartDay !== 'number' ||
    receiptWeekStartDay < 0 ||
    receiptWeekStartDay > 6
  ) {
    return occurredAt;
  }

  const reference = new Date(occurredAt);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone ?? 'UTC',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((part) => part.type === 'weekday')?.value ?? '',
  );
  if (weekday < 0) {
    return occurredAt;
  }

  const deltaDays = (7 + weekday - receiptWeekStartDay) % 7;
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone ?? 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const year = Number(dateParts.find((part) => part.type === 'year')?.value);
  const month = Number(dateParts.find((part) => part.type === 'month')?.value);
  const day = Number(dateParts.find((part) => part.type === 'day')?.value);
  if (!year || !month || !day) {
    return occurredAt;
  }

  const localDate = new Date(Date.UTC(year, month - 1, day));
  localDate.setUTCDate(localDate.getUTCDate() - deltaDays);
  return localDate.toISOString();
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
