'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerCreateBranchV1,
  branchesControllerListBranchesV1,
  branchesControllerUpdateBranchV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

export default function AdminBranchesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState('Loading branches…');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBranch = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function refresh() {
    try {
      const response = await branchesControllerListBranchesV1(
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data as any[];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setMessage(`Loaded ${nextItems.length} branch(es).`);
      } else {
        setMessage(`Branches unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Branches unavailable.');
    }
  }

  async function createBranch() {
    try {
      const response = await branchesControllerCreateBranchV1(
        { name, timezone } as any,
        createApiRequest({ csrf: true }),
      );
      setMessage(response.status === 201 ? 'Branch created.' : `Create unavailable (${response.status}).`);
      await refresh();
    } catch {
      setMessage('Branch create unavailable.');
    }
  }

  async function updateBranch() {
    if (!selectedId) return;
    try {
      const response = await branchesControllerUpdateBranchV1(
        selectedId,
        { name, timezone } as any,
        createApiRequest({ csrf: true }),
      );
      setMessage(response.status === 200 ? 'Branch updated.' : `Update unavailable (${response.status}).`);
      await refresh();
    } catch {
      setMessage('Branch update unavailable.');
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Branches</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Branch list, create and edit surfaces.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Input aria-label="Branch name" placeholder="Branch name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input aria-label="Branch timezone" placeholder="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void createBranch()}>Create branch</Button>
        <Button variant="secondary" onClick={() => void updateBranch()} disabled={!selectedId}>Update branch</Button>
        <Button variant="ghost" onClick={() => void refresh()}>Refresh</Button>
      </div>
      {selectedBranch ? (
        <Alert tone="info" title="Selected branch">
          {selectedBranch.name ?? selectedBranch.id} · {selectedBranch.timezone ?? 'Timezone pending'}
        </Alert>
      ) : null}
      {items.length === 0 ? (
        <Alert tone="warning" title="No branches">No branches were returned.</Alert>
      ) : (
        <Table>
          <thead>
            <tr><th>Name</th><th>Timezone</th><th>ID</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id ?? item.name}>
                <td>
                  <button type="button" onClick={() => setSelectedId(item.id ?? null)} style={rowButton}>
                    {item.name ?? 'Branch'}
                  </button>
                </td>
                <td>{item.timezone ?? '—'}</td>
                <td>{item.id ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {selectedBranch ? (
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
          <StatusBadge label={`Week start ${selectedBranch.receiptWeekStartDay ?? '—'}`} tone="info" />
          <StatusBadge label={`Timezone ${selectedBranch.timezone ?? '—'}`} tone="neutral" />
        </div>
      ) : null}
    </section>
  );
}

const rowButton = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
};
