'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
  loyaltyControllerEarnV1,
  type EarnTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input, Textarea } from '../ui';
import { MoneyInput } from '../shopcity';

export function EarnTransactionForm() {
  const router = useRouter();
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [overrideReason, setOverrideReason] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'confirmed' | 'pending' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('Submitting earn transaction…');

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
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );

      if (response.status === 201) {
        setStatus('confirmed');
        setMessage('Earn confirmed by backend contract.');
        router.refresh();
        return;
      }

      if (response.status === 202) {
        setStatus('pending');
        setMessage('Earn awaiting approval.');
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
      <Button type="submit" loading={status === 'submitting'}>
        Submit earn
      </Button>
      <p aria-live="polite" style={{ margin: 0, minHeight: '1.25rem' }}>
        {message || 'The backend decides the final state.'}
      </p>
    </form>
  );
}
