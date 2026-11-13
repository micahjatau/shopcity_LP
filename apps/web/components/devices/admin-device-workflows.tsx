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
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select } from '../ui';
import { CashierPageHeader, StatusBadge } from '../shopcity';
import styles from './admin-device-branch-workflows.module.css';

type DeviceRecord = {
  id?: string;
  name?: string;
  status?: string;
  branchId?: string;
  branch?: { name?: string };
  authBindingMode?: string;
  lastSeenAt?: string | null;
};
type BranchRecord = { id?: string; name?: string };
const PAGE_SIZE = 5;
const UNPAIRED = 'UNPAIRED';

function responseData<T>(response: unknown): T | undefined {
  return (response as { data?: { data?: T } } | null | undefined)?.data?.data;
}

function displayDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function bindingLabel(device: DeviceRecord): string {
  if (device.authBindingMode === UNPAIRED) return 'Unpaired';
  return device.authBindingMode?.replaceAll('_', ' ') ?? 'Unknown';
}

export function AdminDeviceDirectory() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [binding, setBinding] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [deviceResponse, branchResponse] = await Promise.all([
        branchesControllerListDevicesV1(createApiRequest({ csrf: true })),
        branchesControllerListBranchesV1(createApiRequest({ csrf: true })),
      ]);
      if (deviceResponse.status !== 200 || branchResponse.status !== 200) {
        throw new Error('Authorized device data is unavailable.');
      }
      const nextDevices = responseData<DeviceRecord[]>(deviceResponse);
      const nextBranches = responseData<BranchRecord[]>(branchResponse);
      if (!Array.isArray(nextDevices) || !Array.isArray(nextBranches)) {
        throw new Error('Invalid directory response.');
      }
      setDevices(nextDevices.filter((device) => Boolean(device.id)));
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

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return devices.filter((device) => {
      if (status !== 'ALL' && device.status !== status) return false;
      if (binding !== 'ALL' && (device.authBindingMode ?? UNPAIRED) !== binding)
        return false;
      if (!term) return true;
      const branchName =
        device.branch?.name ??
        branches.find((branch) => branch.id === device.branchId)?.name;
      return [
        device.name,
        branchName,
        device.status,
        bindingLabel(device),
      ].some((value) =>
        String(value ?? '')
          .toLocaleLowerCase()
          .includes(term),
      );
    });
  }, [binding, branches, devices, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const branchName = (device: DeviceRecord) =>
    device.branch?.name ??
    branches.find((branch) => branch.id === device.branchId)?.name ??
    'Not available';

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Devices"
        description="Find POS devices, check their binding status, and open a profile to manage one."
      />
      <section
        className={styles.directory}
        aria-label="Device directory"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <div className={styles.search} role="search">
            <Search aria-hidden="true" size={16} />
            <Input
              type="search"
              aria-label="Search devices"
              placeholder="Device or branch name"
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
              aria-label="Filter devices by status"
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
          <div className={styles.filter}>
            <span>Binding</span>
            <Select
              aria-label="Filter devices by binding"
              value={binding}
              onChange={(event) => {
                setBinding(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All binding states' },
                { value: 'UNPAIRED', label: 'Unpaired' },
                { value: 'DEVICE_TOKEN', label: 'Device token' },
                { value: 'WEBAUTHN', label: 'WebAuthn' },
                { value: 'HMAC_LEGACY', label: 'Legacy HMAC' },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
            loading={loading}
          >
            Refresh
          </Button>
          <Link
            className="sc-button sc-button--primary sc-button--standard"
            href="/admin/devices/new"
          >
            Register device
          </Link>
        </div>
        {failed ? (
          <div className={styles.errorState} role="alert">
            <p>
              Devices could not be loaded. Retry to check the authorized device
              list.
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
        {loading && devices.length === 0 ? (
          <div className={styles.skeleton} aria-label="Loading devices">
            {[0, 1, 2].map((row) => (
              <span key={row} />
            ))}
          </div>
        ) : null}
        {!loading && !failed && devices.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No devices are registered yet. Register a device to add a POS
            terminal.
          </p>
        ) : null}
        {!loading && !failed && devices.length > 0 && filtered.length === 0 ? (
          <p className={styles.statusMessage} role="status">
            No devices match this search and filter.
          </p>
        ) : null}
        {!failed && visible.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="sr-only">
                  Tenant devices. Five devices are shown per page.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Status</th>
                    <th scope="col">Binding</th>
                    <th scope="col">Last seen</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((device) => {
                    const name = device.name || 'Unnamed device';
                    const id = String(device.id);
                    return (
                      <tr key={id}>
                        <td data-label="Device">
                          <strong>{name}</strong>
                        </td>
                        <td data-label="Branch">{branchName(device)}</td>
                        <td data-label="Status">
                          <StatusBadge
                            label={device.status ?? 'Unknown'}
                            tone={
                              device.status === 'ACTIVE'
                                ? 'success'
                                : device.status === 'INACTIVE'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          />
                        </td>
                        <td data-label="Binding">
                          <StatusBadge
                            label={bindingLabel(device)}
                            tone={
                              device.authBindingMode === UNPAIRED
                                ? 'warning'
                                : 'info'
                            }
                          />
                        </td>
                        <td data-label="Last seen">
                          {displayDate(device.lastSeenAt)}
                        </td>
                        <td data-label="Action">
                          <Link
                            className={styles.profileLink}
                            href={`/admin/devices/${encodeURIComponent(id)}`}
                            aria-label={`View device ${name}`}
                          >
                            View device
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
              {filtered.length} matching devices.
            </p>
            <nav
              className={styles.pagination}
              aria-label="Device results pagination"
            >
              <button
                type="button"
                className={styles.paginationButton}
                aria-label="Previous device page"
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
                aria-label="Next device page"
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
        <Alert tone="info" title="Unpaired devices cannot sign in">
          Newly registered devices remain non-operational until safely paired on
          the authorized target POS browser.
        </Alert>
      </section>
    </section>
  );
}

export function AdminDeviceRegistration() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    'Choose a branch and enter a device name.',
  );
  const [idempotencyIdentity, setIdempotencyIdentity] = useState({
    fingerprint: '',
    key: '',
  });

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await branchesControllerListBranchesV1(
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error('Branch list unavailable');
      const records = responseData<BranchRecord[]>(response);
      if (!Array.isArray(records)) throw new Error('Invalid branch response');
      setBranches(records);
      setBranchId((current) =>
        records.some((branch) => branch.id === current)
          ? current
          : (records[0]?.id ?? ''),
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBranches();
  }, [refreshBranches]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branches.some((branch) => branch.id === branchId)) {
      setMessage('Choose a branch from your authorized branch list.');
      return;
    }
    const payload = { branchId, name: name.trim() };
    if (!payload.name) {
      setMessage('Enter a device name.');
      return;
    }
    const fingerprint = JSON.stringify(payload);
    const idempotencyKey =
      idempotencyIdentity.fingerprint === fingerprint && idempotencyIdentity.key
        ? idempotencyIdentity.key
        : crypto.randomUUID();
    setIdempotencyIdentity({ fingerprint, key: idempotencyKey });
    setSubmitting(true);
    setMessage('Registering device…');
    let status: number | undefined;
    try {
      const response = await branchesControllerCreateDeviceV1(
        payload,
        createApiRequest({ csrf: true, idempotencyKey }),
      );
      status = response.status;
      if (response.status === 201) {
        const created = responseData<{ id?: string }>(response);
        if (typeof created?.id === 'string' && created.id.trim()) {
          router.push(
            `/admin/devices/${encodeURIComponent(created.id.trim())}`,
          );
          return;
        }
        await refreshBranches();
        setMessage(
          'The server confirmed registration but returned no device ID. Refresh the device directory before trying again.',
        );
        return;
      }
      setMessage(
        status >= 500
          ? 'The device could not be confirmed. The same idempotency key will be reused if you safely retry after checking the device directory.'
          : `Device registration was not confirmed (HTTP ${status}).`,
      );
    } catch {
      await refreshBranches();
      setMessage(
        'The result could not be confirmed. The same idempotency key will be reused if you retry; check the device directory first.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header admin-device-branch-page-header"
        title="Register device"
        description="Add a POS device to an authorized branch. It will need to be paired on its target browser before sign-in."
        actions={
          <Link className={styles.inlineLink} href="/admin/devices">
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back to devices</span>
          </Link>
        }
      />
      <section
        className={styles.formCard}
        aria-labelledby="device-registration-title"
      >
        <h2 id="device-registration-title">Device details</h2>
        <p>
          New devices are created unpaired and cannot process cashier sign-ins
          until securely paired.
        </p>
        {failed ? (
          <div role="alert" className={styles.errorState}>
            <p>Authorized branches could not be loaded.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshBranches()}
              disabled={loading}
            >
              Retry branch list
            </Button>
          </div>
        ) : null}
        {!failed && branches.length === 0 && !loading ? (
          <Alert tone="warning" title="No branches available">
            Create or restore an authorized branch before registering a device.
          </Alert>
        ) : null}
        <form
          className={styles.registrationForm}
          onSubmit={(event) => void submit(event)}
        >
          <label
            className={styles.formField}
            htmlFor="device-registration-branch"
          >
            Branch
            <Select
              id="device-registration-branch"
              required
              disabled={
                loading || failed || submitting || branches.length === 0
              }
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              options={[
                { value: '', label: 'Choose a branch' },
                ...branches
                  .filter((branch): branch is BranchRecord & { id: string } =>
                    Boolean(branch.id),
                  )
                  .map((branch) => ({
                    value: branch.id,
                    label: branch.name ?? branch.id,
                  })),
              ]}
            />
          </label>
          <label
            className={styles.formField}
            htmlFor="device-registration-name"
          >
            Device name
            <Input
              id="device-registration-name"
              required
              maxLength={100}
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className={styles.formActions}>
            <Button
              type="submit"
              loading={submitting}
              disabled={
                loading ||
                failed ||
                submitting ||
                !branchId ||
                branches.length === 0
              }
            >
              Register device
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
