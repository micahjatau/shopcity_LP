'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loyaltyControllerEarnV1,
  type EarnTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Textarea } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';

function createDraftKey() {
  return crypto.randomUUID();
}

type EarnTransactionFormProps = {
  lookupContext?: {
    cardSerialNumber?: string;
    customerName?: string;
    availableBalanceKobo?: number | null;
    expiringCreditKobo?: number | null;
    receiptNumber?: string;
  };
};

export function EarnTransactionForm({ lookupContext }: EarnTransactionFormProps) {
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [overrideReason, setOverrideReason] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'confirmed' | 'pending' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!lookupContext) return;
    if (lookupContext.cardSerialNumber) {
      setCardSerialNumber(lookupContext.cardSerialNumber);
    }
    if (lookupContext.receiptNumber) {
      setReceiptNumber(lookupContext.receiptNumber);
    }
  }, [lookupContext]);

  const draftSummary = useMemo(
    () => [
      { label: 'Card', value: cardSerialNumber || 'Scan or type a card serial' },
      { label: 'Receipt', value: receiptNumber || 'Optional' },
      {
        label: 'Purchase',
        value: purchaseAmount === null ? 'Enter an amount' : <Money amountKobo={purchaseAmount} />,
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('Reviewing earn transaction…');

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
        createApiRequest({ csrf: true, idempotencyKey: idempotencyKeyRef.current }),
      );

      if (response.status === 201 || response.status === 202) {
        setStatus(response.status === 201 ? 'confirmed' : 'pending');
        setMessage(
          response.status === 201
            ? 'Earn confirmed by backend contract.'
            : 'Earn awaiting approval.',
        );
        router.refresh();
        return;
      }

      setStatus('error');
      setMessage(`Earn failed with ${response.status}.`);
    } catch {
      setStatus('error');
      setMessage('Earn could not be submitted.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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
              Available balance: <Money amountKobo={lookupContext.availableBalanceKobo} />.
            </>
          ) : null}
          {typeof lookupContext.expiringCreditKobo === 'number' ? (
            <>
              {' '}
              Expiring credit: <Money amountKobo={lookupContext.expiringCreditKobo} />.
            </>
          ) : null}
        </Alert>
      ) : null}
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
            style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sc-spacing-3)' }}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button type="submit" loading={status === 'submitting'}>
          Submit earn
        </Button>
        <Button type="button" variant="secondary" onClick={resetDraft}>
          Reset draft
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', alignItems: 'center' }}>
        <StatusBadge
          label={status === 'pending' ? 'Awaiting approval' : status === 'confirmed' ? 'Confirmed' : status === 'error' ? 'Error' : 'Draft'}
          tone={status === 'error' ? 'danger' : status === 'pending' ? 'warning' : status === 'confirmed' ? 'success' : 'neutral'}
        />
        <p aria-live="polite" style={{ margin: 0, minHeight: '1.25rem' }}>
          {message || 'The backend decides the final state.'}
        </p>
      </div>
    </form>
  );
}
