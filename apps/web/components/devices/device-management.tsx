'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  branchesControllerPairDeviceTokenV1,
  branchesControllerResetDeviceTokenV1,
  branchesControllerCompleteDeviceEnrollmentV1,
  branchesControllerCreateDeviceEnrollmentV1,
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerRevokeDeviceCredentialV1,
  branchesControllerUpdateDeviceV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { getCurrentSession } from '../../lib/api/session';
import {
  serializeCredential,
  toCredentialCreationOptions,
} from '../../lib/webauthn-json';
import { Alert, Button, Dialog, Input, Select, Table } from '../ui';
import { CashierPageHeader, ShopCityCard } from '../shopcity';
import { StatusBadge } from '../shopcity/status-badge';

type DeviceCredential = {
  id: string;
  status?: string;
  pairedAt?: string | null;
  revokedAt?: string | null;
  authenticatorAttachment?: string | null;
  backupEligible?: boolean;
  transports?: string[];
};

type DeviceTokenCredential = {
  id: string;
  status?: string;
  pairedAt?: string | null;
  lastUsedAt?: string | null;
  keyVersion?: number;
};

type Device = {
  id: string;
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  branchId?: string;
  branch?: { name?: string };
  authBindingMode?:
    'UNPAIRED' | 'HMAC_LEGACY' | 'WEBAUTHN' | 'DEVICE_TOKEN' | string;
  pairedAt?: string | null;
  webAuthnCredentials?: DeviceCredential[];
  deviceTokenCredentials?: DeviceTokenCredential[];
};

type Branch = { id: string; name?: string };
type PairingFeedback = {
  tone: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  retryable: boolean;
};
type Props = { supervisor?: boolean };

const PAIRED_DEVICE_LOCATOR_KEY = 'shopcity:paired-device-id';
const RFC_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

