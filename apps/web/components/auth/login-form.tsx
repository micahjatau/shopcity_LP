'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { loginWithCredentials } from '../../lib/api';
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
  const [deviceId, setDeviceId] = useState('');
  const [deviceAttestationSecret, setDeviceAttestationSecret] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    const headers = await buildDeviceHeaders(deviceId, deviceAttestationSecret);

    try {
      const response = await loginWithCredentials(
        { username, password },
        { headers },
      );
      if (response.status !== 200) {
        setStatus('error');
        setMessage('Sign in failed. Check your credentials and try again.');
        return;
      }

      const role = response.data?.data?.user?.role;
      if (!role) {
        setStatus('error');
        setMessage(
          'Sign in succeeded, but the session response was incomplete. Please try again.',
        );
        return;
      }

      if (role === 'SYSTEM') {
        setStatus('error');
        setMessage(
          'SYSTEM sessions are not available in the interactive UI. Use a machine-attested session instead.',
        );
        return;
      }

      setStatus('success');
      router.replace(routeByRole[role] ?? '/cashier');
      // Re-run the protected shell's session bootstrap after the login cookie
      // has been written by the API proxy.
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Sign in failed. The session service is unavailable.');
    } finally {
      // Raw attestation material must never survive the sign-in attempt in browser state.
      setDeviceAttestationSecret('');
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
        {message ?? 'Use your ShopCity staff credentials.'}
      </p>
      <div className="login-device-fields">
        <label htmlFor="device-id">Device ID</label>
        <Input
          id="device-id"
          aria-label="Device ID"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          autoComplete="off"
        />
        <label htmlFor="device-attestation-secret">
          Device attestation secret
        </label>
        <Input
          id="device-attestation-secret"
          aria-label="Device attestation secret"
          value={deviceAttestationSecret}
          onChange={(event) => setDeviceAttestationSecret(event.target.value)}
          autoComplete="off"
        />
      </div>
    </form>
  );
}

async function buildDeviceHeaders(
  deviceId: string,
  attestationSecret: string,
): Promise<Record<string, string>> {
  const trimmedDeviceId = deviceId.trim();
  const trimmedSecret = attestationSecret.trim();

  if (!trimmedDeviceId || !trimmedSecret) {
    return {};
  }

  const timestamp = Date.now();
  const nonce = globalThis.crypto.randomUUID();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(trimmedSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${trimmedDeviceId}.${timestamp}.${nonce}`),
  );
  const signatureBase64Url = arrayBufferToBase64Url(signature);

  return {
    'x-device-id': trimmedDeviceId,
    'x-device-attestation': `${timestamp}.${nonce}.${signatureBase64Url}`,
  };
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
