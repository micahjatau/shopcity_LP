import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import {
  branchesControllerListBranchesV1,
  usersControllerCreateUserV1,
  usersControllerListUsersV1,
  usersControllerUpdateRoleV1,
  usersControllerUpdateStatusV1,
} from '../lib/api/generated-client';
import {
  AdminStaffDirectory,
  AdminStaffProfile,
  AdminStaffRegistration,
} from '../components/workflows/admin-staff-management';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('../lib/api/generated-client', () => ({
  branchesControllerListBranchesV1: jest.fn(),
  usersControllerCreateUserV1: jest.fn(),
  usersControllerListUsersV1: jest.fn(),
  usersControllerUpdateRoleV1: jest.fn(),
  usersControllerUpdateStatusV1: jest.fn(),
}));

const mockBranches = branchesControllerListBranchesV1 as jest.Mock;
const mockCreateStaff = usersControllerCreateUserV1 as jest.Mock;
const mockListStaff = usersControllerListUsersV1 as jest.Mock;
const mockUpdateRole = usersControllerUpdateRoleV1 as jest.Mock;
const mockUpdateStatus = usersControllerUpdateStatusV1 as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockPush = jest.fn();

const branch = { id: 'branch-1', name: 'Central Market', status: 'ACTIVE' };

function response<T>(data: T, status = 200) {
  return { status, data: { data } };
}

function staffRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'staff-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: 'ada@example.test',
    phoneNumber: '+234 801 234 5678',
    role: 'CASHIER',
    status: 'ACTIVE',
    branchId: 'branch-1',
    createdAt: '2026-09-20T09:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockBranches.mockResolvedValue(response([branch]));
  mockListStaff.mockResolvedValue(response([staffRecord()]));
  mockCreateStaff.mockResolvedValue(response({ id: 'staff-created' }, 201));
  mockUpdateRole.mockResolvedValue({ status: 200 });
  mockUpdateStatus.mockResolvedValue({ status: 200 });
});

describe('Admin staff directory', () => {
  it('searches, filters, paginates, and opens tenant-scoped staff profiles', async () => {
    const staff = [
      staffRecord(),
      staffRecord({
        id: 'staff-2',
        firstName: 'Grace',
        lastName: 'Hopper',
        username: 'grace@example.test',
        phoneNumber: '+234 802 000 0000',
      }),
      ...Array.from({ length: 4 }, (_, index) =>
        staffRecord({
          id: `staff-${index + 3}`,
          firstName: `Employee ${index + 3}`,
          username: `employee${index + 3}@example.test`,
        }),
      ),
      staffRecord({
        id: 'staff-suspended',
        firstName: 'Sam',
        lastName: 'Paused',
        username: 'sam@example.test',
        status: 'SUSPENDED',
      }),
    ];
    mockListStaff.mockResolvedValue(response(staff));
    const user = userEvent.setup();
    render(<AdminStaffDirectory />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(
      screen.getByText('Showing 1–5 of 7 staff members.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View profile for Ada Lovelace' }),
    ).toHaveAttribute('href', '/admin/users/staff-1');
    expect(
      screen.getByRole('button', { name: 'Next staff page' }),
    ).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next staff page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Sam Paused')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Search staff by name, email, or phone',
      }),
      'grace@example.test',
    );
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Sam Paused')).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter staff by status' }),
      'SUSPENDED',
    );
    expect(
      screen.getByText(
        'No suspended staff member matched this search and status filter.',
      ),
    ).toBeInTheDocument();
  });

  it('routes the register action without adding role-specific staff controls elsewhere', async () => {
    const user = userEvent.setup();
    render(<AdminStaffDirectory />);
    await screen.findByText('Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Register staff' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/users/new');
  });
});

