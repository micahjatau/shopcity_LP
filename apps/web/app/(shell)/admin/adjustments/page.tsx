'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adjustmentsControllerCreateV1 } from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Textarea } from '../../../../components/ui';

export default function AdminAdjustmentsPage() {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [kind, setKind] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [message, setMessage] = useState('Prepare an adjustment with consequence preview.');

  async function submit() {
    try {
      const response = await adjustmentsControllerCreateV1(
        { customerId, amountKobo: Number(amount), reason, kind } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(response.status === 201 ? 'Adjustment created.' : `Adjustment unavailable (${response.status}).`);
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
      <Alert tone="info" title="Review first">Adjustments should be deliberate and auditable.</Alert>
      <Input aria-label="Customer ID" placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
      <Input aria-label="Amount" placeholder="Amount in kobo" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <RadioGroup name="adjustment-kind" legend="Adjustment type" value={kind} onValueChange={(value) => setKind(value as 'CREDIT' | 'DEBIT')} options={[{ value: 'CREDIT', label: 'Credit' }, { value: 'DEBIT', label: 'Debit' }]} />
      <Textarea aria-label="Reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      <Button onClick={() => void submit()}>Submit adjustment</Button>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
    </section>
  );
}
