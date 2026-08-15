'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
  redemptionsControllerRedeemV1,
  type RedeemTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input } from '../ui';
import { MoneyInput } from '../shopcity';

export function RedeemTransactionForm() {
  const router = useRouter();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('Submitting redemption…');

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
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );

      if (response.status === 201) {
        setStatus('confirmed');
        setMessage('Redemption confirmed by backend contract.');
        router.refresh();
        return;
      }

      if (response.status === 202) {
        setStatus('pending');
        setMessage('Redemption awaiting approval.');
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
      <Button type="submit" loading={status === 'submitting'}>
        Submit redemption
      </Button>
      <p aria-live="polite" style={{ margin: 0, minHeight: '1.25rem' }}>
        {message || 'The backend decides the final state.'}
      </p>
    </form>
  );
}
