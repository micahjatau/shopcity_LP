'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  cardsControllerCreateCardV1,
  cardsControllerLookupCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import {
  Alert,
  Button,
  Input,
  RadioGroup,
  Table,
} from '../../../../components/ui';
import { Money, StatusBadge, type StatusTone } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/branches', 'Branches'],
  ['/admin/audit', 'Audit'],
] as const;

export default function AdminCardsPage() {
  const [serialNumber, setSerialNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [reason, setReason] = useState('');
  const [assignConfirmation, setAssignConfirmation] = useState('');
  const [replaceConfirmation, setReplaceConfirmation] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
  const [statusConfirmation, setStatusConfirmation] = useState('');
  const [message, setMessage] = useState(
    'Lookup a card, then assign, replace, or change status.',
  );
  const [actionMessage, setActionMessage] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [card, setCard] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const cardStatusTone = useMemo<StatusTone>(() => {
    if (card?.status === 'ACTIVE') return 'success';
    if (card?.status === 'BLOCKED') return 'warning';
    return 'neutral';
  }, [card?.status]);

  const selectedPreview = card
    ? [
        ['Serial', card.serialNumber ?? serialNumber ?? '—'],
        ['Customer', card.customer?.fullName ?? card.customerId ?? '—'],
        ['Status', card.status ?? '—'],
        ['Balance', card.availableBalanceKobo],
        ['Replacement serial', newSerialNumber || 'Enter a new serial'],
        ['Requested status', status],
      ]
    : [];

  const routeSummary = card
    ? [
        ['Lookup', card.serialNumber ?? serialNumber ?? '—'],
        ['Customer ID', card.customerId ?? customerId ?? '—'],
        ['Balance', card.availableBalanceKobo],
        ['Reason', reason || 'Optional'],
      ]
    : [];

  useEffect(() => {
    if (!card) return;
    setSerialNumber(String(card.serialNumber ?? ''));
    setCustomerId(String(card.customerId ?? ''));
    setStatus((card.status as 'ACTIVE' | 'BLOCKED') ?? 'ACTIVE');
  }, [card]);

  async function lookup() {
    const serial = serialNumber.trim();
    if (!serial) {
      setMessage('Enter a card serial first.');
      return;
    }

    setBusy(true);
    setActionMessage('');
    setMessage(`Looking up ${serial}…`);
    try {
      const response = await cardsControllerLookupCardV1(
        serial,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextCard = response.data.data;
        setCard(nextCard);
        setSerialNumber(String(nextCard.serialNumber ?? serial));
        setCustomerId(String(nextCard.customerId ?? customerId));
        setActionResponse(null);
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
    if (assignConfirmation.trim().toUpperCase() !== 'ASSIGN') {
      setMessage('Type ASSIGN to confirm the card assignment.');
      return;
    }
    setBusy(true);
    try {
      setActionMessage('Assigning card…');
      const response = await cardsControllerCreateCardV1(
        {
          serialNumber: serialNumber.trim(),
          customerId: customerId.trim(),
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 201
          ? 'Card assigned.'
          : `Assign unavailable (${response.status}).`,
      );
      setAssignConfirmation('');
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
    if (replaceConfirmation.trim().toUpperCase() !== 'REPLACE') {
      setMessage('Type REPLACE to confirm the replacement.');
      return;
    }
    setBusy(true);
    try {
      setActionMessage(`Replacing card ${card.id}…`);
      const response = await cardsControllerReplaceCardV1(
        card.id,
        {
          serialNumber: newSerialNumber.trim(),
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 201
          ? 'Replacement created.'
          : `Replacement unavailable (${response.status}).`,
      );
      setReplaceConfirmation('');
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
    if (statusConfirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the status change.');
      return;
    }
    setBusy(true);
    try {
      setActionMessage(`Updating card ${card.id}…`);
      const response = await cardsControllerUpdateStatusV1(
        card.id,
        { status },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 200
          ? 'Card status updated.'
          : `Status update unavailable (${response.status}).`,
      );
      setStatusConfirmation('');
      await lookup();
    } catch {
      setMessage('Status update unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Cards</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Lookup, assign, replace, and status-manage cards.
        </p>
        <Link href="/admin">Back to admin</Link>
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </header>

      <div style={summaryRow}>
        <StatusBadge
          label={card ? 'Card loaded' : 'Awaiting lookup'}
          tone={card ? 'success' : 'warning'}
        />
        <StatusBadge
          label={card?.status ?? 'No status'}
          tone={card?.status === 'ACTIVE' ? 'success' : 'neutral'}
        />
        <StatusBadge
          label={
            card?.customer?.fullName ?? card?.customerId ?? 'Customer pending'
          }
          tone="info"
        />
      </div>

      <p style={muted}>{message}</p>

      <section style={cardStyle} aria-label="Lookup card">
        <h2 style={{ marginTop: 0 }}>Lookup card</h2>
        <div style={formGrid}>
          <Input
            aria-label="Card serial"
            placeholder="Card serial"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
          />
          <Input
            aria-label="Customer ID"
            placeholder="Customer ID"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </div>
        <div style={toolbarRow}>
          <Button onClick={() => void lookup()} loading={busy}>
            Lookup card
          </Button>
        </div>
      </section>

      {card ? (
        <section style={cardStyle} aria-label="Selected card">
          <h2 style={{ marginTop: 0 }}>Selected card</h2>
          <Alert tone="info" title="Selected card">
            {card?.customer?.fullName ?? card?.customerId ?? 'Customer'} ·{' '}
            {card?.status ?? 'Status pending'}
          </Alert>
          <div style={summaryRow}>
            {card?.serialNumber ? (
              <StatusBadge label={String(card.serialNumber)} tone="info" />
            ) : null}
            {card?.status ? (
              <StatusBadge
                label={String(card.status)}
                tone={cardStatusTone}
              />
            ) : null}
            {card?.customer?.fullName ? (
              <StatusBadge
                label={String(card.customer.fullName)}
                tone="neutral"
              />
            ) : null}
            {typeof card?.availableBalanceKobo === 'number' ? (
              <StatusBadge
                label={`Balance ${card.availableBalanceKobo} kobo`}
                tone="info"
              />
            ) : null}
          </div>
          <Table>
            <tbody>
              {selectedPreview.map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{renderValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {routeSummary.some(([, value]) => value !== '—') ? (
            <Table>
              <tbody>
                {routeSummary.map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          <Table>
            <tbody>
              {Object.entries(card)
                .slice(0, 10)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
          <Alert tone="info" title="Card context">
            Use the loaded card before assignment, replacement, or status
            changes.
          </Alert>
        </section>
      ) : null}

      <section style={cardStyle} aria-label="Assign card">
        <h2 style={{ marginTop: 0 }}>Assign card</h2>
        <Input
          aria-label="Assign confirmation"
          placeholder="Type ASSIGN to confirm"
          value={assignConfirmation}
          onChange={(event) => setAssignConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button onClick={() => void assignCard()} loading={busy}>
            Assign card
          </Button>
        </div>
      </section>

      <section style={cardStyle} aria-label="Replace card">
        <h2 style={{ marginTop: 0 }}>Replace card</h2>
        <div style={formGrid}>
          <Input
            aria-label="Replacement serial"
            placeholder="Replacement serial"
            value={newSerialNumber}
            onChange={(event) => setNewSerialNumber(event.target.value)}
          />
          <Input
            aria-label="Reason"
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <Input
          aria-label="Replacement confirmation"
          placeholder="Type REPLACE to confirm"
          value={replaceConfirmation}
          onChange={(event) => setReplaceConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button
            variant="secondary"
            onClick={() => void replaceCard()}
            loading={busy}
          >
            Replace card
          </Button>
        </div>
        <Alert tone="warning" title="Replacement preview">
          Replacement preserves the original card and records a deliberate
          compensating action.
        </Alert>
      </section>

      <section style={cardStyle} aria-label="Update status">
        <h2 style={{ marginTop: 0 }}>Update status</h2>
        <RadioGroup
          name="card-status"
          legend="Status"
          value={status}
          onValueChange={(value) => setStatus(value as 'ACTIVE' | 'BLOCKED')}
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'BLOCKED', label: 'Blocked' },
          ]}
        />
        <Input
          aria-label="Status confirmation"
          placeholder="Type UPDATE to confirm"
          value={statusConfirmation}
          onChange={(event) => setStatusConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button
            variant="ghost"
            onClick={() => void changeStatus()}
            loading={busy}
          >
            Update status
          </Button>
        </div>
        <Alert
          tone={status === 'ACTIVE' ? 'success' : 'warning'}
          title="Status preview"
        >
          The next update will mark this card as {status}.
        </Alert>
      </section>

      <section style={cardStyle} aria-label="Action response">
        <h2 style={{ marginTop: 0 }}>Action response</h2>
        <p style={muted}>
          {actionMessage || 'Submit a change to see the backend response here.'}
        </p>
        {actionResponse ? (
          <Table>
            <tbody>
              {Object.entries(actionResponse)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : null}
      </section>
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

const layoutGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const headerGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-4)',
  background: 'var(--sc-color-neutral-0)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const summaryRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const formGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
