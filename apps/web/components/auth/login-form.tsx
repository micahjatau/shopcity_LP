'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { loginWithCredentials } from '../../lib/api';
import { authControllerCompleteCashierLoginV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  serializeCredential,
  toCredentialRequestOptions,
} from '../../lib/webauthn-json';
import { Button, Input } from '../ui';

const routeByRole = {
  CASHIER: '/cashier',
  SUPERVISOR: '/supervisor',
  ADMIN: '/admin',
} as const;
const loginRoles = [
  [
    'CASHIER',
    'Cashier / Loyalty Staff',
    'Register, capture receipts and redeem credit at the till.',
  ],
  [
    'SUPERVISOR',
    'Supervisor',
    'Approve high-value receipts, late claims and OTP overrides.',
  ],
  [
    'ADMIN',
    'Administrator',
    'Programme configuration, wallet, campaigns and audit.',
  ],
] as const;
const pairedDeviceKey = 'shopcity:paired-device-id';

export function LoginForm() {
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);
    try {
      const deviceId =
        selectedRole === 'CASHIER'
          ? window.localStorage.getItem(pairedDeviceKey)
          : null;
      if (selectedRole === 'CASHIER' && !deviceId) {
        setStatus('error');
        setMessage(
          'This browser is not paired to a register. Ask a Supervisor or Admin to pair this POS, then try again.',
        );
        return;
      }
      const response = await loginWithCredentials(
        { username, password },
        { headers: deviceId ? { 'x-device-id': deviceId } : {} },
      );
      let authenticated = response.status === 200 ? response.data : null;
      if (response.status === 202) {
        const data = (response.data as { data?: Record<string, unknown> }).data;
        if (
          data?.code !== 'DEVICE_ASSERTION_REQUIRED' ||
          typeof data.attemptToken !== 'string' ||
          !data.options
        ) {
          throw new Error('Invalid assertion response');
        }
        if (!navigator.credentials?.get) {
          setStatus('error');
          setMessage(
            'This browser does not support register security keys. Use a supported POS browser or contact your Supervisor.',
          );
          return;
        }
        const assertion = await navigator.credentials.get({
          publicKey: toCredentialRequestOptions(
            data.options as Record<string, unknown>,
          ),
        });
        if (!assertion) {
          setStatus('error');
          setMessage(
            'Security-key sign-in was cancelled. Try again or ask your Supervisor to re-pair this POS.',
          );
          return;
        }
        const completion = await authControllerCompleteCashierLoginV1(
          {
            attemptToken: data.attemptToken,
            assertion: serializeCredential(assertion as PublicKeyCredential),
          },
          createApiRequest(),
        );
        if (completion.status !== 200) {
          setStatus('error');
          setMessage(
            'Register sign-in expired or is no longer valid. Ask your Supervisor to check the pairing and try again.',
          );
          return;
        }
        authenticated = completion.data;
      }
      if (response.status !== 200 && response.status !== 202) {
        setStatus('error');
        setMessage(
          'Sign in failed. Check your credentials and register pairing, then try again.',
        );
        return;
      }
      const role = authenticated?.data?.user?.role;
      if (!role || role === 'SYSTEM') {
        setStatus('error');
        setMessage(
          'Sign in could not be completed. Contact your administrator.',
        );
        return;
      }
      setStatus('success');
      router.replace(routeByRole[role] ?? '/cashier');
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Security-key sign-in was cancelled or timed out. Try again, or ask your Supervisor to re-pair this POS.'
          : 'Sign in failed. The session service is unavailable or the register pairing expired.',
      );
    } finally {
      setPassword('');
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="login-form"
      data-od-id="login-form"
    >
      <fieldset className="login-role-list" data-od-id="role-selector">
        <legend className="sr-only">Choose a staff account</legend>
        {loginRoles.map(([value, label, detail], index) => {
          const detailId = `role-${value.toLowerCase()}-detail`;
          return (
            <label
              key={value}
              className="login-role-option"
              htmlFor={`role-${value.toLowerCase()}`}
            >
              <input
                id={`role-${value.toLowerCase()}`}
                type="radio"
                name="role"
                value={value}
                aria-label={label}
                aria-describedby={detailId}
                defaultChecked={index === 0}
                onChange={() => setSelectedRole(value)}
              />
              <span>
                <strong>{label}</strong>
                <small id={detailId}>{detail}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="login-field">
        <label htmlFor={usernameId}>Email Address</label>
        <Input
          id={usernameId}
          aria-label="Email Address"
          placeholder="Enter your email address"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
      </div>
      <div className="login-field">
        <label htmlFor={passwordId}>Password</label>
        <div className="login-password-wrap">
          <Input
            id={passwordId}
            aria-label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="login-password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            data-od-id="password-toggle"
          >
            {showPassword ? (
              <Eye aria-hidden="true" size={18} strokeWidth={1.8} />
            ) : (
              <EyeOff aria-hidden="true" size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="login-forgot"
        onClick={() =>
          setMessage(
            'Password reset is managed by your ShopCity administrator.',
          )
        }
        data-od-id="forgot-password"
      >
        Forgot password?
      </button>
      <Button
        type="submit"
        disabled={status === 'submitting'}
        data-od-id="sign-in-cta"
      >
        {status === 'submitting' ? 'Signing in…' : 'Sign In'}
      </Button>
      <p
        className={`login-notice${status === 'error' ? ' is-error' : ''}`}
        aria-live="polite"
      >
        {message ??
          'Cashiers sign in with a paired POS security key. Use your ShopCity staff credentials.'}
      </p>
    </form>
  );
}
