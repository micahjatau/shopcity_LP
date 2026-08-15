'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  cardsControllerCreateCardV1,
  cardsControllerLookupCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function AdminCardsPage() {
  const [serialNumber, setSerialNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [reason, setReason] = useState('');
  const [replaceConfirmation, setReplaceConfirmation] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
  const [statusConfirmation, setStatusConfirmation] = useState('');
  const [message, setMessage] = useState('Lookup a card, then assign, replace, or change status.');
  const [card, setCard] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup() {
    const serial = serialNumber.trim();
    if (!serial) {
      setMessage('Enter a card serial first.');
      return;
    }

    setBusy(true);
    setMessage(`Looking up ${serial}…`);
    try {
      const response = await cardsControllerLookupCardV1(
        serial,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setCard(response.data.data);
        setMessage(`Loaded card ${serial}.`);
        return;
      }
      setMessage(`Card unavailable (${response.status}).`);
    } catch {
      setMessage('Card unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function assignCard() {
    if (!serialNumber.trim() || !customerId.trim()) {
      setMessage('Enter both card serial and customer ID.');
      return;
    }
    setBusy(true);
    try {
      const response = await cardsControllerCreateCardV1(
        { serialNumber: serialNumber.trim(), customerId: customerId.trim() } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(response.status === 201 ? 'Card assigned.' : `Assign unavailable (${response.status}).`);
      await lookup();
    } catch {
      setMessage('Card assignment unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function replaceCard() {
    if (!card?.id || !newSerialNumber.trim()) {
      setMessage('Load a card and enter a replacement serial first.');
      return;
    }
    setBusy(true);
    try {
      if (replaceConfirmation.trim().toUpperCase() !== 'REPLACE') {
        setMessage('Type REPLACE to confirm the replacement.');
        return;
      }
      const response = await cardsControllerReplaceCardV1(
        card.id,
        { replacementSerialNumber: newSerialNumber.trim(), reason } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(response.status === 201 ? 'Replacement created.' : `Replacement unavailable (${response.status}).`);
      await lookup();
    } catch {
      setMessage('Replacement unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus() {
    if (!card?.id) {
      setMessage('Load a card first.');
      return;
    }
    setBusy(true);
    try {
      if (statusConfirmation.trim().toUpperCase() !== 'UPDATE') {
        setMessage('Type UPDATE to confirm the status change.');
        return;
      }
      const response = await cardsControllerUpdateStatusV1(
        card.id,
        { status, reason } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(response.status === 200 ? 'Card status updated.' : `Status update unavailable (${response.status}).`);
      await lookup();
    } catch {
      setMessage('Status update unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Cards</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Lookup, assign, replace, and status-manage cards.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>

      <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Input aria-label="Card serial" placeholder="Card serial" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
        <Input aria-label="Customer ID" placeholder="Customer ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
        <Input aria-label="Replacement serial" placeholder="Replacement serial" value={newSerialNumber} onChange={(event) => setNewSerialNumber(event.target.value)} />
      </div>
      <Input aria-label="Reason" placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Input aria-label="Replacement confirmation" placeholder="Type REPLACE to confirm" value={replaceConfirmation} onChange={(event) => setReplaceConfirmation(event.target.value)} />
      <RadioGroup
        name="card-status"
        legend="Status"
        value={status}
        onValueChange={(value) => setStatus(value as 'ACTIVE' | 'BLOCKED')}
        options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'BLOCKED', label: 'Blocked' }]}
      />
      <Input aria-label="Status confirmation" placeholder="Type UPDATE to confirm" value={statusConfirmation} onChange={(event) => setStatusConfirmation(event.target.value)} />
      <Alert tone="info" title="Deliberate changes">
        Card replacement and status updates require explicit confirmation words before submission.
      </Alert>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void lookup()} loading={busy}>Lookup card</Button>
        <Button variant="secondary" onClick={() => void assignCard()} loading={busy}>Assign card</Button>
        <Button variant="secondary" onClick={() => void replaceCard()} loading={busy}>Replace card</Button>
        <Button variant="ghost" onClick={() => void changeStatus()} loading={busy}>Update status</Button>
      </div>

      {card ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
            {card?.serialNumber ? <StatusBadge label={String(card.serialNumber)} tone="info" /> : null}
            {card?.status ? <StatusBadge label={String(card.status)} tone={card.status === 'ACTIVE' ? 'success' : 'warning'} /> : null}
            {card?.customer?.fullName ? <StatusBadge label={String(card.customer.fullName)} tone="neutral" /> : null}
          </div>
          <Table>
            <tbody>
              {Object.entries(card).slice(0, 10).map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{renderValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <Alert tone="warning" title="No card loaded">
          Use lookup to inspect the current card state.
        </Alert>
      )}

      {typeof card?.availableBalanceKobo === 'number' ? (
        <Money amountKobo={card.availableBalanceKobo} />
      ) : null}
      {card?.status ? <StatusBadge label={card.status} tone="info" /> : null}
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
