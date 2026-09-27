'use client';

import { useRef, useState } from 'react';
import {
  cardsControllerLookupManagementCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
  type CardsControllerLookupManagementCardV1200Data,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input } from '../../components/ui';

type Card = CardsControllerLookupManagementCardV1200Data;
type Operation = 'block' | 'reactivate' | 'replace';

function cardFrom(response: unknown): Card | null {
  const envelope = response as { data?: { data?: Card } };
  return envelope?.data?.data ?? null;
}

export function SupervisorCardManagement() {
  const [serial, setSerial] = useState('');
  const [candidate, setCandidate] = useState<Card | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [replacementSerial, setReplacementSerial] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('Enter a card serial to find a card.');
  const [busy, setBusy] = useState(false);
  const retryKey = useRef<{ payload: string; key: string } | null>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const selectionSerial = useRef('');

  function clearSelection() {
    setCandidate(null);
    setCard(null);
    setOperation(null);
    setReplacementSerial('');
    setConfirmation('');
    retryKey.current = null;
  }

  function setQuery(value: string) {
    setSerial(value);
    clearSelection();
    setMessage('Search for a card, then select its result to verify it.');
  }

  async function lookup(value: string): Promise<Card | null> {
    const response = await cardsControllerLookupManagementCardV1(
      encodeURIComponent(value),
      createApiRequest({ csrf: true }),
    );
    if (response.status !== 200) return null;
    return cardFrom(response);
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearSelection();
    const entered = serial.trim();
    if (!entered) {
      setMessage('Enter a card serial.');
      return;
    }
    setBusy(true);
    setMessage('Searching for card…');
    try {
      const result = await lookup(entered);
      if (!result) {
        setMessage(
          'No matching card was found or card details are unavailable.',
        );
      } else {
        setCandidate(result);
        setMessage(
          'A matching card was found. Select it to reload current details before acting.',
        );
      }
    } catch {
      setMessage('Card lookup failed. Check the serial and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate() {
    if (!candidate?.serialNumber || !candidate.id) return;
    setBusy(true);
    setMessage('Verifying current card details…');
    try {
      const authoritative = await lookup(candidate.serialNumber);
      if (!authoritative || authoritative.id !== candidate.id) {
        clearSelection();
        setMessage(
          'Card details changed or are unavailable. Search again before acting.',
        );
        return;
      }
      selectionSerial.current = candidate.serialNumber;
      setCard(authoritative);
      setMessage(
        'Current card details verified. Choose an operation to continue.',
      );
    } catch {
      clearSelection();
      setMessage(
        'Unable to verify current card details. No action is available.',
      );
    } finally {
      setBusy(false);
    }
  }

  function choose(operation: Operation) {
    setOperation(operation);
    setConfirmation('');
    setReplacementSerial('');
    retryKey.current = null;
  }

  async function act() {
    if (!card?.id || !card.serialNumber || !operation) return;
    if (
      operation === 'replace' &&
      (!replacementSerial.trim() ||
        confirmation.trim().toUpperCase() !== 'REPLACE')
    ) {
      setMessage('Enter a new replacement serial and type REPLACE to confirm.');
      return;
    }
    const expected =
      operation === 'block'
        ? 'BLOCK'
        : operation === 'reactivate'
          ? 'REACTIVATE'
          : 'REPLACE';
    if (confirmation.trim().toUpperCase() !== expected) {
      setMessage(`Review the card and type ${expected} to confirm.`);
      return;
    }
    const payload =
      operation === 'replace'
        ? JSON.stringify({ serialNumber: replacementSerial.trim() })
        : JSON.stringify({
            status: operation === 'block' ? 'BLOCKED' : 'ACTIVE',
          });
    if (retryKey.current?.payload !== payload) {
      retryKey.current = { payload, key: crypto.randomUUID() };
    }
    const request = createApiRequest({
      csrf: true,
      idempotencyKey: retryKey.current.key,
    });
    setBusy(true);
    setMessage(
      operation === 'replace' ? 'Replacing card…' : 'Updating card status…',
    );
    try {
      const response =
        operation === 'replace'
          ? await cardsControllerReplaceCardV1(
              card.id,
              { serialNumber: replacementSerial.trim() },
              request,
            )
          : await cardsControllerUpdateStatusV1(
              card.id,
              { status: operation === 'block' ? 'BLOCKED' : 'ACTIVE' },
              request,
            );
      if (response.status !== (operation === 'replace' ? 201 : 200)) {
        setMessage(
          `The request was not confirmed (${response.status}). Review current details before retrying.`,
        );
        return;
      }
      if (operation === 'replace') {
        const old = await lookup(card.serialNumber);
        const replacement = await lookup(replacementSerial.trim());
        const responseBody = response.data as unknown as {
          data?: { id?: string; card?: { id?: string } };
        };
        const returnedId =
          responseBody?.data?.id ?? responseBody?.data?.card?.id;
        if (
          !returnedId ||
          !old ||
          old.id !== card.id ||
          old.status !== 'REPLACED' ||
          !replacement ||
          replacement.id !== returnedId ||
          replacement.customer?.id !== card.customer?.id
        ) {
          setMessage(
            'Replacement request succeeded, but the resulting cards could not be verified. Search both serials to confirm current state.',
          );
          return;
        }
        setSerial(replacement.serialNumber ?? replacementSerial.trim());
        setCandidate(null);
        setCard(replacement);
        setOperation(null);
        setReplacementSerial('');
        setConfirmation('');
        selectionSerial.current =
          replacement.serialNumber ?? replacementSerial.trim();
        setMessage('Replacement verified for the same customer.');
        requestAnimationFrame(() => cardHeading.current?.focus());
        return;
      }
      const expectedStatus = operation === 'block' ? 'BLOCKED' : 'ACTIVE';
      const refreshed = await lookup(selectionSerial.current);
      if (
        !refreshed ||
        refreshed.id !== card.id ||
        refreshed.customer?.id !== card.customer?.id ||
        refreshed.status !== expectedStatus
      ) {
        clearSelection();
        setMessage(
          'The status request could not be verified against current card details. Refresh the card lookup and reconcile its status before retrying.',
        );
        return;
      }
      setCard(refreshed);
      setOperation(null);
      setConfirmation('');
      retryKey.current = null;
      setMessage('Card status updated and current details refreshed.');
    } catch {
      setMessage(
        'The request could not be confirmed. Your input is retained; refresh card details before retrying.',
      );
    } finally {
      setBusy(false);
    }
  }

  const canManage = card?.customer?.status === 'ACTIVE';
  const fmtDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : '—';

  return (
    <section
      className="sc-card sc-card--standard min-w-0 p-4 sm:p-6"
      aria-labelledby="manage-cards-heading"
    >
      <h2 id="manage-cards-heading" className="mb-4 text-lg font-semibold">
        Manage cards
      </h2>
      <form
        onSubmit={search}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="management-card-serial"
            className="mb-1 block text-sm font-medium"
          >
            Card serial
          </label>
          <Input
            id="management-card-serial"
            value={serial}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={busy}>
          Search card
        </Button>
      </form>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {message}
      </p>

      {candidate && !card && (
        <div className="mt-4 rounded-md border p-4">
          <p>
            Matching card: <strong>{candidate.serialNumber}</strong> ·{' '}
            {candidate.status}
          </p>
          <Button
            className="mt-3"
            type="button"
            onClick={selectCandidate}
            disabled={busy}
          >
            Select and verify card
          </Button>
        </div>
      )}

      {card && (
        <div className="mt-4 space-y-4">
          <h3
            ref={cardHeading}
            tabIndex={-1}
            className="sr-only focus:not-sr-only"
          >
            Verified card {card.serialNumber}
          </h3>
          <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium">Card serial</dt>
              <dd className="break-all">{card.serialNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Card status</dt>
              <dd>{card.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Customer</dt>
              <dd className="break-words">
                {card.customer?.fullName ?? 'Unavailable'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Customer status</dt>
              <dd>{card.customer?.status ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Issued</dt>
              <dd>{fmtDate(card.issuedAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Blocked</dt>
              <dd>{fmtDate(card.blockedAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Replaced</dt>
              <dd>{fmtDate(card.replacedAt)}</dd>
            </div>
          </dl>
          {card.status === 'ACTIVE' && canManage && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => choose('block')}>
                Block card
              </Button>
              <Button type="button" onClick={() => choose('replace')}>
                Replace card
              </Button>
            </div>
          )}
          {card.status === 'BLOCKED' && canManage && (
            <Button type="button" onClick={() => choose('reactivate')}>
              Reactivate card
            </Button>
          )}
          {card.status === 'REPLACED' && (
            <p>This card has been replaced and is read-only.</p>
          )}
          {card.customer?.status !== 'ACTIVE' && card.status !== 'REPLACED' && (
            <p>
              Lifecycle actions are unavailable because the linked customer is
              not active.
            </p>
          )}
          {operation && (
            <section
              className="space-y-3 rounded-md border p-4"
              aria-label="Confirm card operation"
            >
              <p className="font-medium">
                {operation === 'block'
                  ? 'Block'
                  : operation === 'reactivate'
                    ? 'Reactivate'
                    : 'Replace'}{' '}
                {card.serialNumber} for{' '}
                {card.customer?.fullName ?? 'this customer'}?
              </p>
              {operation === 'replace' && (
                <div>
                  <label
                    htmlFor="replacement-card-serial"
                    className="mb-1 block text-sm font-medium"
                  >
                    New replacement serial
                  </label>
                  <Input
                    id="replacement-card-serial"
                    value={replacementSerial}
                    onChange={(event) =>
                      setReplacementSerial(event.target.value)
                    }
                    autoComplete="off"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="card-operation-confirmation"
                  className="mb-1 block text-sm font-medium"
                >
                  Type{' '}
                  {operation === 'block'
                    ? 'BLOCK'
                    : operation === 'reactivate'
                      ? 'REACTIVATE'
                      : 'REPLACE'}{' '}
                  to confirm
                </label>
                <Input
                  id="card-operation-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <Button type="button" disabled={busy} onClick={act}>
                {operation === 'block'
                  ? 'Confirm block'
                  : operation === 'reactivate'
                    ? 'Confirm reactivation'
                    : 'Confirm replacement'}
              </Button>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
