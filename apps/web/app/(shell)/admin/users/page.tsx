'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerListBranchesV1,
  usersControllerCreateUserV1,
  usersControllerListUsersV1,
  usersControllerUpdateRoleV1,
  usersControllerUpdateStatusV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Select, Table } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const roles = ['CASHIER', 'SUPERVISOR', 'ADMIN'] as const;
const statuses = ['ACTIVE', 'DISABLED', 'SUSPENDED'] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('Load users, then create or update staff accounts.');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof roles)[number]>('CASHIER');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('ACTIVE');
  const [createConfirmation, setCreateConfirmation] = useState('');
  const [updateConfirmation, setUpdateConfirmation] = useState('');

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedId) ?? null,
    [selectedId, users],
  );

  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name ?? branch.id,
  }));

  useEffect(() => {
    if (selectedUser) {
      setRole((selectedUser.role as typeof roles[number]) ?? 'CASHIER');
      setStatus((selectedUser.status as typeof statuses[number]) ?? 'ACTIVE');
      setBranchId((current) => selectedUser.branchId ?? current);
      setUpdateConfirmation('');
    }
  }, [selectedUser]);

  async function refresh() {
    setLoading(true);
    try {
      const [usersResponse, branchesResponse] = await Promise.all([
        usersControllerListUsersV1(createApiRequest({ csrf: true })),
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
      ]);

      if (usersResponse.status === 200) {
        const nextUsers = usersResponse.data.data as any[];
        setUsers(nextUsers);
        setSelectedId(nextUsers[0]?.id ?? null);
      }

      if (branchesResponse.status === 200) {
        const nextBranches = branchesResponse.data.data as any[];
        setBranches(nextBranches);
        setBranchId((current) => current || nextBranches[0]?.id || '');
      }

      setMessage('Staff data loaded.');
    } catch {
      setMessage('Staff data unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createUser() {
    if (!username.trim() || !password.trim()) {
      setMessage('Enter username and password to create a user.');
      return;
    }
    if (createConfirmation.trim().toUpperCase() !== 'CREATE') {
      setMessage('Type CREATE to confirm the new user.');
      return;
    }

    try {
      const response = await usersControllerCreateUserV1(
        {
          username: username.trim(),
          password,
          role,
          branchId: branchId || undefined,
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(
        response.status === 201
          ? 'User created.'
          : `Create unavailable (${response.status}).`,
      );
      if (response.status === 201) {
        setUsername('');
        setPassword('');
        setCreateConfirmation('');
      }
      await refresh();
    } catch {
      setMessage('User create unavailable.');
    }
  }

  async function updateUserRole() {
    if (!selectedId) return;
    if (updateConfirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the user change.');
      return;
    }
    try {
      const response = await usersControllerUpdateRoleV1(
        selectedId,
        { role } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(
        response.status === 200
          ? 'Role updated.'
          : `Role update unavailable (${response.status}).`,
      );
      setUpdateConfirmation('');
      await refresh();
    } catch {
      setMessage('Role update unavailable.');
    }
  }

  async function updateUserStatus() {
    if (!selectedId) return;
    if (updateConfirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the user change.');
      return;
    }
    try {
      const response = await usersControllerUpdateStatusV1(
        selectedId,
        { status } as any,
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setMessage(
        response.status === 200
          ? 'Status updated.'
          : `Status update unavailable (${response.status}).`,
      );
      setUpdateConfirmation('');
      await refresh();
    } catch {
      setMessage('Status update unavailable.');
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Create staff, assign role and branch, and keep status changes visible.
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
        <Input aria-label="Username" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
        <Input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Select aria-label="Branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} options={[{ value: '', label: 'Tenant-wide' }, ...branchOptions]} />
      </div>
      <RadioGroup
        name="user-role"
        legend="Role"
        value={role}
        onValueChange={(value) => setRole(value as (typeof roles)[number])}
        options={roles.map((value) => ({ value, label: value }))}
      />
      <RadioGroup
        name="user-status"
        legend="Status"
        value={status}
        onValueChange={(value) => setStatus(value as (typeof statuses)[number])}
        options={statuses.map((value) => ({ value, label: value }))}
      />
      <Input
        aria-label="Confirmation"
        placeholder="Type CREATE or UPDATE to confirm"
        value={createConfirmation || updateConfirmation}
        onChange={(event) => {
          setCreateConfirmation(event.target.value);
          setUpdateConfirmation(event.target.value);
        }}
      />
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void createUser()} loading={loading}>Create user</Button>
        <Button variant="secondary" onClick={() => void updateUserRole()} disabled={!selectedId}>Update role</Button>
        <Button variant="ghost" onClick={() => void updateUserStatus()} disabled={!selectedId}>Update status</Button>
        <Button variant="secondary" onClick={() => void refresh()} loading={loading}>Refresh</Button>
      </div>

      {selectedUser ? (
        <Alert tone="info" title="Selected user">
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
            <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
              <StatusBadge label={selectedUser.username ?? selectedUser.id} tone="info" />
              <StatusBadge label={selectedUser.role ?? 'ROLE pending'} tone="neutral" />
              <StatusBadge label={selectedUser.status ?? 'STATUS pending'} tone={selectedUser.status === 'ACTIVE' ? 'success' : 'warning'} />
            </div>
            <span>{selectedUser.branchId ?? 'Tenant-wide'} · ready for review</span>
          </div>
        </Alert>
      ) : null}

      {users.length === 0 ? (
        <Alert tone="warning" title="No users">No user records returned.</Alert>
      ) : (
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
            {users.map((item) => (
              <tr key={item.id ?? item.username}>
                <td>
                  <button type="button" onClick={() => setSelectedId(item.id ?? null)} style={rowButton}>{item.username ?? item.id}</button>
                </td>
                <td>{item.role ?? '—'}</td>
                <td><StatusBadge label={item.status ?? 'UNKNOWN'} tone={item.status === 'ACTIVE' ? 'success' : 'warning'} /></td>
                <td>{item.branchId ?? 'Tenant-wide'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {selectedUser ? (
        <Table>
          <tbody>
            {Object.entries(selectedUser)
              .slice(0, 6)
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
