'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { completePasswordRecovery } from '../../lib/api';
import { Button, Input } from '../ui';

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};
type FormStatus =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'invalid'
  | 'error'
  | 'support'
  | 'success';

function readErrorCode(data: Record<string, unknown>): string | undefined {
  const error = data.error;
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

function readRequestId(data: Record<string, unknown>): string | undefined {
  const meta = data.meta;
  if (!meta || typeof meta !== 'object') return undefined;
  const requestId = (meta as Record<string, unknown>).requestId;
  return typeof requestId === 'string' ? requestId : undefined;
}

export function ResetPasswordForm() {
  const passwordId = useId();
  const confirmId = useId();
  const tokens = useRef<RecoveryTokens | null>(null);
  const [status, setStatus] = useState<FormStatus>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Preparing your password reset…');

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const fragment = new URLSearchParams(currentUrl.hash.slice(1));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    const type = fragment.get('type');

    // Remove the one-time credentials before rendering the reset form or making requests.
    window.history.replaceState(
      window.history.state,
      '',
      `${currentUrl.pathname}${currentUrl.search}`,
    );

    if (type === 'recovery' && accessToken && refreshToken) {
      tokens.current = { accessToken, refreshToken };
      setStatus('ready');
      setMessage('Choose a new password for your ShopCity account.');
      return;
    }

    tokens.current = null;
    setStatus('invalid');
    setMessage(
      'This password-recovery link is invalid or expired. Request a new link.',
    );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tokens.current) {
      setStatus('invalid');
      setMessage(
        'This password-recovery link is invalid or expired. Request a new link.',
      );
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('The passwords do not match.');
      return;
    }

    setStatus('submitting');
    setMessage('Updating your password…');
    try {
      const response = await completePasswordRecovery({
        ...tokens.current,
        type: 'recovery',
        password,
      });
      if (response.status === 200) {
        tokens.current = null;
        setPassword('');
        setConfirmPassword('');
        setStatus('success');
        setMessage(
          'Your password has been updated. Sign in with your new password.',
        );
        return;
      }

      const code = readErrorCode(response.data);
      if (code === 'PASSWORD_POLICY_UNMET') {
        setStatus('ready');
        setMessage('Choose a password that meets the password requirements.');
      } else if (code === 'PASSWORD_RECOVERY_LINK_INVALID') {
        tokens.current = null;
        setStatus('invalid');
        setMessage(
          'This password-recovery link is invalid or expired. Request a new link.',
        );
      } else if (code === 'PASSWORD_RECOVERY_FINALIZATION_FAILED') {
        tokens.current = null;
        setStatus('support');
        const requestId = readRequestId(response.data);
        setMessage(
          `Your password was changed, but ShopCity could not safely close existing sessions. Contact an administrator before signing in${requestId ? ` (reference: ${requestId})` : ''}.`,
        );
      } else {
        setStatus('error');
        setMessage(
          'We could not update your password right now. Try again shortly.',
        );
      }
    } catch {
      setStatus('error');
      setMessage(
        'We could not update your password right now. Try again shortly.',
      );
    } finally {
      setPassword('');
      setConfirmPassword('');
    }
  }

  const canSubmit = status === 'ready' || status === 'error';

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="login-form"
      data-od-id="reset-password-form"
      aria-busy={status === 'loading' || status === 'submitting'}
    >
      {canSubmit && (
        <>
          <div className="login-field">
            <label htmlFor={passwordId}>New Password</label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="login-field">
            <label htmlFor={confirmId}>Confirm New Password</label>
            <Input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <Button type="submit" data-od-id="complete-password-reset">
            Update Password
          </Button>
        </>
      )}
      <p
        className={`login-notice${status === 'error' || status === 'invalid' || status === 'support' ? ' is-error' : ''}`}
        role={
          status === 'error' || status === 'invalid' || status === 'support'
            ? 'alert'
            : 'status'
        }
        aria-live="polite"
      >
        {message}
      </p>
      {(status === 'success' || status === 'invalid') && (
        <Link className="login-forgot" href="/login">
          Back to sign in
        </Link>
      )}
    </form>
  );
}
