'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { requestPasswordRecovery } from '../../lib/api';
import { Button, Input } from '../ui';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ForgotPasswordForm() {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    try {
      const response = await requestPasswordRecovery(email);
      setStatus(response.status === 200 ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const message =
    status === 'success'
      ? 'If the address is associated with a ShopCity account, password-recovery instructions will be sent. Check your inbox and spam folder.'
      : status === 'error'
        ? 'We could not submit your request right now. Please try again shortly.'
        : 'Enter the email address associated with your ShopCity staff account.';

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="login-form"
      data-od-id="forgot-password-form"
      aria-busy={status === 'submitting'}
    >
      <div className="login-field">
        <label htmlFor={emailId}>Email Address</label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === 'submitting' || status === 'success'}
        />
      </div>
      <Button
        type="submit"
        disabled={status === 'submitting' || status === 'success'}
        data-od-id="request-password-reset"
      >
        {status === 'submitting' ? 'Submitting…' : 'Send recovery instructions'}
      </Button>
      <p
        className={`login-notice${status === 'error' ? ' is-error' : ''}`}
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
      <Link className="login-forgot" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
