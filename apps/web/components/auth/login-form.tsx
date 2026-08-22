'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useId, useState } from 'react';
import { loginWithCredentials } from '../../lib/api';
import { Button, Input } from '../ui';

const routeByRole = {
  CASHIER: '/cashier',
  SUPERVISOR: '/supervisor',
  ADMIN: '/admin',
} as const;

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
  const [deviceId, setDeviceId] = useState('');
  const [deviceAttestationSecret, setDeviceAttestationSecret] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDeviceId(window.localStorage.getItem('shopcity:device-id') ?? '');
    setDeviceAttestationSecret(
      window.localStorage.getItem('shopcity:device-attestation-secret') ?? '',
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('shopcity:device-id', deviceId);
    window.localStorage.setItem(
      'shopcity:device-attestation-secret',
      deviceAttestationSecret,
    );
  }, [deviceAttestationSecret, deviceId]);

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

      const role = response.data.data.user.role;
      if (role === 'SYSTEM') {
        setStatus('error');
        setMessage(
          'SYSTEM sessions are not available in the interactive UI. Use a machine-attested session instead.',
        );
        return;
      }

      setStatus('success');
      router.replace(routeByRole[role] ?? '/cashier');
    } catch {
      setStatus('error');
      setMessage('Sign in failed. The session service is unavailable.');
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}
    >
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <label htmlFor={usernameId}>Tenant / email / username</label>
        <Input
          id={usernameId}
          aria-label="Tenant / email / username"
          placeholder="cashier@shopcity.local"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
      </div>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <label htmlFor={passwordId}>Password</label>
        <Input
          id={passwordId}
          aria-label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <label htmlFor="device-id">Device ID</label>
        <Input
          id="device-id"
          aria-label="Device ID"
          placeholder="Optional cashier device ID"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <label htmlFor="device-attestation-secret">Device attestation secret</label>
        <Input
          id="device-attestation-secret"
          aria-label="Device attestation secret"
          placeholder="Paste the device secret for machine-bound sign in"
          value={deviceAttestationSecret}
          onChange={(event) => setDeviceAttestationSecret(event.target.value)}
          autoComplete="off"
        />
      </div>
      <Button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Signing in…' : 'Sign in'}
      </Button>
      <p
        aria-live="polite"
        style={{
          margin: 0,
          minHeight: '1.25rem',
          color:
            status === 'error'
              ? 'var(--sc-color-danger-strong)'
              : 'var(--sc-color-semantic-textSecondary)',
        }}
      >
        {message ?? 'Use your backend-authenticated ShopCity credentials.'}
      </p>
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
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
