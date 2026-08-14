'use client';

import { useEffect, useState } from 'react';
import { bootstrapSession } from '../lib/api';

export function SessionBootstrap() {
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'unauthenticated' | 'error'
  >('loading');
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const session = await bootstrapSession();
        if (ignore) {
          return;
        }

        if (session) {
          setStatus('ready');
          setSessionLabel(`${session.user.role} · ${session.user.username}`);
          return;
        }

        setStatus('unauthenticated');
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
        ? `Session ready${sessionLabel ? ` · ${sessionLabel}` : ''}`
        : status === 'unauthenticated'
          ? 'Sign in required'
          : 'Session check unavailable';

  return <p data-status={status}>{label}</p>;
}
