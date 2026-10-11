'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
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

type Device = {
  id: string;
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  branchId?: string;
  branch?: { name?: string };
  authBindingMode?: 'UNPAIRED' | 'HMAC_LEGACY' | 'WEBAUTHN' | string;
  pairedAt?: string | null;
  webAuthnCredentials?: DeviceCredential[];
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
}: Readonly<{
  devices: Device[];
  selectedId: string;
  onSelect: (deviceId: string) => void;
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading device management…');
  const [pairingConfirmationFor, setPairingConfirmationFor] = useState('');
  const [targetBrowserConfirmed, setTargetBrowserConfirmed] = useState(false);
  const [pairingFeedback, setPairingFeedback] =
    useState<PairingFeedback | null>(null);
  const [deviceLocatorConfirmationFor, setDeviceLocatorConfirmationFor] =
    useState('');
  const [deviceLocatorBrowserConfirmed, setDeviceLocatorBrowserConfirmed] =
    useState(false);
  const [oneTimeHmacSecret, setOneTimeHmacSecret] = useState<string | null>(
    null,
  );

  const selected = devices.find((device) => device.id === selectedId);
  const credentials = selected?.webAuthnCredentials ?? [];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (supervisor) {
        const session = await getCurrentSession();
        const ownBranchId = session.user.branchId ?? '';
        if (session.user.role !== 'SUPERVISOR' || !ownBranchId) {
          throw new Error('Supervisor branch context unavailable');
        }
        setBranchId(ownBranchId);
      } else {
        const branchesResponse = await branchesControllerListBranchesV1(
          createApiRequest({ csrf: true }),
        );
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
      if (response.status !== 200) throw new Error('Device list unavailable');
      const nextDevices = response.data.data as Device[];
      setDevices(nextDevices);
      setSelectedId((current) =>
        nextDevices.some((device) => device.id === current)
          ? current
          : (nextDevices[0]?.id ?? ''),
      );
      setMessage('Device data loaded.');
    } catch {
      setMessage(
        'Device management is unavailable in this account or branch. Check your permissions and retry.',
      );
    } finally {
      setLoading(false);
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

    let responseStatus: number | undefined;
    setBusy(true);
    try {
      const response = await branchesControllerCreateDeviceV1(
        { branchId, name: name.trim() },
        createApiRequest({
          csrf: true,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      responseStatus = response.status;
      if (response.status !== 201) throw new Error('Create unavailable');
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

  function requestPairingConfirmation() {
    if (!selected?.id) return;
    setTargetBrowserConfirmed(false);
    setPairingFeedback(null);
    setPairingConfirmationFor(selected.id);
  }

  function cancelPairing() {
    setPairingConfirmationFor('');
    setTargetBrowserConfirmed(false);
    setPairingFeedback(null);
  }

  function requestDeviceLocatorConfirmation() {
    if (
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
    if (!selected?.id || pairingConfirmationFor !== selected.id) return;
    setPairingFeedback(null);
    if (!targetBrowserConfirmed) {
      setPairingFeedback({
        tone: 'warning',
        title: 'Confirmation required',
        message: 'Confirm that this is the target POS browser before pairing.',
        retryable: true,
      });
      return;
    }
    if (!navigator.credentials?.create) {
      setPairingFeedback({
        tone: 'danger',
        title: 'Browser not supported',
        message:
          'This browser does not support WebAuthn. Open device management on the target POS browser.',
        retryable: true,
      });
      return;
    }

    setBusy(true);
    try {
      const authorization = await branchesControllerCreateDeviceEnrollmentV1(
        selected.id,
        createApiRequest({ csrf: true }),
      );
      if (authorization.status !== 201) {
        throw new Error('Pairing authorization unavailable');
      }
      const payload = responseData(authorization.data);
      const token = payload.authorizationToken;
      const options = (payload.options ?? payload.registrationOptions) as
        Record<string, unknown> | undefined;
      if (typeof token !== 'string' || !options) {
        throw new Error('Invalid pairing response');
      }

      // The single-use authorization stays in this call's memory and is sent only
      // in the completion POST body. It is never placed in state, storage, or URL.
      const credential = await navigator.credentials.create({
        publicKey: toCredentialCreationOptions(options),
      });
      if (!credential) throw new Error('Registration cancelled');

      const completion = await branchesControllerCompleteDeviceEnrollmentV1(
        selected.id,
        {
          authorizationToken: token,
          response: serializeCredential(credential as PublicKeyCredential),
        },
        createApiRequest(),
      );
      if (completion.status !== 200)
        throw new Error('Pairing completion failed');

      try {
        // This is a non-secret device locator only; WebAuthn remains the proof.
        window.localStorage.setItem(PAIRED_DEVICE_LOCATOR_KEY, selected.id);
      } catch {
        setPairingFeedback({
          tone: 'warning',
          title: 'Pairing completed, browser setup incomplete',
          message:
            'The credential was paired, but this browser could not save its non-secret device locator. Ask an Admin to configure the POS browser.',
          retryable: false,
        });
        await refresh();
        return;
      }

      setPairingFeedback({
        tone: 'success',
        title: 'Pairing complete',
        message:
          'Credential paired on this browser. The browser cannot independently prove physical register identity; follow the approved POS qualification process.',
        retryable: false,
      });
      await refresh();
    } catch (error) {
      const cancelled =
        error instanceof Error && error.name === 'NotAllowedError';
      setPairingFeedback({
        tone: 'danger',
        title: cancelled
          ? 'Registration cancelled or timed out'
          : 'Pairing failed',
        message: cancelled
          ? 'Retry on the target POS browser.'
          : 'Pairing failed, expired, or is blocked by the server qualification gate. Retry on the target POS browser or contact an administrator.',
        retryable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function revokeCredential(credential: DeviceCredential) {
    if (!selected?.id || credential.status !== 'ACTIVE') return;
    if (
      !window.confirm(
        'Revoke this credential? Cashier sessions bound to it will be invalidated. The credential cannot be recovered; the POS must be paired again.',
      )
    ) {
      return;
    }

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
    if (!selected) return;
    if (
      status === 'INACTIVE' &&
      !window.confirm(
        'Deactivate this device? All cashier sessions on it will be invalidated.',
      )
    ) {
      return;
    }

    let responseStatus: number | undefined;
    setBusy(true);
    try {
      const response = await branchesControllerUpdateDeviceV1(
        selected.id,
        {
          name: selected.name ?? '',
          status: (status ?? selected.status ?? 'ACTIVE') as
            'ACTIVE' | 'INACTIVE',
          rotateAttestationSecret,
        },
        createApiRequest({
          csrf: true,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      responseStatus = response.status;
      if (response.status !== 200) throw new Error('Update unavailable');
      const data = responseData(response.data);
      const secret = data.attestationSecret;
      setOneTimeHmacSecret(
        rotateAttestationSecret && typeof secret === 'string' ? secret : null,
      );
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
              disabled={busy || loading || !branchId}
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
          <h2>Device list</h2>
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
                  onSelect={(deviceId) => {
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
                            disabled={busy || loading}
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
                                        disabled={busy}
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

                  <div className="device-management__actions">
                    <Button
                      onClick={requestPairingConfirmation}
                      disabled={busy || loading || selected.status !== 'ACTIVE'}
                    >
                      {selected.pairedAt
                        ? 'Replace credential / re-pair'
                        : 'Pair on target POS browser'}
                    </Button>
                    {selected.status === 'ACTIVE' ? (
                      <Button
                        variant="danger"
                        onClick={() => void updateDevice('INACTIVE')}
                        disabled={busy}
                      >
                        Deactivate device
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => void updateDevice('ACTIVE')}
                        disabled={busy}
                      >
                        Reactivate device
                      </Button>
                    )}
                    {selected.authBindingMode === 'HMAC_LEGACY' ? (
                      <Button
                        variant="secondary"
                        onClick={() => void updateDevice(undefined, true)}
                        disabled={busy}
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
            Registration creates a credential in this browser&apos;s platform
            authenticator. Complete this only on the target POS browser for{' '}
            {selected?.name ?? 'the selected device'}; do not use a separate
            administrator workstation. This software cannot independently prove
            physical register identity. Production pairing remains controlled by
            the server qualification gate.
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
              I confirm this is the target POS browser for the selected device.
            </label>
          )}
          <div className="device-management__pairing-actions">
            {pairingFeedback?.retryable === false ? null : (
              <Button
                onClick={() => void pairDevice()}
                disabled={busy || !targetBrowserConfirmed}
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
