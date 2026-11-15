'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  branchesControllerCreateBranchV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateBranchV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table } from '../ui';
import { CashierPageHeader, StatusBadge } from '../shopcity';
import styles from '../devices/admin-device-branch-workflows.module.css';

type BranchRecord = {
  id?: string;
  name?: string;
  status?: string;
  timezone?: string;
  receiptWeekStartDay?: number;
  createdAt?: string | null;
};
type DeviceRecord = {
  id?: string;
  name?: string;
  branchId?: string;
  status?: string;
  authBindingMode?: string;
};
const PAGE_SIZE = 5;

function responseData<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } } | null | undefined)?.data?.data;
}

function displayDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function weekStart(value?: number): string {
  if (typeof value !== 'number') return 'Not available';
  return (
    [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][value] ?? String(value)
  );
}

type BranchForm = {
  name: string;
  timezone: string;
  receiptWeekStartDay: string;
};
const defaultForm: BranchForm = {
  name: '',
  timezone: 'Africa/Lagos',
  receiptWeekStartDay: '1',
};

export function AdminBranchDirectory() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [branchResponse, deviceResponse] = await Promise.all([
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
        branchesControllerListDevicesV1(createApiRequest({ csrf: true })),
      ]);
      if (branchResponse.status !== 200 || deviceResponse.status !== 200)
        throw new Error('Branch list unavailable');
      const nextBranches = responseData<BranchRecord[]>(branchResponse);
      const nextDevices = responseData<DeviceRecord[]>(deviceResponse);
      if (!Array.isArray(nextBranches) || !Array.isArray(nextDevices))
        throw new Error('Invalid directory response');
      setBranches(nextBranches.filter((branch) => Boolean(branch.id)));
      setDevices(nextDevices);
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return branches.filter((branch) => {
      if (status !== 'ALL' && branch.status !== status) return false;
      return (
        !term ||
        [branch.name, branch.timezone, branch.status].some((value) =>
          String(value ?? '')
            .toLocaleLowerCase()
            .includes(term),
        )
      );
    });
  }, [branches, query, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Branches"
        description="Search tenant branches, review their settings and device counts, and open a branch profile."
      />
      <section
        className={styles.directory}
        aria-label="Branch directory"
        aria-busy={loading}
      >
        <div className={`${styles.toolbar} ${styles.branchToolbar}`}>
          <div className={styles.search} role="search">
            <Search aria-hidden="true" size={16} />
            <Input
              type="search"
              aria-label="Search branches"
              placeholder="Branch name or timezone"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.filter}>
            <span>Status</span>
            <Select
              aria-label="Filter branches by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            loading={loading}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
          <Button
            type="button"
            className="sc-button sc-button--primary sc-button--standard"
            onClick={() => router.push('/admin/branches/new')}
          >
            Create branch
          </Button>
        </div>
        {failed ? (
          <div className={styles.errorState} role="alert">
            <p>Branches or device assignments could not be loaded.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {loading && branches.length === 0 ? (
          <div className={styles.skeleton} aria-label="Loading branches">
            {[0, 1, 2].map((row) => (
              <span key={row} />
            ))}
          </div>
        ) : null}
        {!loading && !failed && branches.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No branches are configured yet. Create a branch to start managing
            locations.
          </p>
        ) : null}
        {!loading && !failed && branches.length > 0 && filtered.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No branches match this search and status filter.
          </p>
        ) : null}
        {!failed && visible.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="sr-only">
                  Tenant branches. Five branches are shown per page.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Branch</th>
                    <th scope="col">Status</th>
                    <th scope="col">Timezone</th>
                    <th scope="col">Receipt week starts</th>
                    <th scope="col">Assigned devices</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((branch) => {
                    const id = String(branch.id);
                    const assigned = devices.filter(
                      (device) => device.branchId === id,
                    ).length;
                    const name = branch.name || 'Unnamed branch';
                    return (
                      <tr key={id}>
                        <td data-label="Branch">
                          <strong>{name}</strong>
                        </td>
                        <td data-label="Status">
                          <StatusBadge
                            label={branch.status ?? 'Unknown'}
                            tone={
                              branch.status === 'ACTIVE'
                                ? 'success'
                                : branch.status === 'INACTIVE'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          />
                        </td>
                        <td data-label="Timezone">
                          {branch.timezone || 'Not available'}
                        </td>
                        <td data-label="Receipt week starts">
                          {weekStart(branch.receiptWeekStartDay)}
                        </td>
                        <td data-label="Assigned devices">{assigned}</td>
                        <td data-label="Action">
                          <Link
                            className={styles.profileLink}
                            href={`/admin/branches/${encodeURIComponent(id)}`}
                            aria-label={`View branch ${name}`}
                          >
                            View branch
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={styles.tableCount} aria-live="polite">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length} matching branches.
            </p>
            <nav
              className={styles.pagination}
              aria-label="Branch results pagination"
            >
              <button
                type="button"
                className={styles.paginationButton}
                aria-label="Previous branch page"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <span className={styles.paginationStatus}>
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                aria-label="Next branch page"
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

export function AdminBranchRegistration() {
  const router = useRouter();
  const [form, setForm] = useState<BranchForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [mustReview, setMustReview] = useState(false);
  const [retryReady, setRetryReady] = useState(false);
  const [reviewConfirmation, setReviewConfirmation] = useState('');
  const [refreshedBranches, setRefreshedBranches] = useState<BranchRecord[]>(
    [],
  );
  const submissionGuard = useRef(false);
  const [message, setMessage] = useState(
    'Enter a branch name, timezone and receipt-week start day.',
  );

  async function refreshAfterUncertainResult() {
    setChecking(true);
    try {
      const response = await branchesControllerListBranchesV1(
        createApiRequest({ csrf: true }),
      );
      const records = responseData<BranchRecord[]>(response);
      if (response.status !== 200 || !Array.isArray(records))
        throw new Error('Branch refresh unavailable');
      setRefreshedBranches(records);
      setRetryReady(true);
      setMustReview(true);
      setReviewConfirmation('');
      setMessage(
        'The latest authorized branch list has been refreshed. Review it before deciding whether to retry this non-idempotent creation.',
      );
    } catch {
      setRefreshedBranches([]);
      setRetryReady(false);
      setMustReview(true);
      setMessage(
        'The creation result is uncertain and the branch list could not be refreshed. Do not retry until the directory is available.',
      );
    } finally {
      setChecking(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || checking || submissionGuard.current) return;
    if (mustReview && (!retryReady || reviewConfirmation !== 'REVIEWED'))
      return;
    const name = form.name.trim();
    const timezone = form.timezone.trim();
    const day = Number(form.receiptWeekStartDay);
    if (!name || !timezone) {
      setMessage('Enter both a branch name and timezone.');
      return;
    }
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      setMessage(
        'Receipt-week start day must be a whole number from 0 through 6.',
      );
      return;
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      setMessage('Enter a valid IANA timezone.');
      return;
    }
    if (mustReview) {
      setMustReview(false);
      setRetryReady(false);
      setReviewConfirmation('');
    }
    submissionGuard.current = true;
    setSubmitting(true);
    setMessage('Creating branch…');
    let status: number | undefined;
    try {
      const response = await branchesControllerCreateBranchV1(
        { name, timezone, receiptWeekStartDay: day },
        createApiRequest({ csrf: true }),
      );
      status = response.status;
      if (response.status === 201) {
        const created = responseData<{ id?: string }>(response);
        if (typeof created?.id === 'string' && created.id.trim()) {
          router.push(
            `/admin/branches/${encodeURIComponent(created.id.trim())}`,
          );
          return;
        }
        await refreshAfterUncertainResult();
        setMessage(
          'The server confirmed branch creation but returned no branch ID. The branch list was refreshed; locate the branch before proceeding.',
        );
        return;
      }
      if (status >= 500) {
        await refreshAfterUncertainResult();
        return;
      }
      setMessage(`Branch creation was not confirmed (HTTP ${status}).`);
    } catch {
      await refreshAfterUncertainResult();
    } finally {
      submissionGuard.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header admin-device-branch-page-header"
        title="Create branch"
        description="Add a tenant branch with its timezone and receipt-week settings."
        actions={
          <Link className={styles.inlineLink} href="/admin/branches">
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back to branches</span>
          </Link>
        }
      />
      <section
        className={styles.formCard}
        aria-labelledby="branch-registration-title"
      >
        <h2 id="branch-registration-title">Branch details</h2>
        <p>
          Branch ownership and authorization come from your authenticated Admin
          session.
        </p>
        <form
          className={styles.registrationForm}
          onSubmit={(event) => void submit(event)}
        >
          <label
            className={styles.formField}
            htmlFor="branch-registration-name"
          >
            Branch name
            <Input
              id="branch-registration-name"
              required
              maxLength={100}
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }));
              }}
            />
          </label>
          <label
            className={styles.formField}
            htmlFor="branch-registration-timezone"
          >
            Timezone
            <Input
              id="branch-registration-timezone"
              required
              value={form.timezone}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }));
              }}
            />
          </label>
          <span className={styles.formField}>
            <label htmlFor="branch-registration-week-start">
              Receipt-week start day
            </label>
            <Select
              id="branch-registration-week-start"
              required
              value={form.receiptWeekStartDay}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  receiptWeekStartDay: event.target.value,
                }));
              }}
              options={[
                ['0', 'Sunday'],
                ['1', 'Monday'],
                ['2', 'Tuesday'],
                ['3', 'Wednesday'],
                ['4', 'Thursday'],
                ['5', 'Friday'],
                ['6', 'Saturday'],
              ].map(([value, label]) => ({ value, label }))}
            />
          </span>
          {mustReview && retryReady ? (
            <ul
              className={styles.recordList}
              aria-label="Refreshed authorized branches"
            >
              {refreshedBranches.length ? (
                refreshedBranches.map((branch) => (
                  <li key={branch.id ?? branch.name}>
                    <dl>
                      <dt>Branch</dt>
                      <dd>{branch.name ?? 'Unnamed branch'}</dd>
                      <dt>Branch ID</dt>
                      <dd>{branch.id ?? 'Not available'}</dd>
                      <dt>Timezone</dt>
                      <dd>{branch.timezone ?? 'Not available'}</dd>
                      <dt>Receipt week starts</dt>
                      <dd>{weekStart(branch.receiptWeekStartDay)}</dd>
                    </dl>
                  </li>
                ))
              ) : (
                <li>
                  No branches currently exist in the authorized branch list.
                </li>
              )}
            </ul>
          ) : null}
          {mustReview && retryReady ? (
            <label
              className={styles.formField}
              htmlFor="branch-registration-review"
            >
              Confirm you reviewed the refreshed branch list to retry
              <Input
                id="branch-registration-review"
                value={reviewConfirmation}
                onChange={(event) => setReviewConfirmation(event.target.value)}
                placeholder="Type REVIEWED after checking branches"
              />
            </label>
          ) : null}
          <div className={styles.formActions}>
            <Button
              type="submit"
              loading={submitting || checking}
              disabled={
                submitting ||
                checking ||
                (mustReview &&
                  (!retryReady || reviewConfirmation !== 'REVIEWED'))
              }
            >
              {mustReview ? 'Retry branch creation' : 'Create branch'}
            </Button>
            <span role="status" aria-live="polite">
              {message}
            </span>
          </div>
        </form>
      </section>
    </section>
  );
}

