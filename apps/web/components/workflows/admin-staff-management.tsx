'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button, Input, Select } from '../ui';
import { CashierPageHeader, StatusBadge } from '../shopcity';
import {
  branchesControllerListBranchesV1,
  usersControllerCreateUserV1,
  usersControllerListUsersV1,
  usersControllerUpdateRoleV1,
  usersControllerUpdateStatusV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import styles from './admin-staff-management.module.css';

const STAFF_ROLES = ['CASHIER', 'SUPERVISOR', 'ADMIN'] as const;
const STAFF_STATUSES = ['ACTIVE', 'DISABLED', 'SUSPENDED'] as const;
const STAFF_PAGE_SIZE = 5;

type StaffRole = (typeof STAFF_ROLES)[number];
type StaffStatus = (typeof STAFF_STATUSES)[number];
type StaffRecord = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phoneNumber?: string | null;
  role?: StaffRole;
  status?: StaffStatus;
  branchId?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};
type BranchRecord = { id?: string; name?: string; status?: string };
type StaffStatusFilter = 'ALL' | StaffStatus;

type StaffForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: StaffRole;
  branchId: string;
};

const blankStaffForm: StaffForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'CASHIER',
  branchId: '',
};

function dataOf<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } } | null | undefined)?.data?.data;
}

function staffName(staff: StaffRecord): string {
  const name = [staff.firstName, staff.lastName]
    .filter((part): part is string => typeof part === 'string' && !!part.trim())
    .map((part) => part.trim())
    .join(' ');
  return name || staff.username || staff.id || 'Name not provided';
}

function branchLabel(
  branchId: string | null | undefined,
  branches: BranchRecord[],
): string {
  if (!branchId) return 'Branch not provided';
  return branches.find((branch) => branch.id === branchId)?.name ?? branchId;
}

function statusTone(status: string | null | undefined) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'SUSPENDED') return 'danger' as const;
  if (status === 'DISABLED') return 'warning' as const;
  return 'neutral' as const;
}

