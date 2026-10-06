'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Alert, Button, Input, Select, Table } from '../ui';
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
type Props = { supervisor?: boolean };

const PAIRED_DEVICE_LOCATOR_KEY = 'shopcity:paired-device-id';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function responseData(value: unknown): Record<string, unknown> {
  const outer = record(value);
  return record(outer.data);
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
  }, [selectedId]);

  async function createDevice() {
    if (!branchId || !name.trim()) {
      setMessage('Choose a branch and enter a device name.');
      return;
    }

    setBusy(true);
    try {
      const response = await branchesControllerCreateDeviceV1(
        { branchId, name: name.trim() },
        createApiRequest({
          csrf: true,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      if (response.status !== 201) throw new Error('Create unavailable');
      setName('');
      setMessage(
        'Unpaired device created. It remains non-operational until pairing succeeds.',
      );
      await refresh();
    } catch {
      setMessage(
        'Device creation failed. Check the selected branch and retry.',
      );
    } finally {
      setBusy(false);
    }
  }

  function requestPairingConfirmation() {
    if (!selected?.id) return;
    setTargetBrowserConfirmed(false);
    setPairingConfirmationFor(selected.id);
  }

  function cancelPairing() {
    setPairingConfirmationFor('');
    setTargetBrowserConfirmed(false);
  }

  async function pairDevice() {
    if (!selected?.id || pairingConfirmationFor !== selected.id) return;
    if (!targetBrowserConfirmed) {
      setMessage('Confirm that this is the target POS browser before pairing.');
      return;
    }
    if (!navigator.credentials?.create) {
      setMessage(
        'This browser does not support WebAuthn. Open device management on the target POS browser.',
      );
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
        setMessage(
          'Pairing completed, but this browser could not save the non-secret device locator. Ask an Admin to configure the POS browser.',
        );
        cancelPairing();
        await refresh();
        return;
      }

      setMessage(
        'Credential paired on this browser. The browser cannot independently prove physical register identity; follow the approved POS qualification process.',
      );
      cancelPairing();
      await refresh();
    } catch (error) {
      const cancelled =
        error instanceof Error && error.name === 'NotAllowedError';
      setMessage(
        cancelled
          ? 'Registration was cancelled or timed out. Retry on the target POS browser.'
          : 'Pairing failed, expired, or is blocked by the server qualification gate. Retry on the target POS browser or contact an administrator.',
      );
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
      setMessage('Device update failed. Check permissions and retry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header>
        <h1>Devices</h1>
        <p>
          Manage device binding and WebAuthn pairing
          {supervisor ? ' for your assigned branch' : ''}.
        </p>
      </header>

      <p role="status" aria-live="polite">
        {loading ? 'Loading… ' : ''}
        {message}
      </p>
      {supervisor ? (
        <p>
          Device access is limited to the branch assigned to your supervisor
          session. The server applies this scope to every device action.
        </p>
      ) : null}

      <section aria-label="Create device">
        <h2>Create unpaired device</h2>
        {supervisor ? (
          <p>
            Branch is locked to your assigned branch
            {branchId ? ` (${branchId})` : ''}.
          </p>
        ) : (
          <Select
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
        )}
        <Input
          aria-label="Device name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Device name"
        />
        <Button
          onClick={() => void createDevice()}
          disabled={busy || loading || !branchId}
          loading={busy}
        >
          Create device
        </Button>
      </section>

      <section aria-label="Device list">
        <h2>Device list</h2>
        {devices.length === 0 ? (
          <Alert tone="warning" title="No devices">
            No devices are available in this authorized scope.
          </Alert>
        ) : (
          <>
            <Select
              aria-label="Select device"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setPairingConfirmationFor('');
                setTargetBrowserConfirmed(false);
              }}
              options={devices.map((device) => ({
                value: device.id,
                label: device.name ?? device.id,
              }))}
            />
            {selected ? (
              <>
                <Table>
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
                  <section aria-label="WebAuthn credentials">
                    <h3>WebAuthn credentials</h3>
                    {credentials.length === 0 ? (
                      <p>
                        No credential is currently listed. Re-pair this POS
                        browser to restore cashier sign-in.
                      </p>
                    ) : (
                      <Table>
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
                    )}
                  </section>
                ) : null}

                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--sc-spacing-2)',
                    flexWrap: 'wrap',
                  }}
                >
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

                {pairingConfirmationFor === selected.id ? (
                  <fieldset
                    aria-label="Confirm target POS browser"
                    style={{
                      display: 'grid',
                      gap: 'var(--sc-spacing-3)',
                      border:
                        '1px solid var(--sc-color-semantic-borderDefault)',
                      borderRadius: 'var(--sc-radius-md)',
                      padding: 'var(--sc-spacing-3)',
                    }}
                  >
                    <legend>Before pairing this register</legend>
                    <p>
                      Registration creates a credential in this browser&apos;s
                      platform authenticator. Complete this only on the target
                      POS browser for {selected.name ?? 'the selected device'};
                      do not use a separate administrator workstation. This
                      software cannot independently prove physical register
                      identity. Production pairing remains controlled by the
                      server qualification gate.
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={targetBrowserConfirmed}
                        onChange={(event) =>
                          setTargetBrowserConfirmed(event.target.checked)
                        }
                      />{' '}
                      I confirm this is the target POS browser for the selected
                      device.
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--sc-spacing-2)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button
                        onClick={() => void pairDevice()}
                        disabled={busy || !targetBrowserConfirmed}
                        loading={busy}
                      >
                        Start pairing on this browser
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={cancelPairing}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </fieldset>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>

      {oneTimeHmacSecret ? (
        <section aria-label="One-time legacy HMAC secret">
          <h2>One-time legacy HMAC secret</h2>
          <Alert tone="warning" title="Shown once">
            Deliver this secret only through the approved secure provisioning
            process. It is held in this page&apos;s transient state and is not
            stored in browser storage, a URL, or logs. Clear it after secure
            provisioning; this is only for inventoried HMAC legacy devices.
          </Alert>
          <code
            style={{
              display: 'block',
              overflowWrap: 'anywhere',
              padding: 'var(--sc-spacing-3)',
              border: '1px solid var(--sc-color-semantic-borderDefault)',
              borderRadius: 'var(--sc-radius-md)',
            }}
          >
            {oneTimeHmacSecret}
          </code>
          <Button
            variant="secondary"
            onClick={() => setOneTimeHmacSecret(null)}
          >
            Clear one-time secret
          </Button>
        </section>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => void refresh()}
        disabled={loading || busy}
      >
        Refresh devices
      </Button>
    </section>
  );
}
