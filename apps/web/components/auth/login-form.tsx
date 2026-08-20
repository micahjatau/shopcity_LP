'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    try {
      const response = await loginWithCredentials({ username, password });
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
      router.refresh();
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