describe('Admin staff registration', () => {
  it('collects staff identity and assignment, then opens the created profile', async () => {
    const user = userEvent.setup();
    render(<AdminStaffRegistration />);

    await screen.findByRole('option', { name: 'Central Market' });
    await user.type(screen.getByLabelText('First name'), 'Katherine');
    await user.type(screen.getByLabelText('Last name'), 'Johnson');
    await user.type(screen.getByLabelText('Email'), 'katherine@example.test');
    await user.type(screen.getByLabelText('Phone number'), '+234 803 765 4321');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.selectOptions(screen.getByLabelText('Role'), 'SUPERVISOR');
    await user.selectOptions(screen.getByLabelText('Branch'), 'branch-1');

    const roleSelect = screen.getByLabelText('Role');
    expect(
      within(roleSelect).queryByRole('option', { name: 'SYSTEM' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Register staff' }));
    await waitFor(() =>
      expect(mockCreateStaff).toHaveBeenCalledWith(
        {
          firstName: 'Katherine',
          lastName: 'Johnson',
          username: 'katherine@example.test',
          phoneNumber: '+234 803 765 4321',
          password: 'correct-horse-battery',
          role: 'SUPERVISOR',
          branchId: 'branch-1',
        },
        expect.objectContaining({
          credentials: 'include',
          csrf: true,
          headers: expect.objectContaining({ accept: 'application/json' }),
        }),
      ),
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/users/staff-created');
  });

  it('does not repeat a registration when the result is ambiguous', async () => {
    const user = userEvent.setup();
    mockCreateStaff.mockRejectedValue(new Error('network failure'));
    render(<AdminStaffRegistration />);
    await screen.findByRole('option', { name: 'Central Market' });
    await user.type(screen.getByLabelText('First name'), 'Katherine');
    await user.type(screen.getByLabelText('Last name'), 'Johnson');
    await user.type(screen.getByLabelText('Email'), 'katherine@example.test');
    await user.type(screen.getByLabelText('Phone number'), '+234 803 765 4321');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');

    await user.click(screen.getByRole('button', { name: 'Register staff' }));
    expect(
      await screen.findByText(/registration result could not be confirmed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register staff' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('link', { name: 'Open the staff list' }),
    ).toHaveAttribute('href', '/admin/users');
  });
});

describe('Admin staff profile', () => {
  it('returns a safe not-found state when the profile is outside the tenant list', async () => {
    mockListStaff.mockResolvedValue(
      response([staffRecord({ id: 'other-tenant-staff' })]),
    );
    render(<AdminStaffProfile userId="staff-1" />);

    expect(
      await screen.findByText(
        'This staff profile is not available in your tenant.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Return to staff list' }),
    ).toHaveAttribute('href', '/admin/users');
    expect(
      screen.queryByRole('heading', { name: 'Ada Lovelace' }),
    ).not.toBeInTheDocument();
  });

  it('offers retry after a profile load error', async () => {
    mockListStaff
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(response([staffRecord()]));
    const user = userEvent.setup();
    render(<AdminStaffProfile userId="staff-1" />);

    expect(
      await screen.findByText('Staff profile could not be loaded.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  it('shows a role mutation error without presenting an unconfirmed role as current', async () => {
    mockUpdateRole.mockResolvedValue({ status: 500 });
    const user = userEvent.setup();
    render(<AdminStaffProfile userId="staff-1" />);

    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    await user.selectOptions(screen.getByLabelText('Role'), 'SUPERVISOR');
    await user.type(screen.getByLabelText('Confirmation'), 'UPDATE');
    await user.click(screen.getByRole('button', { name: 'Update role' }));

    expect(
      await screen.findByText('Role update was not confirmed (HTTP 500).'),
    ).toBeInTheDocument();
    const profile = screen.getByRole('region', { name: 'Ada Lovelace' });
    expect(within(profile).getByText('CASHIER', { exact: true })).toBeVisible();
  });

  it('shows the staff profile and confirms role and status changes', async () => {
    let currentStaff = staffRecord();
    mockListStaff.mockImplementation(async () => response([currentStaff]));
    mockUpdateRole.mockImplementation(async (_id, payload) => {
      currentStaff = { ...currentStaff, role: payload.role };
      return { status: 200 };
    });
    mockUpdateStatus.mockImplementation(async (_id, payload) => {
      currentStaff = { ...currentStaff, status: payload.status };
      return { status: 200 };
    });

    const user = userEvent.setup();
    render(<AdminStaffProfile userId="staff-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ada@example.test')).toHaveLength(2);
    expect(screen.getByText('Central Market')).toBeInTheDocument();
    expect(screen.getByText('Never signed in')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Role'), 'SUPERVISOR');
    await user.type(screen.getByLabelText('Confirmation'), 'UPDATE');
    await user.click(screen.getByRole('button', { name: 'Update role' }));
    await waitFor(() =>
      expect(mockUpdateRole).toHaveBeenCalledWith(
        'staff-1',
        { role: 'SUPERVISOR' },
        expect.objectContaining({
          credentials: 'include',
          csrf: true,
          idempotencyKey: expect.any(String),
          headers: expect.objectContaining({
            accept: 'application/json',
            'idempotency-key': expect.any(String),
          }),
        }),
      ),
    );
    expect(
      await screen.findByText(
        'Role updated. Existing sessions may need to sign in again.',
      ),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'SUSPENDED');
    await user.type(screen.getByLabelText('Confirmation'), 'UPDATE');
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    await waitFor(() =>
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'staff-1',
        { status: 'SUSPENDED' },
        expect.objectContaining({
          credentials: 'include',
          csrf: true,
          idempotencyKey: expect.any(String),
          headers: expect.objectContaining({
            accept: 'application/json',
            'idempotency-key': expect.any(String),
          }),
        }),
      ),
    );
    expect(await screen.findByText('Status updated.')).toBeInTheDocument();
  });
});
