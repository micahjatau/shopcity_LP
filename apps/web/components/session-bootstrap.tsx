'use client';

import { useEffect, useState } from 'react';

export function SessionBootstrap() {
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'unauthenticated' | 'error'
  >('loading');

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const response = await fetch('/auth/me', { credentials: 'include' });
        if (ignore) {
          return;
        }

        if (response.ok) {
          setStatus('ready');
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setStatus('unauthenticated');
          return;
        }

        setStatus('error');
      } catch {
        if (!ignore) {
          setStatus('error');
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  const label =
    status === 'loading'
      ? 'Checking session…'
      : status === 'ready'
        ? 'Session ready'
        : status === 'unauthenticated'
          ? 'Sign in required'
          : 'Session check unavailable';

  return <p data-status={status}>{label}</p>;
}