type PendingIdempotencyKey = {
  fingerprint: string;
  key: string;
  expiresAt: number;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function responseData(value: unknown): Record<string, unknown> {
  const outer = record(value);
  return record(outer.data);
}

function DeviceSelector({
  devices,
  selectedId,
  onSelect,
  disabled = false,
}: Readonly<{
  devices: Device[];
  selectedId: string;
  onSelect: (deviceId: string) => void;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(
    0,
    devices.findIndex((device) => device.id === selectedId),
  );
  const selectedDevice = devices[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  if (!selectedDevice) return null;

  function handleOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % devices.length;
    if (event.key === 'ArrowUp')
      nextIndex = (index - 1 + devices.length) % devices.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = devices.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={rootRef} className="device-management__selector-dropdown">
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        className="device-management__selector-trigger"
        aria-label={`Device: ${selectedDevice.name ?? selectedDevice.id}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <span className="device-management__selector-value">
          {selectedDevice.name ?? selectedDevice.id}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </Button>
      {open ? (
        <div
          id={listboxId}
          className="device-management__selector-menu"
          role="listbox"
          aria-label="Device options"
        >
          {devices.map((device, index) => (
            <button
              key={device.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={device.id === selectedId}
              tabIndex={activeIndex === index ? 0 : -1}
              className="device-management__selector-option"
              disabled={disabled}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onSelect(device.id);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{device.name ?? device.id}</span>
              {device.id === selectedId ? (
                <Check aria-hidden="true" size={16} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DeviceManagement({ supervisor = false }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const selectedIdRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [dataFresh, setDataFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading device management…');
  const [pairingConfirmationFor, setPairingConfirmationFor] = useState('');
  const [pairingMethod, setPairingMethod] = useState<
    'DEVICE_TOKEN' | 'WEBAUTHN'
  >('DEVICE_TOKEN');
  const [targetBrowserConfirmed, setTargetBrowserConfirmed] = useState(false);
  const [pairingFeedback, setPairingFeedback] =
    useState<PairingFeedback | null>(null);
  const [deviceLocatorConfirmationFor, setDeviceLocatorConfirmationFor] =
    useState('');
  const [deviceLocatorBrowserConfirmed, setDeviceLocatorBrowserConfirmed] =
    useState(false);
  const refreshSequenceRef = useRef(0);
  const mutationIdempotencyKeysRef = useRef(
    new Map<string, PendingIdempotencyKey>(),
  );
  const [oneTimeHmacSecret, setOneTimeHmacSecret] = useState<string | null>(
    null,
  );

  const selected = devices.find((device) => device.id === selectedId);
  const credentials = selected?.webAuthnCredentials ?? [];
  const tokenCredentials = selected?.deviceTokenCredentials ?? [];
  const activeTokenCredential = tokenCredentials.find(
    (credential) => credential.status === 'ACTIVE',
  );

  function mutationIdempotencyKey(
    operation: string,
    payload: Record<string, unknown>,
  ) {
    const fingerprint = JSON.stringify(payload);
    const pending = mutationIdempotencyKeysRef.current.get(operation);
    if (
      pending?.fingerprint === fingerprint &&
      pending.expiresAt > Date.now()
    ) {
      return pending.key;
    }

    const key = crypto.randomUUID();
    mutationIdempotencyKeysRef.current.set(operation, {
      fingerprint,
      key,
      expiresAt: Date.now() + IDEMPOTENCY_RETRY_WINDOW_MS,
    });
    return key;
  }

  function completeMutationIdempotency(operation: string, key: string) {
    if (mutationIdempotencyKeysRef.current.get(operation)?.key === key) {
      mutationIdempotencyKeysRef.current.delete(operation);
    }
  }

  const refresh = useCallback(async () => {
    const requestSequence = ++refreshSequenceRef.current;
    setLoading(true);
    setDataFresh(false);
    try {
      if (supervisor) {
        const session = await getCurrentSession();
        if (requestSequence !== refreshSequenceRef.current) return;
        const ownBranchId = session.user.branchId ?? '';
        if (session.user.role !== 'SUPERVISOR' || !ownBranchId) {
          throw new Error('Supervisor branch context unavailable');
        }
        setBranchId(ownBranchId);
      } else {
        const branchesResponse = await branchesControllerListBranchesV1(
          createApiRequest({ csrf: true }),
        );
        if (requestSequence !== refreshSequenceRef.current) return;
        if (branchesResponse.status !== 200) {
          throw new Error('Branch list unavailable');
        }
        const nextBranches = branchesResponse.data.data as Branch[];
        setBranches(nextBranches);
        setBranchId((current) => current || nextBranches[0]?.id || '');
      }

      const response = await branchesControllerListDevicesV1(
        createApiRequest({ csrf: true }),
      );
      if (requestSequence !== refreshSequenceRef.current) return;
      if (response.status !== 200) throw new Error('Device list unavailable');
      const nextDevices = response.data.data as Device[];
      setDevices(nextDevices);
      const nextSelectedId = nextDevices.some(
        (device) => device.id === selectedIdRef.current,
      )
        ? selectedIdRef.current
        : (nextDevices[0]?.id ?? '');
      selectedIdRef.current = nextSelectedId;
      setSelectedId(nextSelectedId);
      setDataFresh(true);
      setMessage('Device data loaded.');
    } catch {
      if (requestSequence === refreshSequenceRef.current) {
        setMessage(
          'Device management is unavailable in this account or branch. Check your permissions and refresh to retry.',
        );
      }
    } finally {
      if (requestSequence === refreshSequenceRef.current) setLoading(false);
    }
  }, [supervisor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setOneTimeHmacSecret(null);
    setDeviceLocatorConfirmationFor('');
    setDeviceLocatorBrowserConfirmed(false);
  }, [selectedId]);

  async function createDevice() {
    if (!dataFresh) {
      setMessage('Refresh device data successfully before making changes.');
      return;
    }
    if (!branchId || !name.trim()) {
      setMessage('Choose a branch and enter a device name.');
      return;
    }
    if (!RFC_UUID_PATTERN.test(branchId)) {
      setMessage(
        'Device creation could not be completed: the assigned branch identifier is invalid.',
      );
      return;
    }

    const payload = { branchId, name: name.trim() };
    const idempotencyKey = mutationIdempotencyKey('devices.create', payload);
    let responseStatus: number | undefined;
    setDataFresh(false);
    setBusy(true);
    try {
      const response = await branchesControllerCreateDeviceV1(
        payload,
        createApiRequest({ csrf: true, idempotencyKey }),
      );
      responseStatus = response.status;
      if (response.status !== 201) throw new Error('Create unavailable');
      completeMutationIdempotency('devices.create', idempotencyKey);
      setName('');
      setMessage(
        'Unpaired device created. It remains non-operational until pairing succeeds.',
      );
      await refresh();
    } catch {
      setMessage(
        responseStatus !== undefined && responseStatus >= 500
          ? "Device creation could not be completed because the server's device security schema may not support unpaired devices yet. Contact an administrator."
          : 'Device creation could not be completed. Check the assigned branch and your permissions, then retry.',
      );
    } finally {
      setBusy(false);
    }
  }

  function requestPairingConfirmation(
    method: 'DEVICE_TOKEN' | 'WEBAUTHN' = 'DEVICE_TOKEN',
  ) {
    if (!selected?.id || !dataFresh || busy || loading) return;
    setTargetBrowserConfirmed(false);
    setPairingFeedback(null);
    setPairingMethod(method);
    setPairingConfirmationFor(selected.id);
  }

  function cancelPairing() {
    setPairingConfirmationFor('');
    setTargetBrowserConfirmed(false);
    setPairingFeedback(null);
  }

  function requestDeviceLocatorConfirmation() {
    if (
      !dataFresh ||
      busy ||
      loading ||
      !selected?.id ||
      selected.status !== 'ACTIVE' ||
      selected.authBindingMode !== 'WEBAUTHN' ||
      !credentials.some((credential) => credential.status === 'ACTIVE')
    ) {
      return;
    }
    setDeviceLocatorBrowserConfirmed(false);
    setDeviceLocatorConfirmationFor(selected.id);
  }

  function cancelDeviceLocatorConfirmation() {
    setDeviceLocatorConfirmationFor('');
    setDeviceLocatorBrowserConfirmed(false);
  }

  function useExistingCredentialOnThisBrowser() {
    if (
      !dataFresh ||
      busy ||
      loading ||
      !selected?.id ||
      selected.status !== 'ACTIVE' ||
      deviceLocatorConfirmationFor !== selected.id ||
      !credentials.some((credential) => credential.status === 'ACTIVE')
    ) {
      return;
    }
    if (!deviceLocatorBrowserConfirmed) {
      setMessage('Confirm that this is the qualified target POS browser.');
      return;
    }

    try {
      window.localStorage.setItem(PAIRED_DEVICE_LOCATOR_KEY, selected.id);
      setMessage(
        'This browser is linked to the selected POS. Cashier sign-in still requires its active WebAuthn credential.',
      );
      cancelDeviceLocatorConfirmation();
    } catch {
      setMessage(
        'This browser could not save the device locator. Ask an administrator to configure this POS browser.',
      );
    }
  }

  async function pairDevice() {
    const targetDeviceId = pairingConfirmationFor;
    if (
      !dataFresh ||
      !targetDeviceId ||
      selectedIdRef.current !== targetDeviceId ||
      !devices.some((device) => device.id === targetDeviceId)
    ) {
      return;
    }
    setPairingFeedback(null);
    if (!targetBrowserConfirmed) {
      setPairingFeedback({
        tone: 'warning',
        title: 'Confirmation required',
        message:
          'Confirm that this is the authorized target POS browser before pairing.',
        retryable: true,
      });
      return;
    }

    setDataFresh(false);
    setBusy(true);
    try {
      if (pairingMethod === 'WEBAUTHN') {
        if (!navigator.credentials?.create) {
          throw new Error('WebAuthn is not supported by this browser');
        }
        const authorization = await branchesControllerCreateDeviceEnrollmentV1(
          targetDeviceId,
          createApiRequest({ csrf: true }),
        );
        if (authorization.status !== 201)
          throw new Error('Pairing unavailable');
        const payload = responseData(authorization.data);
        const token = payload.authorizationToken;
        const options = (payload.options ?? payload.registrationOptions) as
          Record<string, unknown> | undefined;
        if (typeof token !== 'string' || !options) {
          throw new Error('Invalid pairing response');
        }
        const credential = await navigator.credentials.create({
          publicKey: toCredentialCreationOptions(options),
        });
        if (!credential) throw new Error('Registration cancelled');
        const completion = await branchesControllerCompleteDeviceEnrollmentV1(
          targetDeviceId,
          {
            authorizationToken: token,
            response: serializeCredential(credential as PublicKeyCredential),
          },
          createApiRequest(),
        );
        if (completion.status !== 200)
          throw new Error('Pairing completion failed');
        if (selectedIdRef.current === targetDeviceId) {
          window.localStorage.setItem(
            PAIRED_DEVICE_LOCATOR_KEY,
            targetDeviceId,
          );
        }
        setPairingFeedback({
          tone: 'success',
          title: 'WebAuthn pairing complete',
          message:
            'The existing WebAuthn device-binding flow completed on this target browser.',
          retryable: false,
        });
        await refresh();
        return;
      }

      const paired = await branchesControllerPairDeviceTokenV1(
        targetDeviceId,
        createApiRequest({ csrf: true }),
      );
      if (paired.status !== 200) throw new Error('Pairing failed');
      try {
        if (selectedIdRef.current === targetDeviceId) {
          window.localStorage.setItem(
            PAIRED_DEVICE_LOCATOR_KEY,
            targetDeviceId,
          );
        }
      } catch {
        setPairingFeedback({
          tone: 'warning',
          title: 'Pairing completed; device locator unavailable',
          message:
            'The HttpOnly credential was issued, but this browser could not save the non-secret device ID needed at login. Ask an administrator to configure this POS browser before cashier sign-in.',
          retryable: false,
        });
        await refresh();
        return;
      }
      setPairingFeedback({
        tone: 'success',
        title: 'POS browser paired',
        message:
          'This target browser now has its HttpOnly device credential. The server binds cashier sessions to the selected ShopCity device.',
        retryable: false,
      });
      await refresh();
    } catch {
      await refresh();
      setPairingFeedback({
        tone: 'danger',
        title: 'Pairing failed',
        message:
          'Pairing failed. Confirm the authorized account, active device and branch, then verify the device list before retrying from the target POS browser.',
        retryable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetDeviceToken() {
    if (!dataFresh || !selected?.id) return;
    const targetDeviceId = selected.id;
    if (
      !window.confirm(
        'Reset this POS browser credential? All device sessions will be invalidated.',
      )
    ) {
      return;
    }
    setDataFresh(false);
    setBusy(true);
    try {
      const reset = await branchesControllerResetDeviceTokenV1(
        targetDeviceId,
        createApiRequest({ csrf: true }),
      );
      if (reset.status !== 200) throw new Error('Reset failed');
      try {
        if (
          window.localStorage.getItem(PAIRED_DEVICE_LOCATOR_KEY) ===
          targetDeviceId
        ) {
          window.localStorage.removeItem(PAIRED_DEVICE_LOCATOR_KEY);
        }
      } catch {
        // Server-side revocation remains authoritative if storage is unavailable.
      }
      setMessage(
        'Device credential reset; all device sessions were invalidated.',
      );
      await refresh();
    } catch {
      setMessage(
        'Device credential could not be reset. Refresh the device list before retrying.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function revokeCredential(credential: DeviceCredential) {
    if (!dataFresh || !selected?.id || credential.status !== 'ACTIVE') return;
    if (
      !window.confirm(
        'Revoke this credential? Cashier sessions bound to it will be invalidated. The credential cannot be recovered; the POS must be paired again.',
      )
    ) {
      return;
    }

    setDataFresh(false);
    setBusy(true);
    try {
      const response = await branchesControllerRevokeDeviceCredentialV1(
        selected.id,
        credential.id,
        createApiRequest({ csrf: true }),
      );
      if (response.status !== 200) throw new Error('Credential unavailable');
      setMessage(
        'Credential revoked and its bound cashier sessions invalidated.',
      );
      await refresh();
    } catch {
      setMessage(
        'Credential is unavailable in this branch or could not be revoked. Check permissions and retry.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateDevice(
    status?: 'ACTIVE' | 'INACTIVE',
    rotateAttestationSecret = false,
  ) {
    if (!dataFresh || !selected) return;
    const targetDeviceId = selected.id;
    if (
      status === 'INACTIVE' &&
      !window.confirm(
        'Deactivate this device? All cashier sessions on it will be invalidated.',
      )
    ) {
      return;
    }

    const payload = {
      name: selected.name ?? '',
      status: (status ?? selected.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      rotateAttestationSecret,
    };
    const operation = `devices.update:${targetDeviceId}`;
    const idempotencyKey = mutationIdempotencyKey(operation, payload);
    let responseStatus: number | undefined;
    setDataFresh(false);
    setBusy(true);
    try {
      const response = await branchesControllerUpdateDeviceV1(
        targetDeviceId,
        payload,
        createApiRequest({ csrf: true, idempotencyKey }),
      );
      responseStatus = response.status;
      if (response.status !== 200) throw new Error('Update unavailable');
      completeMutationIdempotency(operation, idempotencyKey);
      const data = responseData(response.data);
      const secret = data.attestationSecret;
      setOneTimeHmacSecret(
        rotateAttestationSecret && typeof secret === 'string' ? secret : null,
      );
      if (status === 'INACTIVE') {
        try {
          if (
            window.localStorage.getItem(PAIRED_DEVICE_LOCATOR_KEY) ===
            targetDeviceId
          ) {
            window.localStorage.removeItem(PAIRED_DEVICE_LOCATOR_KEY);
          }
        } catch {
          // Server-side device inactivation remains authoritative.
        }
      }
      setMessage(
        rotateAttestationSecret
          ? typeof secret === 'string'
            ? 'Legacy HMAC secret rotated. It is shown once below; deliver it only through the approved secure provisioning process.'
            : 'Legacy HMAC rotation completed without a secret in the response.'
          : status === 'INACTIVE'
            ? 'Device deactivated; cashier sessions are invalidated.'
            : 'Device updated.',
      );
      await refresh();
    } catch {
      setMessage(
        responseStatus !== undefined && responseStatus >= 500
          ? "Device state could not be changed. The server's device security schema may be incompatible with this device state. Contact an administrator."
          : 'Device update failed. Check permissions and retry.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="supervisor-page sc-page device-management-page"
      aria-labelledby="device-management-title"
    >
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header device-management__header"
        title={<span id="device-management-title">Devices</span>}
        description={
          <>
            Manage device binding and WebAuthn pairing
            {supervisor ? ' for your assigned branch' : ''}.
          </>
        }
      />

      <p
        className="cashier-workflow-notice supervisor-transaction-status device-management__status"
        role="status"
        aria-live="polite"
      >
        {loading ? 'Loading… ' : ''}
        {message}
      </p>
      <div className="device-management__workspace">
        <ShopCityCard
          as="section"
          variant="table"
          className="device-management__panel device-management__create-panel"
          aria-label="Create device"
        >
          <h2>Create unpaired device</h2>
          <div className="device-management__create-form">
            {supervisor ? null : (
              <label
                className="device-management__field"
                htmlFor="device-management-branch"
              >
                <span>Branch</span>
                <Select
                  id="device-management-branch"
                  aria-label="Branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  options={[
                    { value: '', label: 'Select branch' },
                    ...branches.map((branch) => ({
                      value: branch.id,
                      label: branch.name ?? branch.id,
                    })),
                  ]}
                />
              </label>
            )}
            <label
              className="device-management__field"
              htmlFor="device-management-name"
            >
              <span>Device name</span>
              <Input
                id="device-management-name"
                aria-label="Device name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Device name"
              />
            </label>
            <Button
              onClick={() => void createDevice()}
              disabled={busy || loading || !dataFresh || !branchId}
              loading={busy}
            >
              Create device
            </Button>
          </div>
        </ShopCityCard>

        <ShopCityCard
          as="section"
          variant="table"
          className="device-management__panel device-management__list-panel"
          aria-label="Device list"
        >
          <div className="device-management__list-heading">
            <h2>Device list</h2>
            <Button
              variant="secondary"
              aria-label="Refresh devices"
              onClick={() => void refresh()}
              disabled={loading || busy}
              loading={loading}
            >
              Refresh devices
            </Button>
          </div>
          {devices.length === 0 ? (
            <Alert tone="warning" title="No devices">
              No devices are available in this authorized scope.
            </Alert>
          ) : (
            <>
              <div className="device-management__field device-management__selector">
                <span>Device</span>
                <DeviceSelector
                  devices={devices}
                  selectedId={selectedId}
                  disabled={busy || loading || !dataFresh}
                  onSelect={(deviceId) => {
                    if (busy || loading || !dataFresh) return;
                    selectedIdRef.current = deviceId;
                    setSelectedId(deviceId);
                    setPairingConfirmationFor('');
                    setTargetBrowserConfirmed(false);
                    setDeviceLocatorConfirmationFor('');
                    setDeviceLocatorBrowserConfirmed(false);
                  }}
                />
              </div>
              {selected ? (
                <>
                  {selected.status === 'ACTIVE' &&
                  selected.authBindingMode === 'UNPAIRED' ? (
                    <Alert tone="warning" title="Pairing required">
                      Pair this target POS browser before cashier sign-in can
                      use this device.
                    </Alert>
                  ) : null}
                  <Table className="device-management__summary-table">
                    <tbody>
                      <tr>
                        <th scope="row">Branch</th>
                        <td>
                          {selected.branch?.name ?? selected.branchId ?? '—'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Status</th>
                        <td>{selected.status ?? 'Unknown'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Binding mode</th>
                        <td>{selected.authBindingMode ?? 'Unknown'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Paired state</th>
                        <td>
                          {selected.pairedAt
                            ? `Paired ${new Date(selected.pairedAt).toLocaleString()}`
                            : 'Pending / unpaired'}
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  {selected.authBindingMode === 'WEBAUTHN' ? (
                    <section
                      className="device-management__credentials"
                      aria-label="WebAuthn credentials"
                    >
                      <h3>WebAuthn credentials</h3>
                      {selected.status === 'ACTIVE' &&
                      credentials.some(
                        (credential) => credential.status === 'ACTIVE',
                      ) ? (
                        <section
                          className="device-management__locator-flow"
                          aria-label="Link this browser to the existing device"
                        >
                          <p>
                            Select this only on the qualified target POS that
                            holds the active credential. This saves a non-secret
                            device locator; cashier sign-in still requires a
                            valid WebAuthn assertion.
                          </p>
                          <Button
                            variant="secondary"
                            disabled={busy || loading || !dataFresh}
                            onClick={requestDeviceLocatorConfirmation}
                          >
                            Use existing paired device on this browser
                          </Button>
                          {deviceLocatorConfirmationFor === selected.id ? (
                            <fieldset className="device-management__confirmation">
                              <legend>Confirm target POS browser</legend>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={deviceLocatorBrowserConfirmed}
                                  onChange={(event) =>
                                    setDeviceLocatorBrowserConfirmed(
                                      event.target.checked,
                                    )
                                  }
                                />{' '}
                                I confirm this is the qualified target POS for
                                this device and may replace this browser&apos;s
                                current device locator.
                              </label>
                              <Button
                                disabled={
                                  busy ||
                                  loading ||
                                  !dataFresh ||
                                  !deviceLocatorBrowserConfirmed
                                }
                                onClick={useExistingCredentialOnThisBrowser}
                              >
                                Save device locator
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={cancelDeviceLocatorConfirmation}
                              >
                                Cancel
                              </Button>
                            </fieldset>
                          ) : null}
                        </section>
                      ) : null}
                      {credentials.length === 0 ? (
                        <p>
                          No credential is currently listed. Re-pair this POS
                          browser to restore cashier sign-in.
                        </p>
                      ) : (
                        <div className="device-management__credential-scroll">
                          <Table className="device-management__credential-table">
                            <thead>
                              <tr>
                                <th scope="col">Credential</th>
                                <th scope="col">Status</th>
                                <th scope="col">Authenticator</th>
                                <th scope="col">Paired</th>
                                <th scope="col">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {credentials.map((credential, index) => (
                                <tr key={credential.id}>
                                  <td>Credential {index + 1}</td>
                                  <td>
                                    <StatusBadge
                                      label={credential.status ?? 'UNKNOWN'}
                                      tone={
                                        credential.status === 'ACTIVE'
                                          ? 'success'
                                          : 'warning'
                                      }
                                    />
                                  </td>
                                  <td>
                                    {credential.authenticatorAttachment ??
                                      'Not reported'}
                                    {credential.backupEligible
                                      ? ' · backup eligible'
                                      : ''}
                                  </td>
                                  <td>
                                    {credential.pairedAt
                                      ? new Date(
                                          credential.pairedAt,
                                        ).toLocaleString()
                                      : '—'}
                                  </td>
                                  <td>
                                    {credential.status === 'ACTIVE' ? (
                                      <Button
                                        variant="danger"
                                        disabled={busy || loading || !dataFresh}
                                        onClick={() =>
                                          void revokeCredential(credential)
                                        }
                                      >
                                        Revoke credential {index + 1}
                                      </Button>
                                    ) : (
                                      'No action'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </section>
                  ) : null}

                  {selected.authBindingMode === 'DEVICE_TOKEN' ? (
                    <section
                      className="device-management__credentials"
                      aria-label="POS device token credential"
                    >
                      <h3>POS browser credential</h3>
                      {selected.status !== 'ACTIVE' ? (
                        <p>Device inactive; cashier sign-in is unavailable.</p>
                      ) : activeTokenCredential ? (
                        activeTokenCredential.lastUsedAt ? (
                          <p>
                            Last used{' '}
                            {new Date(
                              activeTokenCredential.lastUsedAt,
                            ).toLocaleString()}
                          </p>
                        ) : (
                          <p>
                            Credential is active; no cashier login has used it
                            yet.
                          </p>
                        )
                      ) : (
                        <p>
                          Pairing required. This device has no active browser
                          credential; pair this target POS before cashier
                          sign-in.
                        </p>
                      )}
                      <Button
                        variant="danger"
                        disabled={busy || loading || !dataFresh}
                        onClick={() => void resetDeviceToken()}
                      >
                        Reset browser credential
                      </Button>
                    </section>
                  ) : null}

                  <div className="device-management__actions">
                    <Button
                      onClick={() => requestPairingConfirmation()}
                      disabled={
                        busy ||
                        loading ||
                        !dataFresh ||
                        selected.status !== 'ACTIVE' ||
                        !['UNPAIRED', 'DEVICE_TOKEN'].includes(
                          selected.authBindingMode ?? 'UNPAIRED',
                        )
                      }
                    >
                      {selected.authBindingMode === 'DEVICE_TOKEN' &&
                      activeTokenCredential
                        ? 'Replace browser credential'
                        : 'Pair this target POS browser'}
                    </Button>
                    {['HMAC_LEGACY', 'WEBAUTHN'].includes(
                      selected.authBindingMode ?? '',
                    ) ? (
                      <Button
                        variant="secondary"
                        onClick={() => requestPairingConfirmation('WEBAUTHN')}
                        disabled={
                          busy ||
                          loading ||
                          !dataFresh ||
                          selected.status !== 'ACTIVE'
                        }
                      >
                        {selected.authBindingMode === 'WEBAUTHN'
                          ? 'Rotate WebAuthn credential'
                          : 'Migrate legacy device with WebAuthn'}
                      </Button>
                    ) : null}
                    {selected.status === 'ACTIVE' ? (
                      <Button
                        variant="danger"
                        onClick={() => void updateDevice('INACTIVE')}
                        disabled={busy || loading || !dataFresh}
                      >
                        Deactivate device
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => void updateDevice('ACTIVE')}
                        disabled={busy || loading || !dataFresh}
                      >
                        Reactivate device
                      </Button>
                    )}
                    {selected.authBindingMode === 'HMAC_LEGACY' ? (
                      <Button
                        variant="secondary"
                        onClick={() => void updateDevice(undefined, true)}
                        disabled={busy || loading || !dataFresh}
                      >
                        Rotate legacy HMAC secret
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          )}
        </ShopCityCard>
      </div>

      <Dialog
        open={Boolean(selected && pairingConfirmationFor === selected.id)}
        title="Before pairing this register"
        onClose={busy ? undefined : cancelPairing}
      >
        <div className="device-management__pairing-dialog">
          <p>
            {pairingMethod === 'DEVICE_TOKEN' ? (
              <>
                Pairing creates a random device credential held only in this
                browser&apos;s Secure, HttpOnly cookie. Complete this only on
                the authorized target POS browser for{' '}
                {selected?.name ?? 'the selected device'}. The raw credential is
                never shown or stored in script-readable browser storage.
                Re-pairing immediately invalidates existing device sessions.
              </>
            ) : (
              <>
                WebAuthn enrollment uses the existing platform-authenticator
                flow for {selected?.name ?? 'the selected device'} and retains
                its qualification and verification gates.
              </>
            )}
          </p>
          {pairingFeedback ? (
            <Alert tone={pairingFeedback.tone} title={pairingFeedback.title}>
              {pairingFeedback.message}
            </Alert>
          ) : null}
          {pairingFeedback?.retryable === false ? null : (
            <label>
              <input
                type="checkbox"
                checked={targetBrowserConfirmed}
                onChange={(event) =>
                  setTargetBrowserConfirmed(event.target.checked)
                }
              />{' '}
              I confirm this is the authorized target POS browser for the
              selected device.
            </label>
          )}
          <div className="device-management__pairing-actions">
            {pairingFeedback?.retryable === false ? null : (
              <Button
                onClick={() => void pairDevice()}
                disabled={busy || !dataFresh || !targetBrowserConfirmed}
                loading={busy}
              >
                {pairingFeedback
                  ? 'Retry pairing'
                  : 'Start pairing on this browser'}
              </Button>
            )}
            <Button variant="secondary" onClick={cancelPairing} disabled={busy}>
              {pairingFeedback?.retryable === false ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Dialog>

      {oneTimeHmacSecret ? (
        <ShopCityCard
          as="section"
          variant="table"
          className="device-management__panel device-management__secret-panel"
          aria-label="One-time legacy HMAC secret"
        >
          <h2>One-time legacy HMAC secret</h2>
          <Alert tone="warning" title="Shown once">
            Deliver this secret only through the approved secure provisioning
            process. It is held in this page&apos;s transient state and is not
            stored in browser storage, a URL, or logs. Clear it after secure
            provisioning; this is only for inventoried HMAC legacy devices.
          </Alert>
          <code className="device-management__secret-value">
            {oneTimeHmacSecret}
          </code>
          <Button
            variant="secondary"
            onClick={() => setOneTimeHmacSecret(null)}
          >
            Clear one-time secret
          </Button>
        </ShopCityCard>
      ) : null}
    </section>
  );
}