function formatAccountDate(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

async function loadBranches(): Promise<BranchRecord[]> {
  try {
    const response = await branchesControllerListBranchesV1(
      createApiRequest({ csrf: true }),
    );
    if (response.status !== 200) return [];
    return dataOf<BranchRecord[]>(response) ?? [];
  } catch {
    return [];
  }
}

export function AdminStaffDirectory() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [staffResponse, nextBranches] = await Promise.all([
        usersControllerListUsersV1(createApiRequest({ csrf: true })),
        loadBranches(),
      ]);
      if (staffResponse.status !== 200) {
        throw new Error(`Staff list unavailable (${staffResponse.status})`);
      }
      const nextStaff = dataOf<StaffRecord[]>(staffResponse);
      if (!Array.isArray(nextStaff)) throw new Error('Invalid staff response');
      setStaff(nextStaff.filter((record) => Boolean(record.id)));
      setBranches(nextBranches);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredStaff = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return staff.filter((record) => {
      const matchesStatus =
        statusFilter === 'ALL' || record.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [
        record.firstName,
        record.lastName,
        staffName(record),
        record.username,
        record.phoneNumber,
        record.role,
        record.status,
        branchLabel(record.branchId, branches),
      ].some((value) =>
        String(value ?? '')
          .toLocaleLowerCase()
          .includes(term),
      );
    });
  }, [branches, query, staff, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredStaff.length / STAFF_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const firstVisible = filteredStaff.length
    ? (currentPage - 1) * STAFF_PAGE_SIZE + 1
    : 0;
  const visibleStaff = filteredStaff.slice(
    (currentPage - 1) * STAFF_PAGE_SIZE,
    currentPage * STAFF_PAGE_SIZE,
  );
  const filterLabel =
    statusFilter === 'ALL'
      ? 'staff member'
      : `${statusFilter.toLowerCase()} staff member`;

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Staff"
        description="Find staff accounts and open their profiles."
      />
      <section
        className={styles.directory}
        aria-label="Staff directory"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <span className={styles.searchControl}>
              <Search aria-hidden="true" size={16} />
              <Input
                type="search"
                className={styles.searchInput}
                aria-label="Search staff by name, email, or phone"
                placeholder="Name, email, or phone"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </form>
          <div className={styles.actions}>
            <div className={styles.filter}>
              <span className="sr-only">Filter staff by status</span>
              <Select
                aria-label="Filter staff by status"
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StaffStatusFilter);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'DISABLED', label: 'Disabled' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
            </div>
            <Button
              type="button"
              className={styles.registerButton}
              onClick={() => router.push('/admin/users/new')}
            >
              Register staff
            </Button>
          </div>
        </div>

        {failed ? (
          <div className={styles.errorState} role="alert">
            <p>
              Staff could not be loaded. Your previous results remain available.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {loading && staff.length === 0 ? (
          <div className={styles.skeleton} aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <span key={row} className={styles.skeletonRow} />
            ))}
          </div>
        ) : null}
        {!loading && !failed && staff.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No staff accounts yet. Register staff to add the first account.
          </p>
        ) : null}
        {!loading &&
        !failed &&
        staff.length > 0 &&
        filteredStaff.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No {filterLabel} matched this search and status filter.
          </p>
        ) : null}

        {visibleStaff.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="sr-only">
                  Staff accounts. Five records are shown per page.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Staff member</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map((record) => {
                    const id = String(record.id);
                    const name = staffName(record);
                    return (
                      <tr key={id}>
                        <td data-label="Staff member">
                          <span className={styles.identity}>
                            <strong>{name}</strong>
                            <span>
                              {record.username || 'Email not provided'}
                            </span>
                          </span>
                        </td>
                        <td data-label="Phone">
                          {record.phoneNumber || (
                            <span className={styles.mutedValue}>
                              Not provided
                            </span>
                          )}
                        </td>
                        <td data-label="Role">
                          {record.role ?? 'Not provided'}
                        </td>
                        <td data-label="Status">
                          <StatusBadge
                            label={record.status ?? 'Unknown'}
                            tone={statusTone(record.status)}
                          />
                        </td>
                        <td data-label="Branch">
                          {branchLabel(record.branchId, branches)}
                        </td>
                        <td data-label="Action">
                          <Link
                            className={styles.profileLink}
                            href={`/admin/users/${encodeURIComponent(id)}`}
                            aria-label={`View profile for ${name}`}
                          >
                            View profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={styles.tableCount} aria-live="polite">
              Showing {firstVisible}–{firstVisible + visibleStaff.length - 1} of{' '}
              {filteredStaff.length} staff{' '}
              {filteredStaff.length === 1 ? 'member' : 'members'}.
            </p>
            <nav
              className={styles.pagination}
              aria-label="Staff results pagination"
            >
              <button
                className={styles.paginationButton}
                type="button"
                aria-label="Previous staff page"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <p className={styles.paginationStatus}>
                Page {currentPage} of {pageCount}
              </p>
              <button
                className={styles.paginationButton}
                type="button"
                aria-label="Next staff page"
                disabled={currentPage >= pageCount || loading}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </nav>
          </>
        ) : null}
      </section>
    </section>
  );
}

