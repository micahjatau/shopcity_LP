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

describe('LoginForm device secret handling', () => {
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

    expect(window.localStorage.getItem('shopcity:device-attestation-secret')).toBe(
      null,
    );
  });

  it('clears the raw device secret after a sign-in attempt', async () => {
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 200,
      data: { data: { user: { role: 'CASHIER' } } },
    } as never);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Tenant / email / username'), {
      target: { value: 'cashier@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText('Device attestation secret'), {
      target: { value: 'one-time-secret' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Device attestation secret')).toHaveValue('');
    });
    expect(mockReplace).toHaveBeenCalledWith('/cashier');
  });
});
