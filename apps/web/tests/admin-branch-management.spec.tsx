import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import {
  branchesControllerCreateBranchV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  branchesControllerUpdateBranchV1,
} from '../lib/api/generated-client';
import {
  AdminBranchDirectory,
  AdminBranchProfile,
  AdminBranchRegistration,
} from '../components/workflows/admin-branch-management';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('../lib/api/generated-client', () => ({
  branchesControllerCreateBranchV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  branchesControllerListDevicesV1: jest.fn(),
  branchesControllerUpdateBranchV1: jest.fn(),
}));

const mockRouter = useRouter as jest.Mock;
const mockPush = jest.fn();
const mockBranches = branchesControllerListBranchesV1 as jest.Mock;
const mockDevices = branchesControllerListDevicesV1 as jest.Mock;
const mockCreate = branchesControllerCreateBranchV1 as jest.Mock;
const mockUpdate = branchesControllerUpdateBranchV1 as jest.Mock;
const branch = {
  id: 'branch-1',
  name: 'Central Market',
  status: 'ACTIVE',
  timezone: 'Africa/Lagos',
  receiptWeekStartDay: 1,
  createdAt: '2026-10-01T09:00:00.000Z',
};
function response(data: unknown, status = 200) {
  return { status, data: { success: true, data } };
}
function device(id: string, branchId: string) {
  return {
    id,
    name: `POS ${id}`,
    status: 'ACTIVE',
    branchId,
    authBindingMode: 'UNPAIRED',
    fingerprintHash: 'must-not-be-rendered',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.mockReturnValue({ push: mockPush });
  mockBranches.mockResolvedValue(response([branch]));
  mockDevices.mockResolvedValue(response([device('device-1', branch.id)]));
  mockCreate.mockResolvedValue(response({ id: 'branch-created' }, 201));
  mockUpdate.mockResolvedValue(response(branch));
});

describe('Admin branch directory', () => {
  it('searches, filters, paginates five records and shows branch configuration and assigned device counts', async () => {
    const branches = [
      branch,
      ...Array.from({ length: 4 }, (_, index) => ({
        ...branch,
        id: `branch-${index + 2}`,
        name: `Branch ${index + 2}`,
      })),
      {
        ...branch,
        id: 'branch-7',
        name: 'Inactive depot',
        timezone: 'Africa/Accra',
        status: 'INACTIVE',
      },
    ];
    mockBranches.mockResolvedValue(response(branches));
    mockDevices.mockResolvedValue(
      response([device('device-1', branch.id), device('device-2', branch.id)]),
    );
    const user = userEvent.setup();
    render(<AdminBranchDirectory />);

    expect(await screen.findByText('Central Market')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create branch' }).closest('section'),
    ).toHaveAttribute('aria-label', 'Branch directory');
    expect(
      screen.getByText('Showing 1–5 of 6 matching branches.'),
    ).toBeInTheDocument();
    expect(screen.getByText('2', { selector: 'td' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View branch Central Market' }),
    ).toHaveAttribute('href', '/admin/branches/branch-1');
    await user.click(screen.getByRole('button', { name: 'Next branch page' }));
    expect(screen.getByText('Inactive depot')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter branches by status' }),
      'INACTIVE',
    );
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search branches' }),
      'missing',
    );
    expect(
      screen.getByText('No branches match this search and status filter.'),
    ).toBeInTheDocument();
  });

  it('distinguishes empty and failed branch responses and retries safely', async () => {
    mockBranches
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<AdminBranchDirectory />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Branches or device assignments could not be loaded',
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByText(/No branches are configured yet/),
    ).toBeInTheDocument();
  });
});

