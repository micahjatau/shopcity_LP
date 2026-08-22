'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  loyaltyControllerGetTransactionV1,
  reversalsControllerReverseV1,
  type LoyaltyControllerGetTransactionV1200Data,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  Alert,
  Button,
  Input,
  Textarea,
  Table,
} from '../../components/ui';
import { Money, StatusBadge } from '../../components/shopcity';

const defaultRelatedRoutes = [
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/fraud', 'Fraud'],
  ['/supervisor/reports', 'Reports'],
] as const;

type TransactionRecord = LoyaltyControllerGetTransactionV1200Data & {
  status?: string;
  customer?: { fullName?: string };
  cardSerialNumber?: string;
  posReceiptNumber?: string;
  creditKobo?: number;
  availableBalanceKobo?: number;
  amountKobo?: number;
  reversal?: {
    originalTransactionId?: string;
    createdBy?: string;
  };
};

export function TransactionWorkspace({
  relatedRoutes = defaultRelatedRoutes,
}: Readonly<{ relatedRoutes?: ReadonlyArray<readonly [string, string]> }> = {}) {
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [reverseConfirmation, setReverseConfirmation] = useState('');
  const [message, setMessage] = useState(
    'Search a transaction by ID to inspect and reverse it.',
  );
  const [transaction, setTransaction] = useState<TransactionRecord | null>(
    null,
  );
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [busy, setBusy] = useState(false);

  const summaryRows = useMemo(
    () =>
      transaction
        ? [
            ['State', transaction.state ?? transaction.status ?? '—'],
            ['Type', transaction.type ?? '—'],
            ['Direction', transaction.direction ?? '—'],
            [
              'Customer',
              transaction.customerId ?? transaction.customer?.fullName ?? '—',
            ],
            ['Card', transaction.cardSerialNumber ?? '—'],
            ['Receipt', transaction.posReceiptNumber ?? '—'],
            ['Credit', transaction.creditKobo],
            ['Available balance', transaction.availableBalanceKobo],
          ]
        : [],
    [transaction],
  );

  const reversalPreview = useMemo(() => {
    if (!transaction) return null;
    return [
      ['Original amount', transaction.amountKobo],
      ['Current balance', transaction.availableBalanceKobo],
      ['Reversal reason', reason || 'Enter a reversal reason'],
      ['Confirmation', reverseConfirmation || 'Type REVERSE'],
    ] as const;
  }, [reason, reverseConfirmation, transaction]);

  async function loadTransaction() {
    const id = transactionId.trim();
    if (!id) {
      setMessage('Enter a transaction ID first.');
      return;
    }

    setBusy(true);
    setMessage(`Loading transaction ${id}…`);
    setResponseData(null);
    try {
      const response = await loyaltyControllerGetTransactionV1(
        id,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setTransaction(response.data.data as TransactionRecord);
        setMessage(`Loaded transaction ${id}.`);
        return;
      }
      setTransaction(null);
      setMessage(`Transaction unavailable (${response.status}).`);
    } catch {
      setTransaction(null);
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
    setResponseData(null);
    try {
      const response = await reversalsControllerReverseV1(
        id,
        { reason: reason.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setResponseData(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
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
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Inspect a transaction and create an immutable compensating reversal
          where allowed.
        </p>
        <div style={routeRow}>
          <Link href="/supervisor">Back to supervisor</Link>
          {relatedRoutes.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </header>

      <Alert tone="info" title="Transaction route context">
        Use this route for search, detail inspection, and compensating
        reversals.
      </Alert>

      <div style={statusRow}>
        <StatusBadge label="Immutable reversal flow" tone="success" />
        <StatusBadge label="Backend contract" tone="info" />
        <StatusBadge
          label={transaction ? 'Transaction loaded' : 'No transaction'}
          tone={transaction ? 'success' : 'warning'}
        />
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Load transaction</h2>
        <div style={inputRow}>
          <Input
            aria-label="Transaction ID"
            placeholder="Transaction ID"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
          />
          <Button onClick={() => void loadTransaction()} loading={busy}>
            Load
          </Button>
        </div>
      </section>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Transaction detail">
          <h2 style={{ marginTop: 0 }}>Transaction detail</h2>
          {transaction ? (
            <>
              <div style={statusRow}>
                <StatusBadge
                  label={transaction.status ?? 'UNKNOWN'}
                  tone="info"
                />
                <StatusBadge
                  label={transaction.type ?? 'Transaction'}
                  tone="neutral"
                />
                <StatusBadge
                  label={transaction.direction ?? 'Direction pending'}
                  tone="success"
                />
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
                  Original transaction{' '}
                  {transaction.reversal.originalTransactionId ??
                    transaction.transactionId}{' '}
                  was reversed by{' '}
                  {transaction.reversal.createdBy ?? 'the backend'}.
                </Alert>
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
        </article>

        <article style={cardStyle} aria-label="Reversal preview">
          <h2 style={{ marginTop: 0 }}>Reversal preview</h2>
          {transaction ? (
            <>
              <Alert tone="info" title="Compensating action">
                Reversals preserve the original transaction and write a
                compensating ledger entry.
              </Alert>
              <Table>
                <tbody>
                  {reversalPreview?.map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{renderValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Textarea
                aria-label="Reversal reason"
                placeholder="Reason for reversal"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
              <Input
                aria-label="Reversal confirmation"
                placeholder="Type REVERSE to confirm"
                value={reverseConfirmation}
                onChange={(event) => setReverseConfirmation(event.target.value)}
              />
              <Button
                onClick={() => void reverseTransaction()}
                loading={busy}
                disabled={!transaction}
              >
                Reverse transaction
              </Button>
            </>
          ) : (
            <Alert tone="warning" title="No reversal available">
              Load a transaction to review its balance impact and reversal
              outcome.
            </Alert>
          )}
        </article>
      </div>

      <section style={cardStyle} aria-label="Reversal result">
        <h2 style={{ marginTop: 0 }}>Reversal result</h2>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          {message}
        </p>
        {responseData ? (
          <Table>
            <tbody>
              {Object.entries(responseData)
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

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const inputRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 'var(--sc-spacing-3)',
};
