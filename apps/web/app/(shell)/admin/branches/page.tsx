'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerCreateBranchV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateBranchV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

type BranchRecord = {
  id?: string;
  name?: string;
  timezone?: string;
  receiptWeekStartDay?: number;
};

type DeviceRecord = {
  id?: string;
  branchId?: string;
  name?: string;
  status?: string;
  fingerprintHash?: string;
};

export default function AdminBranchesPage() {
  const [items, setItems] = useState<BranchRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [message, setMessage] = useState('Loading branches…');
  const [actionMessage, setActionMessage] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameConfirmation, setNameConfirmation] = useState('');
  const [updateConfirmation, setUpdateConfirmation] = useState('');

  const selectedBranch = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const selectedDevices = useMemo(
    () =>
      selectedBranch
        ? devices.filter((device) => device.branchId === selectedBranch.id)
        : [],
    [devices, selectedBranch],
  );
  const routeLinks = [
    ['/admin/users', 'Users'],
    ['/admin/devices', 'Devices'],
    ['/admin/cards', 'Cards'],
    ['/admin/audit', 'Audit'],
  ] as const;

  useEffect(() => {
    if (!selectedBranch) return;
    setName(selectedBranch.name ?? '');
    setTimezone(selectedBranch.timezone ?? 'Africa/Lagos');
    setUpdateConfirmation('');
    setNameConfirmation('');
  }, [selectedBranch]);

  async function refresh() {
    try {
      const [branchesResponse, devicesResponse] = await Promise.all([
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
        branchesControllerListDevicesV1(createApiRequest({ csrf: true })),
      ]);
      if (branchesResponse.status === 200) {
        const nextItems = branchesResponse.data.data as BranchRecord[];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
      }
      if (devicesResponse.status === 200) {
        setDevices(devicesResponse.data.data as DeviceRecord[]);
      }
      setActionResponse(null);
      setMessage('Branch data loaded.');
    } catch {
      setMessage('Branches unavailable.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createBranch() {
    if (!name.trim() || !timezone.trim()) {
      setMessage('Enter branch name and timezone before creating a branch.');
      return;
    }
    if (nameConfirmation.trim().toUpperCase() !== 'CREATE') {
      setMessage('Type CREATE to confirm branch creation.');
      return;
    }

    try {
      setActionMessage('Creating branch…');
      const response = await branchesControllerCreateBranchV1(
        { name: name.trim(), timezone: timezone.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 201
          ? 'Branch created.'
          : `Create unavailable (${response.status}).`,
      );
      if (response.status === 201) {
        setNameConfirmation('');
      }
      await refresh();
    } catch {
      setMessage('Branch create unavailable.');
    }
  }

  async function updateBranch() {
    if (!selectedId) return;
    if (updateConfirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm branch changes.');
      return;
    }

    try {
      setActionMessage(`Updating branch ${selectedId}…`);
      const response = await branchesControllerUpdateBranchV1(
        selectedId,
        { name: name.trim(), timezone: timezone.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 200
          ? 'Branch updated.'
          : `Update unavailable (${response.status}).`,
      );
      setUpdateConfirmation('');
      await refresh();
    } catch {
      setMessage('Branch update unavailable.');
    }
  }

  const selectedPreview = selectedBranch
    ? [
        ['Branch', selectedBranch.name ?? selectedBranch.id ?? '—'],
        ['Timezone', selectedBranch.timezone ?? '—'],
        ['Receipt week start', selectedBranch.receiptWeekStartDay ?? '—'],
        ['Selected name', name || 'Enter branch name'],
        ['Selected timezone', timezone || 'Enter timezone'],
      ]
    : [];

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Branches</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Branch list, create and edit surfaces.
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
        <StatusBadge label={`Branches ${items.length}`} tone="info" />
        <StatusBadge label={`Devices ${devices.length}`} tone="success" />
        <StatusBadge
          label={selectedBranch ? 'Selected' : 'No selection'}
          tone="neutral"
        />
      </div>

      <p style={muted}>{message}</p>

      <section style={cardStyle} aria-label="Create branch">
        <h2 style={{ marginTop: 0 }}>Create branch</h2>
        <div style={formGrid}>
          <Input
            aria-label="Branch name"
            placeholder="Branch name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label="Branch timezone"
            placeholder="Timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
        </div>
        <Input
          aria-label="Create confirmation"
          placeholder="Type CREATE to confirm"
          value={nameConfirmation}
          onChange={(event) => setNameConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button onClick={() => void createBranch()}>Create branch</Button>
          <Button variant="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </section>

      {selectedBranch ? (
        <section style={cardStyle} aria-label="Selected branch">
          <h2 style={{ marginTop: 0 }}>Selected branch</h2>
          <Alert tone="info" title="Selected branch">
            {selectedBranch.name ?? selectedBranch.id} ·{' '}
            {selectedBranch.timezone ?? 'Timezone pending'}
          </Alert>
          <div style={summaryRow}>
            <StatusBadge
              label={`Week start ${selectedBranch.receiptWeekStartDay ?? '—'}`}
              tone="info"
            />
            <StatusBadge
              label={`Timezone ${selectedBranch.timezone ?? '—'}`}
              tone="neutral"
            />
            <StatusBadge
              label={`Devices ${selectedDevices.length}`}
              tone="success"
            />
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
          <Input
            aria-label="Update confirmation"
            placeholder="Type UPDATE to confirm"
            value={updateConfirmation}
            onChange={(event) => setUpdateConfirmation(event.target.value)}
          />
          <div style={toolbarRow}>
            <Button onClick={() => void updateBranch()} disabled={!selectedId}>
              Update branch
            </Button>
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <Alert tone="warning" title="No branches">
          No branches were returned.
        </Alert>
      ) : (
        <section style={cardStyle} aria-label="Branch list">
          <h2 style={{ marginTop: 0 }}>Branch list</h2>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Timezone</th>
                <th>Receipt week start</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id ?? item.name}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id ?? null)}
                      style={rowButton}
                    >
                      {item.name ?? 'Branch'}
                    </button>
                  </td>
                  <td>{item.timezone ?? '—'}</td>
                  <td>{item.receiptWeekStartDay ?? '—'}</td>
                  <td>{item.id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section style={cardStyle} aria-label="Action response">
        <h2 style={{ marginTop: 0 }}>Action response</h2>
        <p style={muted}>
          {actionMessage ||
            'Select a branch and submit a change to see the backend response here.'}
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

      {selectedDevices.length > 0 ? (
        <section style={cardStyle} aria-label="Branch devices">
          <h2 style={{ marginTop: 0 }}>Branch devices</h2>
          <Table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              {selectedDevices.slice(0, 6).map((device) => (
                <tr key={device.id ?? device.name}>
                  <td>{device.name ?? device.id}</td>
                  <td>{device.status ?? '—'}</td>
                  <td>{device.fingerprintHash ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      ) : null}
    </section>
  );
}

function renderValue(value: unknown) {
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

const rowButton: CSSProperties = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
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
