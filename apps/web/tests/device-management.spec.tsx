import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeviceManagement } from '../components/devices/device-management';
import {
  branchesControllerCompleteDeviceEnrollmentV1,
  branchesControllerCreateDeviceEnrollmentV1,
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerPairDeviceTokenV1,
  branchesControllerResetDeviceTokenV1,
  branchesControllerRevokeDeviceCredentialV1,
  branchesControllerUpdateDeviceV1,
} from '../lib/api/generated-client';
import { getCurrentSession } from '../lib/api/session';

jest.mock('../lib/api/generated-client', () => ({
  branchesControllerCompleteDeviceEnrollmentV1: jest.fn(),
  branchesControllerCreateDeviceEnrollmentV1: jest.fn(),
  branchesControllerCreateDeviceV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  branchesControllerListDevicesV1: jest.fn(),
  branchesControllerPairDeviceTokenV1: jest.fn(),
  branchesControllerResetDeviceTokenV1: jest.fn(),
  branchesControllerRevokeDeviceCredentialV1: jest.fn(),
  branchesControllerUpdateDeviceV1: jest.fn(),
}));

jest.mock('../lib/api/session', () => ({ getCurrentSession: jest.fn() }));

const activeUnpairedDevice = {
  id: 'device-1',
  name: 'Front register',
  status: 'ACTIVE',
  branchId: 'branch-1',
  branch: { name: 'Central' },
  authBindingMode: 'UNPAIRED',
  pairedAt: null,
  webAuthnCredentials: [],
};

function deviceListResponse(device = activeUnpairedDevice) {
  return { status: 200, data: { success: true, data: [device] } };
}

function branchListResponse() {
  return {
    status: 200,
    data: {
      success: true,
      data: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Central' }],
    },
  };
}

