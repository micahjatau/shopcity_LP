import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '../components/auth/forgot-password-form';
import { ResetPasswordForm } from '../components/auth/reset-password-form';
import { completePasswordRecovery, requestPasswordRecovery } from '../lib/api';

jest.mock('../lib/api', () => ({
  completePasswordRecovery: jest.fn(),
  requestPasswordRecovery: jest.fn(),
}));

describe('password recovery forms', () => {
  beforeEach(() => {
    jest.mocked(completePasswordRecovery).mockReset();
    jest.mocked(requestPasswordRecovery).mockReset();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('shows a generic confirmation without echoing the submitted email', async () => {
    jest.mocked(requestPasswordRecovery).mockResolvedValue({
      status: 200,
      data: {
        data: {
          message:
            'If an account exists for that email, password-recovery instructions will be sent.',
        },
      },
    });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'staff@example.test' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Send recovery instructions' }),
    );

    expect(requestPasswordRecovery).toHaveBeenCalledWith('staff@example.test');
    expect(
      await screen.findByText(/if the address is associated/i),
    ).toBeVisible();
    expect(screen.queryByText('staff@example.test')).not.toBeInTheDocument();
  });

  it('removes recovery credentials from the URL and keeps them only for the BFF request', async () => {
    const accessToken = 'ephemeral-access-token';
    const refreshToken = 'ephemeral-refresh-token';
    window.history.replaceState(
      {},
      '',
      `/reset-password#access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`,
    );
    jest.mocked(completePasswordRecovery).mockResolvedValue({
      status: 200,
      data: { data: { message: 'Password updated. You can now sign in.' } },
    });
    render(<ResetPasswordForm />);

    await waitFor(() => expect(window.location.hash).toBe(''));
    expect(window.localStorage.length).toBe(0);
    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'new-safe-password' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'new-safe-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() =>
      expect(completePasswordRecovery).toHaveBeenCalledWith({
        accessToken,
        refreshToken,
        type: 'recovery',
        password: 'new-safe-password',
      }),
    );
    expect(
      await screen.findByText(/your password has been updated/i),
    ).toBeVisible();
    expect(window.location.hash).toBe('');
    expect(window.localStorage.length).toBe(0);
  });

  it('does not submit when the confirmation password differs', async () => {
    window.history.replaceState(
      {},
      '',
      '/reset-password#access_token=a&refresh_token=b&type=recovery',
    );
    render(<ResetPasswordForm />);

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'new-safe-password' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText(/passwords do not match/i)).toBeVisible();
    expect(completePasswordRecovery).not.toHaveBeenCalled();
  });

  it('surfaces the request reference when session cleanup needs operator help', async () => {
    window.history.replaceState(
      {},
      '',
      '/reset-password#access_token=a&refresh_token=b&type=recovery',
    );
    jest.mocked(completePasswordRecovery).mockResolvedValue({
      status: 503,
      data: {
        error: { code: 'PASSWORD_RECOVERY_FINALIZATION_FAILED' },
        meta: { requestId: 'recovery-reference-1' },
      },
    });
    render(<ResetPasswordForm />);

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'new-safe-password' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'new-safe-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(
      await screen.findByText(
        /password was changed, but shopcity could not safely close/i,
      ),
    ).toBeVisible();
    expect(screen.getByText(/recovery-reference-1/i)).toBeVisible();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('gives an expired recovery link a generic message', async () => {
    window.history.replaceState({}, '', '/reset-password#type=recovery');
    render(<ResetPasswordForm />);

    expect(
      await screen.findByText(/link is invalid or expired/i),
    ).toBeVisible();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });
});
