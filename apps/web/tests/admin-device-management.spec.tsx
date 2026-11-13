import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import {
  branchesControllerCreateDeviceV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
} from '../lib/api/generated-client';
import {
  AdminDeviceDirectory,
  AdminDeviceRegistration,
} from '../components/devices/admin-device-workflows';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('../lib/api/generated-client', () => ({
  branchesControllerCreateDeviceV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  branchesControllerListDevicesV1: jest.fn(),
}));

const mockRouter = useRouter as jest.Mock;
const mockPush = jest.fn();
const mockBranches = branchesControllerListBranchesV1 as jest.Mock;
const mockDevices = branchesControllerListDevicesV1 as jest.Mock;
const mockCreate = branchesControllerCreateDeviceV1 as jest.Mock;
const branch = { id: 'branch-1', name: 'Central Market' };

function response(data: unknown, status = 200) {
  return { status, data: { success: true, data } };
}

function device(overrides: Record<string, unknown> = {}) {
  return {
    id: 'device-1',
    name: 'Front register',
    status: 'ACTIVE',
    branchId: branch.id,
    branch: { name: branch.name },
    authBindingMode: 'UNPAIRED',
    lastSeenAt: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.mockReturnValue({ push: mockPush });
  mockBranches.mockResolvedValue(response([branch]));
  mockDevices.mockResolvedValue(response([device()]));
  mockCreate.mockResolvedValue(response({ id: 'device-created' }, 201));
});

describe('Admin device directory', () => {
  it('searches by device and branch, filters binding state, paginates five authorized records and links to profiles', async () => {
    const records = [
      device(),
      ...Array.from({ length: 4 }, (_, index) =>
        device({
          id: `device-${index + 2}`,
          name: `Front register ${index + 2}`,
        }),
      ),
      device({
        id: 'device-last',
        name: 'Back office',
        branch: { name: 'North branch' },
        branchId: 'branch-2',
        authBindingMode: 'DEVICE_TOKEN',
      }),
    ];
    mockBranches.mockResolvedValue(
      response([branch, { id: 'branch-2', name: 'North branch' }]),
    );
    mockDevices.mockResolvedValue(response(records));
    const user = userEvent.setup();
    render(<AdminDeviceDirectory />);

    expect(await screen.findByText('Front register')).toBeInTheDocument();
    expect(
      screen.getByText('Showing 1–5 of 6 matching devices.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View device Front register' }),
    ).toHaveAttribute('href', '/admin/devices/device-1');
    expect(
      screen.getByRole('link', { name: 'Register device' }).closest('section'),
    ).toHaveAttribute('aria-label', 'Device directory');
    await user.click(screen.getByRole('button', { name: 'Next device page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Back office')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search devices' }),
      'north branch',
    );
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('Back office')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter devices by binding' }),
      'UNPAIRED',
    );
    expect(
      screen.getByText('No devices match this search and filter.'),
    ).toBeInTheDocument();
  });

  it('provides a safe retry state when the authorized device request fails', async () => {
    mockDevices
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<AdminDeviceDirectory />);
    expect(
      await screen.findByText(/Devices could not be loaded/),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByText(/No devices are registered yet/),
    ).toBeInTheDocument();
  });
});

describe('Admin device registration', () => {
  it('submits a tenant branch with CSRF and an idempotency key, then navigates only on a confirmed stable ID', async () => {
    const user = userEvent.setup();
    render(<AdminDeviceRegistration />);
    await screen.findByRole('option', { name: 'Central Market' });
    await user.type(
      screen.getByRole('textbox', { name: 'Device name' }),
      'New front POS',
    );
    await user.click(screen.getByRole('button', { name: 'Register device' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        { branchId: 'branch-1', name: 'New front POS' },
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'idempotency-key': expect.any(String),
          }),
        }),
      ),
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/devices/device-created');
  });

  it('does not navigate on an unconfirmed response or without a stable device ID', async () => {
    mockCreate.mockResolvedValueOnce(response({}, 201));
    const user = userEvent.setup();
    render(<AdminDeviceRegistration />);
    await screen.findByRole('option', { name: 'Central Market' });
    await user.type(
      screen.getByRole('textbox', { name: 'Device name' }),
      'New front POS',
    );
    await user.click(screen.getByRole('button', { name: 'Register device' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'confirmed registration but returned no device ID',
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
