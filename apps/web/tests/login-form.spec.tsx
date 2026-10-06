import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from '../components/auth/login-form';
import { loginWithCredentials } from '../lib/api';
import { authControllerCompleteCashierLoginV1 } from '../lib/api/generated-client';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: jest.fn() }),
}));
jest.mock('../lib/api', () => ({ loginWithCredentials: jest.fn() }));
jest.mock('../lib/api/generated-client', () => ({
  authControllerCompleteCashierLoginV1: jest.fn(),
}));

describe('LoginForm WebAuthn flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockReplace.mockReset();
    jest.mocked(loginWithCredentials).mockReset();
    jest.mocked(authControllerCompleteCashierLoginV1).mockReset();
  });

  it('completes the assertion before navigating to an authenticated route', async () => {
    window.localStorage.setItem('shopcity:paired-device-id', 'device-locator');
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 202,
      data: {
        data: {
          code: 'DEVICE_ASSERTION_REQUIRED',
          attemptToken: 'ephemeral-token',
          options: {
            challenge: 'AQ',
            rpId: 'localhost',
            allowCredentials: [],
          },
        },
      },
    } as never);
    const credential = {
      id: 'cred',
      rawId: new Uint8Array([1]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([1]).buffer,
        authenticatorData: new Uint8Array([2]).buffer,
        signature: new Uint8Array([3]).buffer,
        userHandle: null,
      },
      getClientExtensionResults: () => ({}),
    };
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get: jest.fn().mockResolvedValue(credential) },
    });
    let complete!: (value: unknown) => void;
    jest.mocked(authControllerCompleteCashierLoginV1).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }) as never,
    );
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'cashier@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'private-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() =>
      expect(authControllerCompleteCashierLoginV1).toHaveBeenCalled(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('shopcity:paired-device-id')).toBe(
      'device-locator',
    );
    expect(window.localStorage.getItem('attemptToken')).toBeNull();
    complete({ status: 200, data: { data: { user: { role: 'CASHIER' } } } });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/cashier'));
    expect(window.localStorage.getItem('private-password')).toBeNull();
  });

  it('shows pairing guidance instead of sending a cashier request when locator is missing', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(/not paired to a register/i)).toBeVisible();
    expect(loginWithCredentials).not.toHaveBeenCalled();
  });

  it('does not navigate when assertion completion fails', async () => {
    window.localStorage.setItem('shopcity:paired-device-id', 'device-locator');
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 202,
      data: {
        data: {
          code: 'DEVICE_ASSERTION_REQUIRED',
          attemptToken: 'short-lived',
          options: { challenge: 'AQ', rpId: 'localhost' },
        },
      },
    } as never);
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get: jest
          .fn()
          .mockRejectedValue(
            Object.assign(new Error(), { name: 'NotAllowedError' }),
          ),
      },
    });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(/cancelled or timed out/i)).toBeVisible();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('short-lived')).toBeNull();
  });

  it('preserves Admin and Supervisor password login navigation from the backend role', async () => {
    jest.mocked(loginWithCredentials).mockResolvedValue({
      status: 200,
      data: { data: { user: { role: 'SUPERVISOR' } } },
    } as never);
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('radio', { name: 'Supervisor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/supervisor'),
    );
  });
});