describe('Admin branch registration', () => {
  it('validates timezone and receipt-week boundaries before creating a branch', async () => {
    const user = userEvent.setup();
    render(<AdminBranchRegistration />);
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'West branch',
    );
    await user.clear(screen.getByRole('textbox', { name: 'Timezone' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Timezone' }),
      'Invalid/Timezone',
    );
    await user.click(screen.getByRole('button', { name: 'Create branch' }));
    expect(screen.getByRole('status')).toHaveTextContent('valid IANA timezone');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('uses supported defaults and opens the new profile only after a confirmed ID', async () => {
    const user = userEvent.setup();
    render(<AdminBranchRegistration />);
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'West branch',
    );
    expect(
      screen.getByRole('combobox', { name: 'Receipt-week start day' }),
    ).toHaveValue('1');
    await user.click(screen.getByRole('button', { name: 'Create branch' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        {
          name: 'West branch',
          timezone: 'Africa/Lagos',
          receiptWeekStartDay: 1,
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(
      mockCreate.mock.calls[0]?.[1]?.headers?.['idempotency-key'],
    ).toBeUndefined();
    expect(mockPush).toHaveBeenCalledWith('/admin/branches/branch-created');
  });

  it('refreshes authoritative state and requires review after an ambiguous non-idempotent create', async () => {
    mockCreate
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValue(response({ id: 'branch-created' }, 201));
    const user = userEvent.setup();
    render(<AdminBranchRegistration />);
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'West branch',
    );
    await user.click(screen.getByRole('button', { name: 'Create branch' }));
    expect(
      await screen.findByRole('textbox', { name: /Confirm you reviewed/ }),
    ).toBeInTheDocument();
    expect(mockBranches).toHaveBeenCalledTimes(1);
    await user.type(
      screen.getByRole('textbox', { name: /Confirm you reviewed/ }),
      'REVIEWED',
    );
    await user.click(
      screen.getByRole('button', { name: 'Retry branch creation' }),
    );
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockPush).toHaveBeenCalledWith('/admin/branches/branch-created');
  });
});

describe('Admin branch profile', () => {
  it('edits only supported fields and links associated devices without exposing fingerprint hashes', async () => {
    const user = userEvent.setup();
    render(<AdminBranchProfile branchId="branch-1" />);
    expect(
      await screen.findByRole('heading', { name: 'Central Market' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('ACTIVE')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'View profile for POS device-1' }),
    ).toHaveAttribute('href', '/admin/devices/device-1');
    expect(screen.queryByText('must-not-be-rendered')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Branch name' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'Central Market Updated',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Type UPDATE to confirm changes' }),
      'UPDATE',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save branch settings' }),
    );
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        'branch-1',
        {
          name: 'Central Market Updated',
          timezone: 'Africa/Lagos',
          receiptWeekStartDay: 1,
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });

  it('refreshes persisted state before retrying an ambiguous non-idempotent update', async () => {
    mockUpdate
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValue(response(branch));
    const user = userEvent.setup();
    render(<AdminBranchProfile branchId="branch-1" />);
    await screen.findByRole('heading', { name: 'Central Market' });
    await user.clear(screen.getByRole('textbox', { name: 'Branch name' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'Updated branch',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Type UPDATE to confirm changes' }),
      'UPDATE',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save branch settings' }),
    );

    expect(
      await screen.findByText(/authoritative branch profile was refreshed/),
    ).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(
      mockUpdate.mock.calls[0]?.[2]?.headers?.['idempotency-key'],
    ).toBeUndefined();
    expect(
      await screen.findByDisplayValue('Central Market'),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Branch name' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Branch name' }),
      'Updated branch',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Type UPDATE to confirm changes' }),
      'UPDATE',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save branch settings' }),
    );
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  });

  it('shows a safe unavailable state for missing or out-of-scope branches', async () => {
    mockBranches.mockResolvedValue(
      response([{ ...branch, id: 'another-branch' }]),
    );
    render(<AdminBranchProfile branchId="not-authorized" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Branch unavailable',
    );
    expect(screen.queryByLabelText('Branch name')).not.toBeInTheDocument();
  });
});
