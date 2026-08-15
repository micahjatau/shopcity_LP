'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  redemptionsControllerRedeemV1,
  type RedeemTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input } from '../ui';
import { MoneyInput, Money, StatusBadge } from '../shopcity';

function createDraftKey() {
  return crypto.randomUUID();
}

export function RedeemTransactionForm() {
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [basketAmount, setBasketAmount] = useState<number | null>(null);
  const [requestedRedemption, setRequestedRedemption] = useState<number | null>(
    null,
  );
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'confirmed' | 'pending' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const draftSummary = useMemo(
    () => [
      { label: 'Card', value: cardSerialNumber || 'Scan or type a card serial' },
      { label: 'Receipt', value: receiptNumber || 'Optional' },
      {
        label: 'Basket',
        value: basketAmount === null ? 'Enter basket amount' : <Money amountKobo={basketAmount} />,
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
    [basketAmount, cardSerialNumber, receiptNumber, requestedRedemption],
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('Reviewing redemption…');

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
        createApiRequest({ csrf: true, idempotencyKey: idempotencyKeyRef.current }),
      );

      if (response.status === 201 || response.status === 202) {
        setStatus(response.status === 201 ? 'confirmed' : 'pending');
        setMessage(
          response.status === 201
            ? 'Redemption confirmed by backend contract.'
            : 'Redemption awaiting approval.',
        );
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
            style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sc-spacing-3)' }}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button type="submit" loading={status === 'submitting'}>
          Submit redemption
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