export function AdminStaffRegistration() {
  const router = useRouter();
  const [form, setForm] = useState<StaffForm>(blankStaffForm);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesFailed, setBranchesFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [needsDirectoryCheck, setNeedsDirectoryCheck] = useState(false);
  const [message, setMessage] = useState(
    'Enter staff details and choose an account role.',
  );

  const loadBranchOptions = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesFailed(false);
    try {
      const response = await branchesControllerListBranchesV1(
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error(String(response.status));
      const records = dataOf<BranchRecord[]>(response);
      if (!Array.isArray(records)) throw new Error('Invalid branch response');
      setBranches(records);
      setForm((current) => ({
        ...current,
        branchId: current.branchId || records[0]?.id || '',
      }));
    } catch {
      setBranchesFailed(true);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranchOptions();
  }, [loadBranchOptions]);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsDirectoryCheck) {
      setMessage('Check the staff list for this email before trying again.');
      return;
    }
    if (!form.branchId) {
      setMessage('Choose a branch before registering staff.');
      return;
    }

    setSubmitting(true);
    setMessage('Creating staff account…');
    try {
      const response = await usersControllerCreateUserV1(
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: form.email.trim().toLowerCase(),
          phoneNumber: form.phoneNumber.trim(),
          password: form.password,
          role: form.role,
          branchId: form.branchId,
        },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 201) {
        const created = dataOf<{ id?: string }>(response);
        setForm((current) => ({ ...current, password: '' }));
        if (typeof created?.id === 'string' && created.id.trim()) {
          router.push(`/admin/users/${encodeURIComponent(created.id.trim())}`);
          return;
        }
        setNeedsDirectoryCheck(true);
        setMessage(
          'The account was created, but its profile could not be opened. Check the staff list by email before retrying.',
        );
        return;
      }
      if (response.status >= 500) {
        setNeedsDirectoryCheck(true);
        setMessage(
          'The server could not confirm the registration. Check the staff list by email before retrying.',
        );
        return;
      }
      setMessage(
        `Staff registration was not confirmed (HTTP ${response.status}).`,
      );
    } catch {
      setNeedsDirectoryCheck(true);
      setMessage(
        'The registration result could not be confirmed. Check the staff list by email before retrying.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm<K extends keyof StaffForm>(key: K, value: StaffForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNeedsDirectoryCheck(false);
  }

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Register staff"
        description="Create an individual staff account for a selected branch."
        actions={
          <Link className={styles.inlineLink} href="/admin/users">
            Back to staff
          </Link>
        }
      />
      <section
        className={styles.registrationCard}
        aria-labelledby="staff-registration-title"
      >
        <h2 className={styles.sectionTitle} id="staff-registration-title">
          Staff details
        </h2>
        <p className={styles.formHint}>
          The selected role is saved to the staff account and remains enforced
          by the backend.
        </p>
        <form className={styles.registrationForm} onSubmit={submitRegistration}>
          <label className={styles.formField} htmlFor="staff-first-name">
            First name
            <Input
              id="staff-first-name"
              autoComplete="given-name"
              required
              maxLength={80}
              value={form.firstName}
              onChange={(event) => updateForm('firstName', event.target.value)}
            />
          </label>
          <label className={styles.formField} htmlFor="staff-last-name">
            Last name
            <Input
              id="staff-last-name"
              autoComplete="family-name"
              required
              maxLength={80}
              value={form.lastName}
              onChange={(event) => updateForm('lastName', event.target.value)}
            />
          </label>
          <label className={styles.formField} htmlFor="staff-email">
            Email
            <Input
              id="staff-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
            />
          </label>
          <label className={styles.formField} htmlFor="staff-phone">
            Phone number
            <Input
              id="staff-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              minLength={7}
              maxLength={32}
              required
              value={form.phoneNumber}
              onChange={(event) =>
                updateForm('phoneNumber', event.target.value)
              }
            />
          </label>
          <label className={styles.formField} htmlFor="staff-password">
            Password
            <Input
              id="staff-password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(event) => updateForm('password', event.target.value)}
            />
          </label>
          <label className={styles.formField} htmlFor="staff-role">
            Role
            <Select
              id="staff-role"
              required
              value={form.role}
              onChange={(event) =>
                updateForm('role', event.target.value as StaffRole)
              }
              options={STAFF_ROLES.map((role) => ({
                value: role,
                label: role,
              }))}
            />
          </label>
          <label
            className={`${styles.formField} ${styles.fullRow}`}
            htmlFor="staff-branch"
          >
            Branch
            <Select
              id="staff-branch"
              required
              disabled={
                branchesLoading || branchesFailed || branches.length === 0
              }
              value={form.branchId}
              onChange={(event) => updateForm('branchId', event.target.value)}
              placeholder={
                branchesLoading ? 'Loading branches…' : 'Choose a branch'
              }
              options={branches
                .filter((branch): branch is BranchRecord & { id: string } =>
                  Boolean(branch.id),
                )
                .map((branch) => ({
                  value: branch.id,
                  label: branch.name ?? branch.id,
                }))}
            />
          </label>
          {branchesFailed ? (
            <div className={styles.fullRow} role="alert">
              <p className={styles.formHint}>Branches could not be loaded.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadBranchOptions()}
              >
                Retry branch loading
              </Button>
            </div>
          ) : null}
          {!branchesLoading && !branchesFailed && branches.length === 0 ? (
            <p className={`${styles.formHint} ${styles.fullRow}`} role="alert">
              No branch is available for staff registration.
            </p>
          ) : null}
          <p
            className={`${styles.formHint} ${styles.fullRow}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
          {needsDirectoryCheck ? (
            <p className={`${styles.formHint} ${styles.fullRow}`}>
              <Link className={styles.inlineLink} href="/admin/users">
                Open the staff list
              </Link>{' '}
              and search by email before attempting another registration.
            </p>
          ) : null}
          <div className={`${styles.formActions} ${styles.fullRow}`}>
            <Link className={styles.inlineLink} href="/admin/users">
              Cancel
            </Link>
            <Button
              type="submit"
              loading={submitting || branchesLoading}
              disabled={
                branchesFailed || branches.length === 0 || needsDirectoryCheck
              }
            >
              Register staff
            </Button>
          </div>
        </form>
      </section>
    </section>
  );
}

export function AdminStaffProfile({ userId }: Readonly<{ userId: string }>) {
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [status, setStatus] = useState<StaffStatus>('ACTIVE');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('Loading staff profile…');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState<'role' | 'status' | null>(null);

  const refreshProfile = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setLoadFailed(false);
      setNotFound(false);
      try {
        const [staffResponse, nextBranches] = await Promise.all([
          usersControllerListUsersV1(createApiRequest({ csrf: true })),
          loadBranches(),
        ]);
        if (staffResponse.status !== 200) {
          throw new Error(`Staff list unavailable (${staffResponse.status})`);
        }
        const records = dataOf<StaffRecord[]>(staffResponse);
        if (!Array.isArray(records)) throw new Error('Invalid staff response');
        const nextStaff =
          records.find((record) => record.id === userId) ?? null;
        setBranches(nextBranches);
        setStaff(nextStaff);
        if (!nextStaff) {
          setNotFound(true);
          setMessage('This staff profile is not available in your tenant.');
          return;
        }
        setRole(nextStaff.role ?? 'CASHIER');
        setStatus(nextStaff.status ?? 'ACTIVE');
        if (!quiet) setMessage('Staff profile loaded.');
      } catch {
        setStaff(null);
        setLoadFailed(true);
        setMessage('Staff profile could not be loaded.');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  async function updateRole() {
    if (!staff?.id) return;
    if (confirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the role change.');
      return;
    }
    setSaving('role');
    setMessage('Updating role…');
    try {
      const response = await usersControllerUpdateRoleV1(
        staff.id,
        { role },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status !== 200) {
        setMessage(`Role update was not confirmed (HTTP ${response.status}).`);
        return;
      }
      setConfirmation('');
      setMessage('Role updated. Existing sessions may need to sign in again.');
      await refreshProfile(true);
    } catch {
      setMessage(
        'Role update could not be confirmed. Refresh the profile before retrying.',
      );
    } finally {
      setSaving(null);
    }
  }

  async function updateStatus() {
    if (!staff?.id) return;
    if (confirmation.trim().toUpperCase() !== 'UPDATE') {
      setMessage('Type UPDATE to confirm the status change.');
      return;
    }
    setSaving('status');
    setMessage('Updating status…');
    try {
      const response = await usersControllerUpdateStatusV1(
        staff.id,
        { status },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status !== 200) {
        setMessage(
          `Status update was not confirmed (HTTP ${response.status}).`,
        );
        return;
      }
      setConfirmation('');
      setMessage('Status updated.');
      await refreshProfile(true);
    } catch {
      setMessage(
        'Status update could not be confirmed. Refresh the profile before retrying.',
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Staff profile"
        description="Review account details, role, and status."
        actions={
          <Link className={styles.inlineLink} href="/admin/users">
            Back to staff
          </Link>
        }
      />
      {loading ? (
        <div className={styles.skeleton} aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <span key={row} className={styles.skeletonRow} />
          ))}
        </div>
      ) : null}
      {loadFailed ? (
        <div className={styles.notFound} role="alert">
          <p>{message}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refreshProfile()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {notFound && !loading ? (
        <div className={styles.notFound} role="status">
          <p>{message}</p>
          <Link className={styles.inlineLink} href="/admin/users">
            Return to staff list
          </Link>
        </div>
      ) : null}
      {!loading && !loadFailed && staff ? (
        <>
          <section
            className={styles.profileCard}
            aria-labelledby="staff-profile-name"
          >
            <div className={styles.profileTop}>
              <div className={styles.profileIdentity}>
                <h2 id="staff-profile-name">{staffName(staff)}</h2>
                <p>{staff.username || 'Email not provided'}</p>
              </div>
              <div className={styles.badgeRow}>
                <StatusBadge
                  label={staff.role ?? 'Role not provided'}
                  tone="info"
                />
                <StatusBadge
                  label={staff.status ?? 'Status not provided'}
                  tone={statusTone(staff.status)}
                />
              </div>
            </div>
            <dl className={styles.detailGrid}>
              <div className={styles.detail}>
                <dt>First name</dt>
                <dd>{staff.firstName?.trim() || 'Not provided'}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Last name</dt>
                <dd>{staff.lastName?.trim() || 'Not provided'}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Email</dt>
                <dd>{staff.username || 'Not provided'}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Phone number</dt>
                <dd>{staff.phoneNumber || 'Not provided'}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Branch</dt>
                <dd>{branchLabel(staff.branchId, branches)}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Created</dt>
                <dd>{formatAccountDate(staff.createdAt)}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Last sign-in</dt>
                <dd>
                  {staff.lastLoginAt
                    ? formatAccountDate(staff.lastLoginAt)
                    : 'Never signed in'}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className={styles.managementPanel}
            aria-labelledby="staff-access-title"
          >
            <h2 className={styles.sectionTitle} id="staff-access-title">
              Role and status
            </h2>
            <p className={styles.formHint}>
              Changes are checked by the server. Role or status changes can end
              the staff member’s active sessions.
            </p>
            <div className={styles.managementGrid}>
              <label className={styles.formField} htmlFor="profile-role">
                Role
                <Select
                  id="profile-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as StaffRole)}
                  options={STAFF_ROLES.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </label>
              <label className={styles.formField} htmlFor="profile-status">
                Status
                <Select
                  id="profile-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as StaffStatus)
                  }
                  options={STAFF_STATUSES.map((value) => ({
                    value,
                    label: value.charAt(0) + value.slice(1).toLowerCase(),
                  }))}
                />
              </label>
            </div>
            <label
              className={styles.formField}
              htmlFor="staff-update-confirmation"
            >
              Confirmation
              <Input
                id="staff-update-confirmation"
                autoComplete="off"
                placeholder="Type UPDATE to confirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <p
              className={styles.statusMessage}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
            <div className={styles.profileActions}>
              <Button
                type="button"
                variant="secondary"
                disabled={!staff.role || role === staff.role || saving !== null}
                loading={saving === 'role'}
                onClick={() => void updateRole()}
              >
                Update role
              </Button>
              <Button
                type="button"
                disabled={
                  !staff.status || status === staff.status || saving !== null
                }
                loading={saving === 'status'}
                onClick={() => void updateStatus()}
              >
                Update status
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
