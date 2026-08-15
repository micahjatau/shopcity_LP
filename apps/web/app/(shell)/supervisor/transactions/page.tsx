'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  loyaltyControllerGetTransactionV1,
  reversalsControllerReverseV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Textarea, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

const relatedRoutes = [
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
  ['/supervisor/reports', 'Reports'],
] as const;

export default function SupervisorTransactionsPage() {
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [reverseConfirmation, setReverseConfirmation] = useState('');
  const [message, setMessage] = useState('Search a transaction by ID to inspect and reverse it.');
  const [transaction, setTransaction] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const summaryRows = useMemo(
    () =>
      transaction
        ? [
            ['State', transaction.state ?? transaction.status ?? '—'],
            ['Type', transaction.type ?? '—'],
            ['Direction', transaction.direction ?? '—'],
            ['Customer', transaction.customerId ?? '—'],
            ['Card', transaction.cardSerialNumber ?? '—'],
            ['Receipt', transaction.posReceiptNumber ?? '—'],
            ['Credit', transaction.creditKobo],
            ['Available balance', transaction.availableBalanceKobo],
          ]
        : [],
    [transaction],
  );

  async function loadTransaction() {
    const id = transactionId.trim();
    if (!id) {
      setMessage('Enter a transaction ID first.');
      return;
    }

    setBusy(true);
    setMessage(`Loading transaction ${id}…`);
    try {
      const response = await loyaltyControllerGetTransactionV1(
        id,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setTransaction(response.data.data);
        setMessage(`Loaded transaction ${id}.`);
        return;
      }
      setMessage(`Transaction unavailable (${response.status}).`);
    } catch {
      setMessage('Transaction unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function reverseTransaction() {
    const id = transactionId.trim();
    if (!id || !reason.trim()) {
      setMessage('Enter a transaction ID and reversal reason first.');
      return;
    }
    if (reverseConfirmation.trim().toUpperCase() !== 'REVERSE') {
      setMessage('Type REVERSE to confirm the compensating action.');
      return;
    }

    setBusy(true);
    setMessage('Submitting reversal…');
    try {
      const response = await reversalsControllerReverseV1(
        id,
        { reason: reason.trim() } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status === 201) {
        setMessage('Reversal created. Reloading transaction detail…');
        setReverseConfirmation('');
        await loadTransaction();
        return;
      }
      setMessage(`Reversal unavailable (${response.status}).`);
    } catch {
      setMessage('Reversal unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Transaction review</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Inspect a transaction and create an immutable compensating reversal where allowed.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <Link href="/supervisor">Back to supervisor</Link>
          {relatedRoutes.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
      </header>

      <Alert tone="info" title="Transaction route context">
        Use this route for search, detail inspection, and compensating reversals.
      </Alert>

      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <StatusBadge label="Immutable reversal flow" tone="success" />
        <StatusBadge label="Backend contract" tone="info" />
        <StatusBadge label="Investigative review" tone="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--sc-spacing-3)' }}>
        <Input aria-label="Transaction ID" placeholder="Transaction ID" value={transactionId} onChange={(event) => setTransactionId(event.target.value)} />
        <Button onClick={() => void loadTransaction()} loading={busy}>Load</Button>
      </div>
      <Textarea aria-label="Reversal reason" placeholder="Reason for reversal" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
      <Input aria-label="Reversal confirmation" placeholder="Type REVERSE to confirm" value={reverseConfirmation} onChange={(event) => setReverseConfirmation(event.target.value)} />
      <Alert tone="info" title="Reversal preview">
        Reversals preserve the original transaction and write a compensating ledger entry.
      </Alert>
      <Button onClick={() => void reverseTransaction()} loading={busy} disabled={!transaction}>Reverse transaction</Button>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>

      {transaction ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
            <StatusBadge label={transaction.status ?? 'UNKNOWN'} tone="info" />
            <StatusBadge label={transaction.type ?? 'Transaction'} tone="neutral" />
            <StatusBadge label={transaction.direction ?? 'Direction pending'} tone="success" />
          </div>
          <Table>
            <tbody>
              {summaryRows.map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{renderValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {transaction.reversal ? (
            <Alert tone="warning" title="Existing reversal">
              Original transaction {transaction.reversal.originalTransactionId ?? transaction.transactionId} was reversed by {transaction.reversal.createdBy ?? 'the backend'}.
            </Alert>
          ) : null}
          {transaction.reversal?.restorations?.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Restoration</th>
                  <th>Amount</th>
                  <th>Ledger entry</th>
                </tr>
              </thead>
              <tbody>
                {transaction.reversal.restorations.map((restoration: any) => (
                  <tr key={restoration.id}>
                    <td>{restoration.creditLotId ?? restoration.allocationId}</td>
                    <td>{typeof restoration.amountKobo === 'number' ? <Money amountKobo={restoration.amountKobo} /> : '—'}</td>
                    <td>{restoration.reversalLedgerEntryId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          <Table>
            <tbody>
              {Object.entries(transaction)
                .slice(0, 10)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </>
      ) : (
        <Alert tone="warning" title="No transaction selected">
          Load a transaction to see reversal context.
        </Alert>
      )}

      {transaction?.amountKobo ? (
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <StatusBadge label={transaction.status ?? 'UNKNOWN'} tone="info" />
          <StatusBadge label={transaction.type ?? 'Transaction'} tone="neutral" />
          <Money amountKobo={transaction.amountKobo} />
        </div>
      ) : null}
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
