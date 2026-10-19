'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import {
  createLocalCashierTestSession,
  loginWithCredentials,
} from '../../lib/api';
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
const pairedDeviceKey = 'shopcity:paired-device-id';

function readLoginFailure(value: unknown): {
  code?: string;
  requestId?: string;
} {
  if (!value || typeof value !== 'object') return {};
  const root = value as Record<string, unknown>;
  const response =
    root.response && typeof root.response === 'object'
      ? (root.response as Record<string, unknown>)
      : undefined;
  const body =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
  const responseBody =
    response?.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>)
      : undefined;
  const envelope = responseBody ?? body;
  const error =
    envelope.error && typeof envelope.error === 'object'
      ? (envelope.error as Record<string, unknown>)
      : undefined;
  const meta =
    envelope.meta && typeof envelope.meta === 'object'
      ? (envelope.meta as Record<string, unknown>)
      : undefined;
  return {
    code: typeof error?.code === 'string' ? error.code : undefined,
    requestId: typeof meta?.requestId === 'string' ? meta.requestId : undefined,
  };
}

function loginFailureMessage(value: unknown, statusCode?: number): string {
  const { code, requestId } = readLoginFailure(value);
  const message =
    code === 'RATE_LIMITED' || statusCode === 429
      ? 'Too many sign-in attempts. Wait a moment and try again.'
      : statusCode === 0
        ? 'The sign-in service could not be reached. Try again shortly.'
        : 'Sign in failed. Check your credentials and contact your administrator if the problem continues.';
  return requestId ? `${message} Reference: ${requestId}.` : message;
}

export function LoginForm() {
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const localCashierTestSessionVisible =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_CASHIER_TEST_SESSION_ENABLED === 'true';
  const legacyDeviceAuthEnabled =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SHOPCITY_LEGACY_DEVICE_AUTH_ENABLED === 'true';

  async function handleLocalCashierTestSession() {
    if (!username.trim()) {
      setStatus('error');
      setMessage('Enter the local cashier email to start a test session.');
      return;
    }

    setStatus('submitting');
    setMessage(null);
    try {
      const response = await createLocalCashierTestSession(username.trim());
      const role = response.data?.data?.user?.role;
      if (response.status !== 200 || role !== 'CASHIER') {
        throw new Error('Local test session unavailable');
      }
      setStatus('success');
      setPassword('');
      router.replace('/cashier');
      router.refresh();
    } catch {
      setStatus('error');
      setMessage(
        'Local test session unavailable. Confirm the local-only backend opt-in and an active cashier account.',
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);
    try {
      const legacyDeviceId = legacyDeviceAuthEnabled
        ? window.localStorage.getItem(pairedDeviceKey)
        : null;
      const response = await loginWithCredentials(
        { username, password },
        {
          headers: legacyDeviceId ? { 'x-device-id': legacyDeviceId } : {},
        },
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
          setMessage(loginFailureMessage(completion.data, completion.status));
          return;
        }
        authenticated = completion.data;
      }
      if (response.status !== 200 && response.status !== 202) {
        setStatus('error');
        setMessage(loginFailureMessage(response.data, response.status));
        return;
      }
      const role = authenticated?.data?.user?.role;
      const destination =
        typeof role === 'string'
          ? routeByRole[role as keyof typeof routeByRole]
          : undefined;
      if (!destination) {
        setStatus('error');
        setMessage(
          'Sign in could not be completed. Contact your administrator.',
        );
        return;
      }
      setStatus('success');
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Security-key sign-in was cancelled or timed out. Try again, or ask your Supervisor to re-pair this POS.'
          : loginFailureMessage(error),
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
      <p className="login-role-guidance">
        Your ShopCity account determines your workspace and access.
      </p>
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
            'Need a password reset? Contact your ShopCity administrator for help.',
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
      {localCashierTestSessionVisible && (
        <div className="login-dev-cashier-session">
          <Button
            type="button"
            disabled={status === 'submitting'}
            onClick={() => void handleLocalCashierTestSession()}
            data-od-id="local-cashier-test-session"
          >
            Start local cashier test session
          </Button>
          <small>
            Local test data only; uses an unpaired test POS and expires after
            one hour.
          </small>
        </div>
      )}
      <p
        className={`login-notice${status === 'error' ? ' is-error' : ''}`}
        aria-live="polite"
      >
        {message ?? 'Sign in with your ShopCity staff credentials.'}
      </p>
    </form>
  );
}
