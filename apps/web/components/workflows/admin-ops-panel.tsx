'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  auditControllerListV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateDeviceV1,
  type UpdateDeviceDtoStatus,
  usersControllerListUsersV1,
  usersControllerUpdateRoleV1,
  usersControllerUpdateStatusV1,
  type UpdateUserRoleDtoRole,
  type UpdateUserStatusDtoStatus,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Separator, Table } from '../ui';
import { StatusBadge } from '../shopcity';

type UserRecord = Record<string, unknown> & {
  id?: string;
  username?: string;
  role?: string;
  status?: string;
  branchId?: string | null;
};

type DeviceRecord = Record<string, unknown> & {
  id?: string;
  name?: string;
  status?: string;
  branchId?: string | null;
  fingerprintHash?: string;
};

type AuditRecord = Record<string, unknown> & {
  id?: string;
  actorId?: string;
  action?: string;
  subjectType?: string;
  subjectId?: string;
  createdAt?: string;
};

const roleOptions = ['CASHIER', 'SUPERVISOR', 'ADMIN', 'SYSTEM'];
const userStatusOptions = ['ACTIVE', 'DISABLED', 'SUSPENDED'];
const deviceStatusOptions = ['ACTIVE', 'INACTIVE'];

export function AdminOperationsPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRecord[]>([]);
  const [actorId, setActorId] = useState('admin');
  const [message, setMessage] = useState('Loading admin operations…');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [role, setRole] = useState<UpdateUserRoleDtoRole>('ADMIN');
  const [status, setStatus] = useState<UpdateUserStatusDtoStatus>('ACTIVE');
  const [deviceStatus, setDeviceStatus] = useState<UpdateDeviceDtoStatus>('ACTIVE');

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );
  const selectedDevice = useMemo(
    () => devices.find((item) => item.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  useEffect(() => {
    if (selectedUser) {
      setRole((selectedUser.role as UpdateUserRoleDtoRole) ?? 'ADMIN');
      setStatus((selectedUser.status as UpdateUserStatusDtoStatus) ?? 'ACTIVE');
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedDevice) {
      setDeviceStatus((selectedDevice.status as UpdateDeviceDtoStatus) ?? 'ACTIVE');
    }
  }, [selectedDevice]);

  const refreshUsers = useCallback(async () => {
    const response = await usersControllerListUsersV1(createApiRequest({ csrf: true }));
    if (response.status === 200) {
      const nextUsers = response.data.data as UserRecord[];
      setUsers(nextUsers);
      setSelectedUserId(nextUsers[0]?.id ?? null);
      setMessage(`Loaded ${nextUsers.length} users.`);
      return;
    }
    setMessage(`Users unavailable (${response.status}).`);
  }, []);

  const refreshDevices = useCallback(async () => {
    const response = await branchesControllerListDevicesV1(createApiRequest({ csrf: true }));
    if (response.status === 200) {
      const nextDevices = response.data.data as DeviceRecord[];
      setDevices(nextDevices);
      setSelectedDeviceId(nextDevices[0]?.id ?? null);
      setMessage(`Loaded ${nextDevices.length} devices.`);
      return;
    }
    setMessage(`Devices unavailable (${response.status}).`);
  }, []);

  const refreshAudit = useCallback(async () => {
    const response = await auditControllerListV1(
      { actorId },
      createApiRequest({ csrf: true }),
    );
    if (response.status === 200) {
      const nextRows = response.data.data as AuditRecord[];
      setAuditRows(nextRows);
      setMessage(`Loaded ${nextRows.length} audit rows for ${actorId}.`);
      return;
    }
    setMessage(`Audit unavailable (${response.status}).`);
  }, [actorId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshUsers(), refreshDevices(), refreshAudit()]);
    } catch {
      setMessage('Admin operations unavailable.');
    } finally {
      setLoading(false);
    }
  }, [refreshAudit, refreshDevices, refreshUsers]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  async function updateSelectedUserRole() {
    if (!selectedUserId) return;
    await usersControllerUpdateRoleV1(
      selectedUserId,
      { role },
      createApiRequest({ csrf: true }),
    );
    setMessage(`Updated role for ${selectedUserId}.`);
    void refreshUsers();
  }

  async function updateSelectedUserStatus() {
    if (!selectedUserId) return;
    await usersControllerUpdateStatusV1(
      selectedUserId,
      { status },
      createApiRequest({ csrf: true }),
    );
    setMessage(`Updated status for ${selectedUserId}.`);
    void refreshUsers();
  }

  async function updateSelectedDeviceStatus() {
    if (!selectedDeviceId) return;
    await branchesControllerUpdateDeviceV1(
      selectedDeviceId,
      { status: deviceStatus },
      createApiRequest({ csrf: true }),
    );
    setMessage(`Updated device ${selectedDeviceId}.`);
    void refreshDevices();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button variant="secondary" loading={loading} onClick={() => void refreshAll()}>
          Refresh admin data
        </Button>
        <Button variant="ghost" onClick={() => void refreshUsers()}>
          Refresh users
        </Button>
        <Button variant="ghost" onClick={() => void refreshDevices()}>
          Refresh devices
        </Button>
      </div>

      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>

      <Alert tone="info" title="Admin contract surfaces">
        Use the backend contracts to review users, devices and audit trails before making role or status changes.
      </Alert>

      <div style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
        <section style={cardStyle} aria-label="Users workspace">
          <h3 style={{ marginTop: 0 }}>Users workspace</h3>
          <Table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((item) => (
                <tr key={item.id ?? item.username ?? JSON.stringify(item)}>
                  <td>
                    <button type="button" onClick={() => setSelectedUserId(item.id ?? null)} style={rowButtonStyle}>
                      {item.username ?? item.id ?? 'User'}
                    </button>
                  </td>
                  <td>{item.role ?? '—'}</td>
                  <td>{item.status ?? '—'}</td>
                  <td>{item.branchId ?? 'Tenant-wide'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {selectedUser ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', marginTop: 'var(--sc-spacing-4)' }}>
              <Separator />
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <Select
                  aria-label="Role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UpdateUserRoleDtoRole)}
                  options={roleOptions.map((value) => ({ value, label: value }))}
                />
                <Select
                  aria-label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as UpdateUserStatusDtoStatus)}
                  options={userStatusOptions.map((value) => ({ value, label: value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
                <Button onClick={() => void updateSelectedUserRole()}>Update role</Button>
                <Button variant="secondary" onClick={() => void updateSelectedUserStatus()}>Update status</Button>
              </div>
              <Table>
                <tbody>
                  {Object.entries(selectedUser).slice(0, 5).map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{describeValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
        </section>

        <section style={cardStyle} aria-label="Devices workspace">
          <h3 style={{ marginTop: 0 }}>Devices workspace</h3>
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
              {devices.slice(0, 5).map((item) => (
                <tr key={item.id ?? item.name ?? JSON.stringify(item)}>
                  <td>
                    <button type="button" onClick={() => setSelectedDeviceId(item.id ?? null)} style={rowButtonStyle}>
                      {item.name ?? item.id ?? 'Device'}
                    </button>
                  </td>
                  <td>{item.status ?? '—'}</td>
                  <td>{item.branchId ?? 'Tenant-wide'}</td>
                  <td>{item.fingerprintHash ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {selectedDevice ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', marginTop: 'var(--sc-spacing-4)' }}>
              <Separator />
              <Select
                aria-label="Device status"
                value={deviceStatus}
                onChange={(event) => setDeviceStatus(event.target.value as UpdateDeviceDtoStatus)}
                options={deviceStatusOptions.map((value) => ({ value, label: value }))}
              />
              <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
                <Button onClick={() => void updateSelectedDeviceStatus()}>Update device status</Button>
              </div>
              <Table>
                <tbody>
                  {Object.entries(selectedDevice).slice(0, 5).map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{describeValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
        </section>

        <section style={cardStyle} aria-label="Audit workspace">
          <h3 style={{ marginTop: 0 }}>Audit workspace</h3>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)', gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <Input aria-label="Audit actor" value={actorId} onChange={(event) => setActorId(event.target.value)} />
            <Button variant="secondary" onClick={() => void refreshAudit()}>Load audit trail</Button>
          </div>
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
              {auditRows.slice(0, 5).map((item) => (
                <tr key={item.id ?? `${item.action ?? 'audit'}-${item.subjectId ?? 'row'}`}>
                  <td>{item.action ?? '—'}</td>
                  <td>{item.subjectType ?? item.subjectId ?? '—'}</td>
                  <td>{item.actorId ?? '—'}</td>
                  <td>{item.createdAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap', marginTop: 'var(--sc-spacing-3)' }}>
            <StatusBadge label={`Users: ${users.length}`} tone="info" />
            <StatusBadge label={`Devices: ${devices.length}`} tone="info" />
            <StatusBadge label={`Audit rows: ${auditRows.length}`} tone="success" />
          </div>
        </section>
      </div>
    </section>
  );
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

const cardStyle = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-4)',
  background: 'var(--sc-color-neutral-0)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const rowButtonStyle = {
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
};
