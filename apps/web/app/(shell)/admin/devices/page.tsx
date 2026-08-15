'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateDeviceV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Select, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const statuses = ['ACTIVE', 'INACTIVE'] as const;

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

  const selectedDevice = useMemo(
    () => devices.find((item) => item.id === selectedId) ?? null,
    [devices, selectedId],
  );
  const selectedBranch = useMemo(
    () => branches.find((item) => item.id === branchId) ?? null,
    [branches, branchId],
  );
  const statusTone = status === 'ACTIVE' ? 'success' : 'warning';

  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name ?? branch.id,
  }));

  useEffect(() => {
    if (selectedDevice) {
      setName(selectedDevice.name ?? '');
      setStatus((selectedDevice.status as (typeof statuses)[number]) ?? 'ACTIVE');
      setBranchId((current) => selectedDevice.branchId ?? current);
      setUpdateConfirmation('');
      setRotateAttestationSecret(false);
    }
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
      const response = await branchesControllerCreateDeviceV1(
        { branchId, name: name.trim(), fingerprintHash: fingerprintHash.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
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
      const response = await branchesControllerUpdateDeviceV1(
        selectedId,
        { name, status, rotateAttestationSecret } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
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

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Devices</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Create devices, update their status, and rotate attestation where required.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        <Select
          aria-label="Branch"
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
          options={branchOptions}
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
      <Input
        aria-label="Update confirmation"
        placeholder="Type UPDATE to confirm"
        value={updateConfirmation}
        onChange={(event) => setUpdateConfirmation(event.target.value)}
      />
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sc-spacing-2)' }}>
          <input
            type="checkbox"
            checked={rotateAttestationSecret}
            onChange={(event) => setRotateAttestationSecret(event.target.checked)}
          />
          Rotate attestation secret
        </label>
      </div>
      <Alert tone="info" title="Deliberate changes">
        Device creation and updates require confirmation words before submission.
      </Alert>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void createDevice()} loading={loading}>
          Create device
        </Button>
        <Button variant="secondary" onClick={() => void updateDevice()} disabled={!selectedId}>
          Update device
        </Button>
        <Button variant="secondary" onClick={() => void refresh()} loading={loading}>
          Refresh
        </Button>
      </div>

      {selectedBranch ? (
        <Alert tone="info" title="Selected branch">
          {selectedBranch.name ?? selectedBranch.id} · {selectedBranch.timezone ?? 'Timezone pending'}
        </Alert>
      ) : null}

      {devices.length === 0 ? (
        <Alert tone="warning" title="No devices">No device records returned.</Alert>
      ) : (
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
      )}

      {selectedDevice ? (
        <>
          <Alert tone="info" title="Selected device">
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
              <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
                <StatusBadge label={selectedDevice.name ?? selectedDevice.id} tone="info" />
                <StatusBadge label={selectedDevice.status ?? 'STATUS pending'} tone={selectedDevice.status === 'ACTIVE' ? 'success' : 'warning'} />
                {rotateAttestationSecret ? <StatusBadge label="Attestation rotate requested" tone="warning" /> : null}
              </div>
              <span>{selectedDevice.branchId ?? 'Tenant-wide'} · ready for status review</span>
            </div>
          </Alert>
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
        </>
      ) : null}

      {status ? (
        <Alert tone={statusTone as 'success' | 'warning'} title="Status preview">
          The next update will mark this device as {status}.
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

const rowButton = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
};
