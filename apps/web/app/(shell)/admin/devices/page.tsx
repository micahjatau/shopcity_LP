'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateDeviceV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Select, Separator, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const statuses = ['ACTIVE', 'INACTIVE'] as const;

const relatedRoutes = [
  ['/admin/users', 'Users'],
  ['/admin/branches', 'Branches'],
  ['/admin/audit', 'Audit'],
  ['/admin/cards', 'Cards'],
] as const;

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('Create or update devices by branch.');
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [fingerprintHash, setFingerprintHash] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('ACTIVE');
  const [rotateAttestationSecret, setRotateAttestationSecret] = useState(false);
  const [createConfirmation, setCreateConfirmation] = useState('');
  const [updateConfirmation, setUpdateConfirmation] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<string, unknown> | null>(null);

  const selectedDevice = useMemo(
    () => devices.find((item) => item.id === selectedId) ?? null,
    [devices, selectedId],
  );
  const selectedBranch = useMemo(
    () => branches.find((item) => item.id === branchId) ?? null,
    [branches, branchId],
  );
  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name ?? branch.id,
  }));
  const statusTone = status === 'ACTIVE' ? 'success' : 'warning';

  useEffect(() => {
    if (!selectedDevice) return;
    setName(selectedDevice.name ?? '');
    setStatus((selectedDevice.status as (typeof statuses)[number]) ?? 'ACTIVE');
    setBranchId((current) => selectedDevice.branchId ?? current);
    setUpdateConfirmation('');
    setRotateAttestationSecret(false);
  }, [selectedDevice]);

  async function refresh() {
    setLoading(true);
    try {
      const [devicesResponse, branchesResponse] = await Promise.all([
        branchesControllerListDevicesV1(createApiRequest({ csrf: true })),
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
      ]);

      if (devicesResponse.status === 200) {
        const nextDevices = devicesResponse.data.data as any[];
        setDevices(nextDevices);
        setSelectedId(nextDevices[0]?.id ?? null);
      }
      if (branchesResponse.status === 200) {
        const nextBranches = branchesResponse.data.data as any[];
        setBranches(nextBranches);
        setBranchId((current) => current || nextBranches[0]?.id || '');
      }
      setActionResponse(null);
      setMessage('Device data loaded.');
    } catch {
      setMessage('Device data unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createDevice() {
    if (!branchId || !name.trim() || !fingerprintHash.trim()) {
      setMessage('Enter branch, name, and fingerprint hash before creating a device.');
      return;
    }
    if (createConfirmation.trim().toUpperCase() !== 'CREATE') {
      setMessage('Type CREATE to confirm device creation.');
      return;
    }

    try {
      setActionMessage('Creating device…');
      const response = await branchesControllerCreateDeviceV1(
        { branchId, name: name.trim(), fingerprintHash: fingerprintHash.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 201
          ? 'Device created.'
          : `Create unavailable (${response.status}).`,
      );
      if (response.status === 201) {
        setCreateConfirmation('');
      }
      await refresh();
    } catch {
      setMessage('Device create unavailable.');
    }
  }

  async function updateDevice() {
    if (!selectedId) return;
    if (updateConfirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the device change.');
      return;
    }

    try {
      setActionMessage(`Updating device ${selectedId}…`);
      const response = await branchesControllerUpdateDeviceV1(
        selectedId,
        { name: name.trim(), status, rotateAttestationSecret } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setMessage(
        response.status === 200
          ? 'Device updated.'
          : `Update unavailable (${response.status}).`,
      );
      setUpdateConfirmation('');
      setRotateAttestationSecret(false);
      await refresh();
    } catch {
      setMessage('Device update unavailable.');
    }
  }

  const selectedPreview = selectedDevice
    ? [
        ['Device', selectedDevice.name ?? selectedDevice.id ?? '—'],
        ['Status', selectedDevice.status ?? '—'],
        ['Branch', selectedDevice.branchId ?? 'Tenant-wide'],
        ['Fingerprint', selectedDevice.fingerprintHash ?? '—'],
        ['Selected branch', branchId || 'Tenant-wide'],
        ['Selected status', status],
        ['Rotate secret', rotateAttestationSecret ? 'Yes' : 'No'],
      ]
    : [];

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Devices</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Create devices, update their status, and rotate attestation where required.
        </p>
        <Link href="/admin">Back to admin</Link>
        <div style={routeRow}>
          {relatedRoutes.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </header>

      <div style={summaryRow}>
        <StatusBadge label={`Devices ${devices.length}`} tone="info" />
        <StatusBadge label={`Branches ${branches.length}`} tone="success" />
        <StatusBadge label={selectedDevice ? 'Selected' : 'No selection'} tone="neutral" />
      </div>

      <p style={muted}>{message}</p>

      <section style={cardStyle} aria-label="Create device">
        <h2 style={{ marginTop: 0 }}>Create device</h2>
        <div style={formGrid}>
          <Select
            aria-label="Branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            options={[{ value: '', label: 'Select branch' }, ...branchOptions]}
          />
          <Input
            aria-label="Device name"
            placeholder="Device name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label="Fingerprint hash"
            placeholder="Fingerprint hash"
            value={fingerprintHash}
            onChange={(event) => setFingerprintHash(event.target.value)}
          />
        </div>
        <RadioGroup
          name="device-status"
          legend="Status"
          value={status}
          onValueChange={(value) => setStatus(value as (typeof statuses)[number])}
          options={statuses.map((value) => ({ value, label: value }))}
        />
        <Input
          aria-label="Create confirmation"
          placeholder="Type CREATE to confirm"
          value={createConfirmation}
          onChange={(event) => setCreateConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button onClick={() => void createDevice()} loading={loading}>
            Create device
          </Button>
          <Button variant="secondary" onClick={() => void refresh()} loading={loading}>
            Refresh
          </Button>
        </div>
      </section>

      {selectedDevice ? (
        <section style={cardStyle} aria-label="Selected device">
          <h2 style={{ marginTop: 0 }}>Selected device</h2>
          <Alert tone="info" title="Selected device">
            {selectedDevice.name ?? selectedDevice.id} is ready for status or rotation review.
          </Alert>
          <div style={summaryRow}>
            <StatusBadge label={selectedDevice.status ?? 'Unknown status'} tone={selectedDevice.status === 'ACTIVE' ? 'success' : 'warning'} />
            <StatusBadge label={selectedDevice.branchId ?? 'Tenant-wide'} tone="neutral" />
            {rotateAttestationSecret ? <StatusBadge label="Attestation rotation requested" tone="warning" /> : null}
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
          <Separator />
          <div style={formGrid}>
            <Input
              aria-label="Device name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Select
              aria-label="Device status"
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}
              options={statuses.map((value) => ({ value, label: value }))}
            />
          </div>
          <div style={toolbarRow}>
            <label style={toggleLabel}>
              <input
                type="checkbox"
                checked={rotateAttestationSecret}
                onChange={(event) => setRotateAttestationSecret(event.target.checked)}
              />
              Rotate attestation secret
            </label>
            <Input
              aria-label="Update confirmation"
              placeholder="Type UPDATE to confirm"
              value={updateConfirmation}
              onChange={(event) => setUpdateConfirmation(event.target.value)}
            />
          </div>
          <div style={toolbarRow}>
            <Button onClick={() => void updateDevice()} disabled={!selectedId}>
              Update device
            </Button>
          </div>
          <Table>
            <tbody>
              {Object.entries(selectedDevice)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </section>
      ) : null}

      {devices.length === 0 ? (
        <Alert tone="warning" title="No devices">No device records returned.</Alert>
      ) : (
        <section style={cardStyle} aria-label="Devices table">
          <h2 style={{ marginTop: 0 }}>Device list</h2>
          <Table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((item) => (
                <tr key={item.id ?? item.name}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id ?? null)}
                      style={rowButton}
                    >
                      {item.name ?? item.id}
                    </button>
                  </td>
                  <td>
                    <StatusBadge
                      label={item.status ?? 'UNKNOWN'}
                      tone={item.status === 'ACTIVE' ? 'success' : 'warning'}
                    />
                  </td>
                  <td>{item.branchId ?? '—'}</td>
                  <td>{item.fingerprintHash ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section style={cardStyle} aria-label="Action response">
        <h2 style={{ marginTop: 0 }}>Action response</h2>
        <p style={muted}>{actionMessage || 'Select a record and submit a change to see the backend response here.'}</p>
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

      {selectedBranch ? (
        <Alert tone="info" title="Selected branch">
          {selectedBranch.name ?? selectedBranch.id} · {selectedBranch.timezone ?? 'Timezone pending'}
        </Alert>
      ) : null}
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
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

const toggleLabel: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--sc-spacing-2)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
