'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { auditControllerListV1 } from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

export default function AdminAuditPage() {
  const [actorId, setActorId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('Enter an actor ID to load audit rows.');
  const [loading, setLoading] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId],
  );

  async function loadAudit() {
    if (!actorId.trim()) {
      setMessage('Enter an actor ID first.');
      return;
    }

    setLoading(true);
    try {
      const response = await auditControllerListV1(
        { actorId: actorId.trim() },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextRows = response.data.data as any[];
        setRows(nextRows);
        setSelectedId(nextRows[0]?.id ?? null);
        setMessage(`Loaded ${nextRows.length} audit row(s).`);
      } else {
        setMessage(`Audit unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Audit unavailable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Audit</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Actor-based audit trail lookup.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--sc-spacing-3)' }}>
        <Input aria-label="Actor ID" placeholder="Actor ID" value={actorId} onChange={(event) => setActorId(event.target.value)} />
        <Button onClick={() => void loadAudit()} loading={loading}>Load audit</Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
      {selectedRow ? (
        <Alert tone="info" title="Selected audit row">
          {selectedRow.action ?? selectedRow.subjectType ?? selectedRow.subjectId ?? 'Audit event'}
        </Alert>
      ) : null}
      {rows.length === 0 ? (
        <Alert tone="warning" title="No audit rows">No audit entries matched the current actor filter.</Alert>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Subject</th>
              <th>Actor</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id ?? `${item.action}-${item.subjectId}`}>
                <td>
                  <button type="button" onClick={() => setSelectedId(item.id ?? null)} style={rowButton}>
                    {item.action ?? '—'}
                  </button>
                </td>
                <td>{item.subjectType ?? item.subjectId ?? '—'}</td>
                <td>{item.actorId ?? '—'}</td>
                <td>{item.createdAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {selectedRow ? (
        <Table>
          <tbody>
            {Object.entries(selectedRow)
              .slice(0, 6)
              .map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{describeValue(value)}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      ) : null}
      <StatusBadge label={`Rows ${rows.length}`} tone="info" />
    </section>
  );
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

const rowButton = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
};
