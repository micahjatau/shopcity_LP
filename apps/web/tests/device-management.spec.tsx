import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeviceManagement } from '../components/devices/device-management';
import {
  branchesControllerCompleteDeviceEnrollmentV1,
  branchesControllerCreateDeviceEnrollmentV1,
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
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

  it('requires explicit target-POS confirmation before requesting pairing authorization', async () => {
    const createEnrollment = jest
      .mocked(branchesControllerCreateDeviceEnrollmentV1)
      .mockResolvedValue({
        status: 201,
        data: {
          success: true,
          data: {
            authorizationToken: 'one-time-pairing-token',
            options: {
              challenge: 'AQID',
              rp: { id: 'localhost', name: 'ShopCity POS' },
              user: { id: 'BAUG', name: 'pos', displayName: 'POS' },
              pubKeyCredParams: [],
            },
          },
        },
      } as never);
    const createCredential = jest.fn().mockResolvedValue({
      id: 'credential-public-id',
      rawId: new Uint8Array([1, 2]).buffer,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response: {
        clientDataJSON: new Uint8Array([3]).buffer,
        attestationObject: new Uint8Array([4]).buffer,
        getTransports: () => ['internal'],
      },
      getClientExtensionResults: () => ({}),
    });
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { create: createCredential },
    });
    jest
      .mocked(branchesControllerCompleteDeviceEnrollmentV1)
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: { status: 'ACTIVE' } },
      } as never);

    render(<DeviceManagement />);
    await screen.findByRole('button', { name: 'Pair on target POS browser' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Pair on target POS browser' }),
    );
    expect(createEnrollment).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /software cannot independently prove physical register identity/i,
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i confirm this is the target POS browser/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Start pairing on this browser' }),
    );

    await waitFor(() => {
      expect(branchesControllerCompleteDeviceEnrollmentV1).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({
          authorizationToken: 'one-time-pairing-token',
          response: expect.objectContaining({
            authenticatorAttachment: 'platform',
          }),
        }),
        expect.any(Object),
      );
    });
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
      'device-1',
    );
    expect(window.localStorage.length).toBe(1);
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
    await screen.findByText(/branch is locked to your assigned branch/i);
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
