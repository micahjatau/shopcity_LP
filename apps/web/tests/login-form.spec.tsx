import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from '../components/auth/login-form';
import { loginWithCredentials } from '../lib/api';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../lib/api', () => ({
  loginWithCredentials: jest.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockReplace.mockReset();
    jest.mocked(loginWithCredentials).mockReset();
  });

  it('does not persist the raw device secret in browser storage', () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Device attestation secret'), {
      target: { value: 'one-time-secret' },
    });

    expect(
      window.localStorage.getItem('shopcity:device-attestation-secret'),
    ).toBe(null);
  });

  it('clears the raw device secret after a sign-in attempt', async () => {
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 200,
      data: { data: { user: { role: 'CASHIER' } } },
    } as never);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'cashier@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText('Device attestation secret'), {
      target: { value: 'one-time-secret' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Device attestation secret')).toHaveValue(
        '',
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/cashier');
  });

  it('only presents supported staff roles', () => {
    render(<LoginForm />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(
      screen.getByRole('radio', { name: 'Cashier / Loyalty Staff' }),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Supervisor' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Administrator' })).toBeVisible();
    expect(
      screen.queryByRole('radio', { name: 'Owner' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/owner/i)).not.toBeInTheDocument();
  });

  it('uses the backend-returned role for navigation', async () => {
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 200,
      data: { data: { user: { role: 'SUPERVISOR' } } },
    } as never);

    render(<LoginForm />);
    fireEvent.click(screen.getByRole('radio', { name: 'Supervisor' }));
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'staff@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/supervisor');
    });
  });
});