export function AdminBranchProfile({
  branchId,
}: Readonly<{ branchId: string }>) {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [form, setForm] = useState<BranchForm>(defaultForm);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('Loading branch profile…');
  const [mustReview, setMustReview] = useState(false);
  const submissionGuard = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [branchResponse, deviceResponse] = await Promise.all([
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
        branchesControllerListDevicesV1(createApiRequest({ csrf: true })),
      ]);
      if (branchResponse.status !== 200 || deviceResponse.status !== 200)
        throw new Error('Branch profile unavailable');
      const nextBranches = responseData<BranchRecord[]>(branchResponse);
      const nextDevices = responseData<DeviceRecord[]>(deviceResponse);
      if (!Array.isArray(nextBranches) || !Array.isArray(nextDevices))
        throw new Error('Invalid profile response');
      setBranches(nextBranches);
      setDevices(nextDevices);
      const branch = nextBranches.find((record) => record.id === branchId);
      if (branch) {
        setForm({
          name: branch.name ?? '',
          timezone: branch.timezone ?? 'Africa/Lagos',
          receiptWeekStartDay: String(branch.receiptWeekStartDay ?? 1),
        });
        setMessage('Branch profile loaded.');
      } else {
        setMessage('This branch is unavailable in your authorized account.');
      }
      return true;
    } catch {
      setFailed(true);
      setMessage('Branch details could not be loaded.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const branch = branches.find((record) => record.id === branchId);
  const assignedDevices = useMemo(
    () => devices.filter((device) => device.branchId === branchId),
    [branchId, devices],
  );

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branch || submitting || loading || submissionGuard.current) return;
    if (confirmation !== 'UPDATE') {
      setMessage('Type UPDATE to confirm these branch changes.');
      return;
    }
    const name = form.name.trim();
    const timezone = form.timezone.trim();
    const day = Number(form.receiptWeekStartDay);
    if (!name || !timezone) {
      setMessage('Enter both a branch name and timezone.');
      return;
    }
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      setMessage(
        'Receipt-week start day must be a whole number from 0 through 6.',
      );
      return;
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      setMessage('Enter a valid IANA timezone.');
      return;
    }
    submissionGuard.current = true;
    setSubmitting(true);
    setMessage('Updating branch…');
    let uncertain = false;
    try {
      const response = await branchesControllerUpdateBranchV1(
        branchId,
        { name, timezone, receiptWeekStartDay: day },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setConfirmation('');
        setMustReview(false);
        setConfirmation('');
        setMessage('Branch settings updated.');
        await refresh();
        return;
      }
      uncertain = response.status >= 500;
      setMessage(
        uncertain
          ? 'The update result is uncertain; refresh the authoritative profile before retrying.'
          : `Branch update was not confirmed (HTTP ${response.status}).`,
      );
    } catch {
      uncertain = true;
      setMessage(
        'The update result is uncertain; refresh the authoritative profile before retrying.',
      );
    } finally {
      setSubmitting(false);
      if (!uncertain) submissionGuard.current = false;
    }
    if (uncertain) {
      const refreshed = await refresh();
      setMustReview(true);
      setConfirmation('');
      setMessage(
        refreshed
          ? 'The authoritative branch profile was refreshed. Review the persisted values before confirming another update.'
          : 'The authoritative profile could not be refreshed. Do not retry until branch details are available.',
      );
      submissionGuard.current = false;
    }
  }

  if (loading)
    return (
      <section className="supervisor-page sc-page">
        <CashierPageHeader
          className="cashier-route-header supervisor-page__header admin-device-branch-page-header"
          title="Branch profile"
          description="Loading authorized branch details."
          actions={
            <Link className={styles.inlineLink} href="/admin/branches">
              <ArrowLeft aria-hidden="true" size={16} />
              <span>Back to branches</span>
            </Link>
          }
        />
        <div className={styles.directory} aria-busy="true">
          <div className={styles.skeleton} aria-label="Loading branch profile">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    );

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header admin-device-branch-page-header"
        title={branch?.name ?? 'Branch profile'}
        description="Review branch settings and the POS devices assigned to this location."
        actions={
          <Link className={styles.inlineLink} href="/admin/branches">
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back to branches</span>
          </Link>
        }
      />
      {failed ? (
        <div className={styles.errorState} role="alert">
          <p>{message}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </div>
      ) : !branch ? (
        <Alert tone="warning" title="Branch unavailable">
          This branch could not be found in your authorized account. No other
          tenant data is exposed.
        </Alert>
      ) : (
        <>
          <section
            className={styles.formCard}
            aria-labelledby="branch-profile-details-title"
          >
            <h2 id="branch-profile-details-title">Branch settings</h2>
            <Table>
              <tbody>
                <tr>
                  <th scope="row">Status</th>
                  <td>
                    <StatusBadge
                      label={branch.status ?? 'Unknown'}
                      tone={
                        branch.status === 'ACTIVE'
                          ? 'success'
                          : branch.status === 'INACTIVE'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Timezone</th>
                  <td>{branch.timezone ?? 'Not available'}</td>
                </tr>
                <tr>
                  <th scope="row">Receipt week starts</th>
                  <td>{weekStart(branch.receiptWeekStartDay)}</td>
                </tr>
                <tr>
                  <th scope="row">Created</th>
                  <td>{displayDate(branch.createdAt)}</td>
                </tr>
                <tr>
                  <th scope="row">Assigned devices</th>
                  <td>{assignedDevices.length}</td>
                </tr>
              </tbody>
            </Table>
            <form
              className={styles.registrationForm}
              onSubmit={(event) => void update(event)}
            >
              <label className={styles.formField} htmlFor="branch-profile-name">
                Branch name
                <Input
                  id="branch-profile-name"
                  required
                  maxLength={100}
                  disabled={submitting || loading}
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    setMustReview(false);
                    setConfirmation('');
                  }}
                />
              </label>
              <label
                className={styles.formField}
                htmlFor="branch-profile-timezone"
              >
                Timezone
                <Input
                  id="branch-profile-timezone"
                  required
                  disabled={submitting || loading}
                  value={form.timezone}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }));
                    setMustReview(false);
                    setConfirmation('');
                  }}
                />
              </label>
              <span className={styles.formField}>
                <label htmlFor="branch-profile-week-start">
                  Receipt-week start day
                </label>
                <Select
                  id="branch-profile-week-start"
                  required
                  disabled={submitting || loading}
                  value={form.receiptWeekStartDay}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      receiptWeekStartDay: event.target.value,
                    }));
                    setMustReview(false);
                    setConfirmation('');
                  }}
                  options={[
                    ['0', 'Sunday'],
                    ['1', 'Monday'],
                    ['2', 'Tuesday'],
                    ['3', 'Wednesday'],
                    ['4', 'Thursday'],
                    ['5', 'Friday'],
                    ['6', 'Saturday'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </span>
              <label
                className={styles.formField}
                htmlFor="branch-update-confirmation"
              >
                Type UPDATE to confirm changes
                <Input
                  id="branch-update-confirmation"
                  disabled={submitting || loading}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </label>
              {mustReview ? (
                <p role="status">
                  The branch is still available. Compare its persisted settings
                  above with your intended changes before confirming another
                  update.
                </p>
              ) : null}
              <div className={styles.formActions}>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting || loading || confirmation !== 'UPDATE'}
                >
                  Save branch settings
                </Button>
                <span role="status" aria-live="polite">
                  {message}
                </span>
              </div>
            </form>
          </section>
          <section className={styles.directory} aria-label="Branch devices">
            <h2>Assigned devices</h2>
            {assignedDevices.length === 0 ? (
              <p className={styles.statusMessage}>
                No devices are assigned to this branch.
              </p>
            ) : (
              <ul className={styles.recordList}>
                {assignedDevices.map((device) => (
                  <li key={device.id}>
                    <dl>
                      <dt>Device</dt>
                      <dd>{device.name ?? 'Unnamed device'}</dd>
                      <dt>Status</dt>
                      <dd>{device.status ?? 'Unknown'}</dd>
                      <dt>Binding</dt>
                      <dd>
                        {device.authBindingMode === 'UNPAIRED'
                          ? 'Unpaired'
                          : (device.authBindingMode?.replaceAll('_', ' ') ??
                            'Unknown')}
                      </dd>
                    </dl>
                    {device.id ? (
                      <Link
                        className={styles.profileLink}
                        href={`/admin/devices/${encodeURIComponent(device.id)}`}
                        aria-label={`View profile for ${device.name ?? 'device'}`}
                      >
                        View profile
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