describe('DeviceManagement', () => {
  const originalCredentials = Object.getOwnPropertyDescriptor(
    navigator,
    'credentials',
  );

  beforeEach(() => {
    window.localStorage.clear();
    jest.mocked(branchesControllerCompleteDeviceEnrollmentV1).mockReset();
    jest.mocked(branchesControllerCreateDeviceEnrollmentV1).mockReset();
    jest.mocked(branchesControllerCreateDeviceV1).mockReset();
    jest.mocked(branchesControllerListBranchesV1).mockReset();
    jest.mocked(branchesControllerListDevicesV1).mockReset();
    jest.mocked(branchesControllerPairDeviceTokenV1).mockReset();
    jest.mocked(branchesControllerResetDeviceTokenV1).mockReset();
    jest.mocked(branchesControllerRevokeDeviceCredentialV1).mockReset();
    jest.mocked(branchesControllerUpdateDeviceV1).mockReset();
    jest.mocked(getCurrentSession).mockReset();

    jest
      .mocked(branchesControllerListBranchesV1)
      .mockResolvedValue(branchListResponse() as never);
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse() as never);
    jest.mocked(getCurrentSession).mockResolvedValue({
      user: { role: 'ADMIN', branchId: null },
    } as never);
  });

  afterEach(() => {
    if (originalCredentials) {
      Object.defineProperty(navigator, 'credentials', originalCredentials);
    } else {
      Reflect.deleteProperty(navigator, 'credentials');
    }
    jest.restoreAllMocks();
  });

  it('requires target-browser confirmation and stores only the non-secret device locator', async () => {
    const pair = jest
      .mocked(branchesControllerPairDeviceTokenV1)
      .mockResolvedValue({
        status: 200,
        data: { data: { status: 'paired' } },
      } as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Pair this target POS browser',
      }),
    );
    expect(pair).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Before pairing this register' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Pair this target POS browser' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i confirm this is the authorized target POS browser/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Start pairing on this browser' }),
    );

    await waitFor(() => {
      expect(pair).toHaveBeenCalledWith('device-1', expect.any(Object));
    });
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
      'device-1',
    );
    expect(window.localStorage.length).toBe(1);
    expect(
      screen.getByText(/now has its HttpOnly device credential/i),
    ).toBeVisible();
  });

  it('shows DEVICE_TOKEN last-use state and resets through the CSRF-protected API', async () => {
    const tokenDevice = {
      ...activeUnpairedDevice,
      authBindingMode: 'DEVICE_TOKEN',
      pairedAt: '2026-10-15T00:00:00.000Z',
      deviceTokenCredentials: [
        {
          id: 'token-row-id',
          status: 'ACTIVE',
          lastUsedAt: '2026-10-15T00:05:00.000Z',
          keyVersion: 1,
        },
      ],
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(tokenDevice) as never);
    const reset = jest
      .mocked(branchesControllerResetDeviceTokenV1)
      .mockResolvedValue({
        status: 200,
        data: { data: { status: 'reset' } },
      } as never);
    window.localStorage.setItem('shopcity:paired-device-id', 'device-1');
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DeviceManagement />);
    expect(await screen.findByText(/Last used/)).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset browser credential' }),
    );
    await waitFor(() =>
      expect(reset).toHaveBeenCalledWith('device-1', expect.any(Object)),
    );
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBeNull();
  });

  it('shows Pairing required when a DEVICE_TOKEN device has no active credential', async () => {
    const uncredentialedDevice = {
      ...activeUnpairedDevice,
      authBindingMode: 'DEVICE_TOKEN',
      pairedAt: '2026-10-15T00:00:00.000Z',
      deviceTokenCredentials: [],
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(uncredentialedDevice) as never);

    render(<DeviceManagement />);

    expect(
      await screen.findByText(/Pairing required\. This device has no active/i),
    ).toBeVisible();
    expect(screen.getByText(/no active browser credential/i)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Pair this target POS browser' }),
    ).toBeEnabled();
    expect(
      screen.queryByText(/credential is active; no cashier login/i),
    ).not.toBeInTheDocument();
  });

  it('preserves another device locator when resetting the selected device', async () => {
    const tokenDevice = {
      ...activeUnpairedDevice,
      id: 'device-2',
      name: 'Back register',
      authBindingMode: 'DEVICE_TOKEN',
      deviceTokenCredentials: [{ id: 'token-row-2', status: 'ACTIVE' }],
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(tokenDevice) as never);
    jest.mocked(branchesControllerResetDeviceTokenV1).mockResolvedValue({
      status: 200,
      data: { data: { status: 'reset' } },
    } as never);
    window.localStorage.setItem('shopcity:paired-device-id', 'device-1');
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reset browser credential' }),
    );

    await waitFor(() =>
      expect(branchesControllerResetDeviceTokenV1).toHaveBeenCalledWith(
        'device-2',
        expect.any(Object),
      ),
    );
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
      'device-1',
    );
  });

  it('locks device selection while a pairing request is pending', async () => {
    const secondDevice = {
      ...activeUnpairedDevice,
      id: 'device-2',
      name: 'Back register',
    };
    jest.mocked(branchesControllerListDevicesV1).mockResolvedValue({
      status: 200,
      data: { success: true, data: [activeUnpairedDevice, secondDevice] },
    } as never);
    let resolvePair!: (response: unknown) => void;
    const pendingPair = new Promise<unknown>((resolve) => {
      resolvePair = resolve;
    });
    jest
      .mocked(branchesControllerPairDeviceTokenV1)
      .mockReturnValue(pendingPair as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Pair this target POS browser',
      }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i confirm this is the authorized target POS browser/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Start pairing on this browser' }),
    );

    await waitFor(() =>
      expect(branchesControllerPairDeviceTokenV1).toHaveBeenCalledWith(
        'device-1',
        expect.any(Object),
      ),
    );
    const selector = screen.getByRole('button', {
      name: 'Device: Front register',
    });
    expect(selector).toBeDisabled();
    fireEvent.click(selector);
    expect(selector).toHaveAttribute('aria-expanded', 'false');
    resolvePair({ status: 200, data: { data: { status: 'paired' } } });

    await waitFor(() => {
      expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
        'device-1',
      );
    });
    expect(
      screen.getByRole('button', { name: 'Device: Front register' }),
    ).toBeVisible();
  });

  it('disables stale device actions after refresh failure and re-enables after recovery', async () => {
    const listDevices = jest.mocked(branchesControllerListDevicesV1);
    listDevices
      .mockResolvedValueOnce(deviceListResponse() as never)
      .mockRejectedValueOnce(new Error('temporary list failure'))
      .mockResolvedValue(deviceListResponse() as never);

    render(<DeviceManagement />);
    await screen.findByRole('button', { name: 'Pair this target POS browser' });
    const refresh = screen.getByRole('button', { name: 'Refresh devices' });
    fireEvent.click(refresh);

    expect(
      await screen.findByText(/unavailable in this account or branch/i),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Device: Front register' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Pair this target POS browser' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Deactivate device' }),
    ).toBeDisabled();

    fireEvent.click(refresh);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Pair this target POS browser' }),
      ).toBeEnabled(),
    );
  });

  it('shows pairing errors inside the confirmation dialog until dismissed', async () => {
    jest
      .mocked(branchesControllerPairDeviceTokenV1)
      .mockResolvedValue({ status: 403, data: {} } as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Pair this target POS browser',
      }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i confirm this is the authorized target POS browser/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Start pairing on this browser' }),
    );

    expect(
      await screen.findByText(
        /pairing failed\. confirm the authorized account/i,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('dialog', { name: 'Before pairing this register' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry pairing' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores the device locator only after target-POS confirmation for an active credential', async () => {
    const pairedDevice = {
      ...activeUnpairedDevice,
      authBindingMode: 'WEBAUTHN',
      pairedAt: '2026-10-07T16:45:25.000Z',
      webAuthnCredentials: [
        {
          id: 'credential-1',
          status: 'ACTIVE',
          authenticatorAttachment: 'platform',
        },
      ],
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(pairedDevice) as never);

    render(<DeviceManagement />);
    const linkButton = await screen.findByRole('button', {
      name: 'Use existing paired device on this browser',
    });
    fireEvent.click(linkButton);

    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBeNull();
    const saveLocatorButton = screen.getByRole('button', {
      name: 'Save device locator',
    });
    expect(saveLocatorButton).toBeDisabled();
    fireEvent.click(saveLocatorButton);
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBeNull();
    expect(branchesControllerCreateDeviceEnrollmentV1).not.toHaveBeenCalled();
    expect(branchesControllerCompleteDeviceEnrollmentV1).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /qualified target POS for this device/i,
      }),
    );
    expect(saveLocatorButton).toBeEnabled();
    fireEvent.click(saveLocatorButton);

    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
      'device-1',
    );
    expect(
      screen.getByText(/cashier sign-in still requires its active WebAuthn/i),
    ).toBeVisible();
  });

  it('opens a button-matched device menu and supports keyboard selection', async () => {
    const secondDevice = {
      ...activeUnpairedDevice,
      id: 'device-2',
      name: 'Back register',
    };
    jest.mocked(branchesControllerListDevicesV1).mockResolvedValue({
      status: 200,
      data: { success: true, data: [activeUnpairedDevice, secondDevice] },
    } as never);

    render(<DeviceManagement />);
    const trigger = await screen.findByRole('button', {
      name: 'Device: Front register',
    });
    fireEvent.click(trigger);

    expect(
      screen.getByRole('listbox', { name: 'Device options' }),
    ).toBeVisible();
    fireEvent.keyDown(screen.getByRole('option', { name: 'Front register' }), {
      key: 'ArrowDown',
    });
    expect(screen.getByRole('option', { name: 'Back register' })).toHaveFocus();
    fireEvent.click(screen.getByRole('option', { name: 'Back register' }));

    expect(
      screen.getByRole('button', { name: 'Device: Back register' }),
    ).toBeVisible();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('limits Supervisor device creation to the session branch without listing all branches', async () => {
    jest.mocked(getCurrentSession).mockResolvedValue({
      user: {
        role: 'SUPERVISOR',
        branchId: '22222222-2222-4222-8222-222222222222',
      },
    } as never);
    jest.mocked(branchesControllerListDevicesV1).mockResolvedValue(
      deviceListResponse({
        ...activeUnpairedDevice,
        branchId: '22222222-2222-4222-8222-222222222222',
        branch: { name: 'Supervisor branch' },
      }) as never,
    );
    jest.mocked(branchesControllerCreateDeviceV1).mockResolvedValue({
      status: 201,
      data: { success: true, data: {} },
    } as never);

    render(<DeviceManagement supervisor />);
    await screen.findByRole('button', { name: 'Pair this target POS browser' });
    const createPanel = screen.getByRole('region', { name: 'Create device' });
    const listPanel = screen.getByRole('region', { name: 'Device list' });
    expect(createPanel.parentElement).toHaveClass(
      'device-management__workspace',
    );
    expect(listPanel.parentElement).toBe(createPanel.parentElement);
    expect(createPanel.parentElement?.lastElementChild).toBe(listPanel);
    expect(
      screen.queryByText(/branch is locked to your assigned branch/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh devices' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('combobox', { name: 'Branch' }),
    ).not.toBeInTheDocument();
    expect(branchesControllerListBranchesV1).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Device name' }), {
      target: { value: 'Supervisor POS' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));

    await waitFor(() => {
      expect(branchesControllerCreateDeviceV1).toHaveBeenCalledWith(
        {
          branchId: '22222222-2222-4222-8222-222222222222',
          name: 'Supervisor POS',
        },
        expect.any(Object),
      );
    });
  });

  it('explains an invalid legacy branch ID before submitting device creation', async () => {
    jest.mocked(getCurrentSession).mockResolvedValue({
      user: {
        role: 'SUPERVISOR',
        branchId: '00000000-0000-0000-0000-000000000002',
      },
    } as never);
    jest.mocked(branchesControllerListDevicesV1).mockResolvedValue(
      deviceListResponse({
        ...activeUnpairedDevice,
        branchId: '00000000-0000-0000-0000-000000000002',
      }) as never,
    );

    render(<DeviceManagement supervisor />);
    fireEvent.change(
      await screen.findByRole('textbox', { name: 'Device name' }),
      {
        target: { value: 'Supervisor POS' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));

    expect(
      await screen.findByText(
        'Device creation could not be completed: the assigned branch identifier is invalid.',
      ),
    ).toBeVisible();
    expect(branchesControllerCreateDeviceV1).not.toHaveBeenCalled();
  });

  it('explains server-side schema failures when creating or reactivating devices', async () => {
    jest.mocked(branchesControllerCreateDeviceV1).mockResolvedValue({
      status: 500,
      data: { success: false, error: { code: 'INTERNAL_ERROR' } },
    } as never);
    render(<DeviceManagement />);
    fireEvent.change(
      await screen.findByRole('textbox', { name: 'Device name' }),
      {
        target: { value: 'New register' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));

    expect(
      await screen.findByText(
        /server's device security schema may not support unpaired devices/i,
      ),
    ).toBeVisible();
    expect(branchesControllerCreateDeviceV1).toHaveBeenCalled();
  });

  it('reuses create idempotency identity on retry and rotates it for a new device', async () => {
    const create = jest
      .mocked(branchesControllerCreateDeviceV1)
      .mockResolvedValueOnce({
        status: 503,
        data: { success: false, error: { code: 'TEMPORARY_FAILURE' } },
      } as never)
      .mockResolvedValue({
        status: 201,
        data: { success: true, data: {} },
      } as never);
    render(<DeviceManagement />);

    fireEvent.change(
      await screen.findByRole('textbox', { name: 'Device name' }),
      { target: { value: 'Retry register' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));
    expect(
      await screen.findByText(
        /server's device security schema may not support/i,
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh devices' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Create device' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));

    const firstRetryRequest = create.mock.calls[0]?.[1] as {
      headers?: Record<string, string>;
    };
    const secondRetryRequest = create.mock.calls[1]?.[1] as {
      headers?: Record<string, string>;
    };
    const firstKey = firstRetryRequest.headers?.['idempotency-key'];
    expect(firstKey).toBeTruthy();
    expect(secondRetryRequest.headers?.['idempotency-key']).toBe(firstKey);

    fireEvent.change(screen.getByRole('textbox', { name: 'Device name' }), {
      target: { value: 'Another register' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(3));
    const newOperationRequest = create.mock.calls[2]?.[1] as {
      headers?: Record<string, string>;
    };
    expect(newOperationRequest.headers?.['idempotency-key']).not.toBe(firstKey);
  });

  it('reuses device update idempotency identity after an uncertain result', async () => {
    const inactiveDevice = { ...activeUnpairedDevice, status: 'INACTIVE' };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(inactiveDevice) as never);
    const update = jest
      .mocked(branchesControllerUpdateDeviceV1)
      .mockResolvedValueOnce({
        status: 503,
        data: { success: false, error: { code: 'TEMPORARY_FAILURE' } },
      } as never)
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: { status: 'ACTIVE' } },
      } as never);
    render(<DeviceManagement />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Reactivate device' }),
    );
    expect(
      await screen.findByText(/device security schema may be incompatible/i),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh devices' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reactivate device' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate device' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));

    const firstRequest = update.mock.calls[0]?.[2] as {
      headers?: Record<string, string>;
    };
    const retryRequest = update.mock.calls[1]?.[2] as {
      headers?: Record<string, string>;
    };
    const firstKey = firstRequest.headers?.['idempotency-key'];
    expect(firstKey).toBeTruthy();
    expect(retryRequest.headers?.['idempotency-key']).toBe(firstKey);
  });

  it('shows Pairing required after a token device is reactivated', async () => {
    const inactiveTokenDevice = {
      ...activeUnpairedDevice,
      status: 'INACTIVE',
      authBindingMode: 'DEVICE_TOKEN',
      pairedAt: '2026-10-15T00:00:00.000Z',
      deviceTokenCredentials: [],
    };
    const reactivatedUnpairedDevice = {
      ...activeUnpairedDevice,
      status: 'ACTIVE',
      authBindingMode: 'UNPAIRED',
      pairedAt: null,
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValueOnce(deviceListResponse(inactiveTokenDevice) as never)
      .mockResolvedValue(
        deviceListResponse(reactivatedUnpairedDevice) as never,
      );
    jest.mocked(branchesControllerUpdateDeviceV1).mockResolvedValue({
      status: 200,
      data: { success: true, data: { status: 'ACTIVE' } },
    } as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reactivate device' }),
    );

    await waitFor(() =>
      expect(branchesControllerUpdateDeviceV1).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({ status: 'ACTIVE' }),
        expect.any(Object),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pairing required',
    );
    expect(screen.getByText('UNPAIRED')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Pair this target POS browser' }),
    ).toBeEnabled();
  });

  it('shows a schema-specific explanation when reactivation fails on the server', async () => {
    jest.mocked(branchesControllerListDevicesV1).mockResolvedValue(
      deviceListResponse({
        ...activeUnpairedDevice,
        status: 'INACTIVE',
      }) as never,
    );
    jest.mocked(branchesControllerUpdateDeviceV1).mockResolvedValue({
      status: 500,
      data: { success: false, error: { code: 'INTERNAL_ERROR' } },
    } as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reactivate device' }),
    );

    expect(
      await screen.findByText(
        /device security schema may be incompatible with this device state/i,
      ),
    ).toBeVisible();
  });

  it('revokes an individual active credential only after confirmation', async () => {
    const credentialDevice = {
      ...activeUnpairedDevice,
      authBindingMode: 'WEBAUTHN',
      pairedAt: '2026-10-01T12:00:00.000Z',
      webAuthnCredentials: [
        {
          id: 'credential-row-1',
          status: 'ACTIVE',
          pairedAt: '2026-10-01T12:00:00.000Z',
          authenticatorAttachment: 'platform',
          backupEligible: false,
        },
      ],
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(credentialDevice) as never);
    const revoke = jest
      .mocked(branchesControllerRevokeDeviceCredentialV1)
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: {} },
      } as never);
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Revoke credential 1' }),
    );

    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith(
        'device-1',
        'credential-row-1',
        expect.any(Object),
      );
    });
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining(
        'Cashier sessions bound to it will be invalidated',
      ),
    );
  });

  it('shows a rotated legacy secret only in an ephemeral one-time panel', async () => {
    const legacyDevice = {
      ...activeUnpairedDevice,
      authBindingMode: 'HMAC_LEGACY',
    };
    jest
      .mocked(branchesControllerListDevicesV1)
      .mockResolvedValue(deviceListResponse(legacyDevice) as never);
    jest.mocked(branchesControllerUpdateDeviceV1).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: { attestationSecret: 'transient-legacy-secret' },
      },
    } as never);

    render(<DeviceManagement />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rotate legacy HMAC secret' }),
    );

    expect(await screen.findByText('transient-legacy-secret')).toBeVisible();
    expect(window.localStorage.getItem('transient-legacy-secret')).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Action response' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear one-time secret' }),
    );
    expect(
      screen.queryByText('transient-legacy-secret'),
    ).not.toBeInTheDocument();
  });
});
