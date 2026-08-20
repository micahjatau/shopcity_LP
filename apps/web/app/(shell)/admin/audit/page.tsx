'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { auditControllerListV1 } from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/branches', 'Branches'],
  ['/admin/cards', 'Cards'],
] as const;

type AuditRow = Record<string, unknown> & {
  id?: string;
  action?: string;
  subjectType?: string;
  subjectId?: string;
  actorId?: string;
  createdAt?: string;
};

export default function AdminAuditPage() {
  const [actorId, setActorId] = useState('');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    'Enter an actor ID to load audit rows.',
  );
  const [loading, setLoading] = useState(false);
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);

  const selectedRow = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const selectedPreview = selectedRow
    ? [
        ['Action', selectedRow.action ?? '—'],
        ['Subject', selectedRow.subjectType ?? selectedRow.subjectId ?? '—'],
        ['Actor', selectedRow.actorId ?? '—'],
        ['Created', selectedRow.createdAt ?? '—'],
        ['Selected actor', actorId || 'Enter actor ID'],
      ]
    : [];

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
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      if (response.status === 200) {
        const nextRows = response.data.data as AuditRow[];
        setRows(nextRows);
        setSelectedId(nextRows[0]?.id ?? null);
        setMessage(`Loaded ${nextRows.length} audit row(s).`);
      } else {
        setMessage(`Audit unavailable (${response.status}).`);
      }
    } catch {
      setActionResponse(null);
      setMessage('Audit unavailable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Audit</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Actor-based audit trail lookup.
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
        <StatusBadge label={`Rows ${rows.length}`} tone="info" />
        <StatusBadge
          label={selectedRow ? 'Selected' : 'No selection'}
          tone="neutral"
        />
        <StatusBadge label={actorId || 'Actor pending'} tone="success" />
      </div>

      <section style={cardStyle} aria-label="Audit lookup">
        <h2 style={{ marginTop: 0 }}>Lookup audit trail</h2>
        <div style={lookupRow}>
          <Input
            aria-label="Actor ID"
            placeholder="Actor ID"
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
          />
          <Button onClick={() => void loadAudit()} loading={loading}>
            Load audit
          </Button>
        </div>
        <Alert tone="info" title="Audit route context">
          Use actor-based lookup to review the events behind a specific staff or
          admin action.
        </Alert>
      </section>

      <p style={muted}>{message}</p>

      {rows.length === 0 ? (
        <Alert tone="warning" title="No audit rows">
          No audit entries matched the current actor filter.
        </Alert>
      ) : (
        <div style={gridStyle}>
          <section style={cardStyle} aria-label="Audit list">
            <h2 style={{ marginTop: 0 }}>Audit rows</h2>
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
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id ?? null)}
                        style={rowButton}
                      >
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
          </section>

          <section style={cardStyle} aria-label="Selected audit row">
            <h2 style={{ marginTop: 0 }}>Selected row</h2>
            {selectedRow ? (
              <>
                <Alert tone="info" title="Selected audit row">
                  {selectedRow.action ??
                    selectedRow.subjectType ??
                    selectedRow.subjectId ??
                    'Audit event'}
                </Alert>
                <div style={summaryRow}>
                  <StatusBadge
                    label={selectedRow.action ?? 'Action pending'}
                    tone="info"
                  />
                  <StatusBadge
                    label={selectedRow.subjectType ?? 'Subject pending'}
                    tone="neutral"
                  />
                  <StatusBadge
                    label={selectedRow.actorId ?? 'Actor pending'}
                    tone="success"
                  />
                </div>
                <Table>
                  <tbody>
                    {selectedPreview.map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row">{key}</th>
                        <td>{describeValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Table>
                  <tbody>
                    {Object.entries(selectedRow)
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{describeValue(value)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </>
            ) : (
              <Alert tone="warning" title="No selection">
                Select an audit row to inspect its full detail.
              </Alert>
            )}
          </section>
        </div>
      )}

      <section style={cardStyle} aria-label="Audit response">
        <h2 style={{ marginTop: 0 }}>Audit response</h2>
        <p style={muted}>
          {actionResponse
            ? 'Backend response for the last load is shown below.'
            : 'Load an audit trail to see backend response details.'}
        </p>
        {actionResponse ? (
          <Table>
            <tbody>
              {Object.entries(actionResponse)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{describeValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : null}
      </section>
    </section>
  );
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
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

const lookupRow: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
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

const summaryRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const rowButton: CSSProperties = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
