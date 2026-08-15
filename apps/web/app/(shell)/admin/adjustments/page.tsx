'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { adjustmentsControllerCreateV1 } from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Textarea } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function AdminAdjustmentsPage() {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [kind, setKind] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [message, setMessage] = useState('Prepare an adjustment with consequence preview.');
  const amountKobo = Number(amount);

  const preview = useMemo(() => {
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) return null;
    return {
      label: kind === 'CREDIT' ? 'Credit' : 'Debit',
      amountKobo,
      impact: kind === 'CREDIT' ? 'Balance increases' : 'Balance decreases',
    };
  }, [amountKobo, kind]);

  async function submit() {
    if (confirmation.trim().toUpperCase() !== 'SUBMIT') {
      setMessage('Type SUBMIT to confirm the adjustment.');
      return;
    }

    try {
      const response = await adjustmentsControllerCreateV1(
        { customerId, amountKobo: Number(amount), reason, kind, effectiveAt: new Date().toISOString() } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(response.status === 201 ? 'Adjustment created.' : `Adjustment unavailable (${response.status}).`);
      if (response.status === 201) {
        setConfirmation('');
      }
    } catch {
      setMessage('Adjustment unavailable.');
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Adjustments</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Manual credit and debit adjustments with consequence preview.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <Alert tone="info" title="Review first">Adjustments are audited and should be submitted deliberately.</Alert>
      <Input aria-label="Customer ID" placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
      <Input aria-label="Amount" placeholder="Amount in kobo" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <RadioGroup name="adjustment-kind" legend="Adjustment type" value={kind} onValueChange={(value) => setKind(value as 'CREDIT' | 'DEBIT')} options={[{ value: 'CREDIT', label: 'Credit' }, { value: 'DEBIT', label: 'Debit' }]} />
      <Textarea aria-label="Reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      {preview ? (
        <Alert tone={kind === 'CREDIT' ? 'success' : 'warning'} title="Consequence preview">
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
            <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
              <StatusBadge label={preview.label} tone={kind === 'CREDIT' ? 'success' : 'warning'} />
              <StatusBadge label={preview.impact} tone="info" />
            </div>
            <Money amountKobo={preview.amountKobo} />
          </div>
        </Alert>
      ) : null}
      <Input aria-label="Confirmation" placeholder="Type SUBMIT to confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      <Button onClick={() => void submit()}>Submit adjustment</Button>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
    </section>
  );
}
