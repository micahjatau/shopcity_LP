'use client';

import type { CSSProperties } from 'react';
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
import {
  Alert,
  Button,
  Input,
  RadioGroup,
  Select,
  Separator,
  Table,
} from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

const roles = ['CASHIER', 'SUPERVISOR', 'ADMIN'] as const;
const statuses = ['ACTIVE', 'DISABLED', 'SUSPENDED'] as const;

type UserRecord = {
  id?: string;
  username?: string;
  role?: (typeof roles)[number];
  status?: (typeof statuses)[number];
  branchId?: string;
};

type BranchRecord = {
  id?: string;
  name?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    'Load users, then create or update staff accounts.',
  );
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof roles)[number]>('CASHIER');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('ACTIVE');
  const [createConfirmation, setCreateConfirmation] = useState('');
  const [updateConfirmation, setUpdateConfirmation] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedId) ?? null,
    [selectedId, users],
  );

  const branchOptions = branches
    .filter((branch): branch is BranchRecord & { id: string } =>
      Boolean(branch.id),
    )
    .map((branch) => ({
      value: branch.id,
      label: branch.name ?? branch.id,
    }));

  useEffect(() => {
    if (selectedUser) {
      setRole((selectedUser.role as (typeof roles)[number]) ?? 'CASHIER');
      setStatus((selectedUser.status as (typeof statuses)[number]) ?? 'ACTIVE');
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
        const nextUsers = usersResponse.data.data as UserRecord[];
        setUsers(nextUsers);
        setSelectedId(nextUsers[0]?.id ?? null);
      }

      if (branchesResponse.status === 200) {
        const nextBranches = branchesResponse.data.data as BranchRecord[];
        setBranches(nextBranches);
        setBranchId((current) => current || nextBranches[0]?.id || '');
      }

      setActionResponse(null);
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
      setActionMessage('Creating user…');
      const response = await usersControllerCreateUserV1(
        {
          username: username.trim(),
          password,
          role,
          branchId: branchId || undefined,
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
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
      setActionMessage(`Updating role for ${selectedId}…`);
      const response = await usersControllerUpdateRoleV1(
        selectedId,
        { role },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
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
      setActionMessage(`Updating status for ${selectedId}…`);
      const response = await usersControllerUpdateStatusV1(
        selectedId,
        { status },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
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

  const selectedPreview = selectedUser
    ? [
        ['Username', selectedUser.username ?? selectedUser.id ?? '—'],
        ['Role', selectedUser.role ?? '—'],
        ['Status', selectedUser.status ?? '—'],
        ['Branch', selectedUser.branchId ?? 'Tenant-wide'],
        ['Selected branch', branchId || 'Tenant-wide'],
        ['Selected role', role],
        ['Selected status', status],
      ]
    : [];

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Create staff, assign role and branch, and keep status changes visible.
        </p>
        <Link href="/admin">Back to admin</Link>
      </header>

      <div style={summaryRow}>
        <StatusBadge label={`Users ${users.length}`} tone="info" />
        <StatusBadge label={`Branches ${branches.length}`} tone="success" />
        <StatusBadge
          label={selectedUser ? 'Selected' : 'No selection'}
          tone="neutral"
        />
      </div>

      <p style={muted}>{message}</p>

      <section style={cardStyle} aria-label="Create user">
        <h2 style={{ marginTop: 0 }}>Create user</h2>
        <div style={formGrid}>
          <Input
            aria-label="Username"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            aria-label="Password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Select
            aria-label="Branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            options={[{ value: '', label: 'Tenant-wide' }, ...branchOptions]}
          />
        </div>
        <RadioGroup
          name="user-role"
          legend="Role"
          value={role}
          onValueChange={(value) => setRole(value as (typeof roles)[number])}
          options={roles.map((value) => ({ value, label: value }))}
        />
        <Input
          aria-label="Create confirmation"
          placeholder="Type CREATE to confirm"
          value={createConfirmation}
          onChange={(event) => setCreateConfirmation(event.target.value)}
        />
        <div style={toolbarRow}>
          <Button onClick={() => void createUser()} loading={loading}>
            Create user
          </Button>
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </section>

      {selectedUser ? (
        <section style={cardStyle} aria-label="Selected user">
          <h2 style={{ marginTop: 0 }}>Selected user</h2>
          <Alert tone="info" title="Selected user">
            {selectedUser.username ?? selectedUser.id} is ready for role and
            status review.
          </Alert>
          <div style={summaryRow}>
            <StatusBadge
              label={selectedUser.role ?? 'Unknown role'}
              tone="info"
            />
            <StatusBadge
              label={selectedUser.status ?? 'Unknown status'}
              tone={selectedUser.status === 'ACTIVE' ? 'success' : 'warning'}
            />
            <StatusBadge
              label={selectedUser.branchId ?? 'Tenant-wide'}
              tone="neutral"
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
          <Separator />
          <div style={formGrid}>
            <Select
              aria-label="Role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as (typeof roles)[number])
              }
              options={roles.map((value) => ({ value, label: value }))}
            />
            <Select
              aria-label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as (typeof statuses)[number])
              }
              options={statuses.map((value) => ({ value, label: value }))}
            />
          </div>
          <Input
            aria-label="Update confirmation"
            placeholder="Type UPDATE to confirm"
            value={updateConfirmation}
            onChange={(event) => setUpdateConfirmation(event.target.value)}
          />
          <div style={toolbarRow}>
            <Button onClick={() => void updateUserRole()}>Update role</Button>
            <Button variant="secondary" onClick={() => void updateUserStatus()}>
              Update status
            </Button>
          </div>
        </section>
      ) : null}

      {users.length === 0 ? (
        <Alert tone="warning" title="No users">
          No user records returned.
        </Alert>
      ) : (
        <section style={cardStyle} aria-label="Users table">
          <h2 style={{ marginTop: 0 }}>Staff list</h2>
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
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id ?? null)}
                      style={rowButton}
                    >
                      {item.username ?? item.id}
                    </button>
                  </td>
                  <td>{item.role ?? '—'}</td>
                  <td>
                    <StatusBadge
                      label={item.status ?? 'UNKNOWN'}
                      tone={item.status === 'ACTIVE' ? 'success' : 'warning'}
                    />
                  </td>
                  <td>{item.branchId ?? 'Tenant-wide'}</td>
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
            'Select a record and submit a change to see the backend response here.'}
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

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
