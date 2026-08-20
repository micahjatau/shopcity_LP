'use client';

import { useEffect, useState } from 'react';
import { bootstrapSession } from '../lib/api';

export type SessionBootstrapStatus =
  'loading' | 'ready' | 'unauthenticated' | 'error';

export type SessionRole = 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | 'SYSTEM';

export type SessionBootstrapState = {
  status: SessionBootstrapStatus;
  role: SessionRole | null;
  userId: string | null;
  branchId: string | null;
  deviceId: string | null;
  sessionLabel: string | null;
};

export function useSessionBootstrapState(refreshKey: string | number = 0) {
  const [state, setState] = useState<SessionBootstrapState>({
    status: 'loading',
    role: null,
    userId: null,
    branchId: null,
    deviceId: null,
    sessionLabel: null,
  });

  useEffect(() => {
    let ignore = false;
    setState({
      status: 'loading',
      role: null,
      userId: null,
      branchId: null,
      deviceId: null,
      sessionLabel: null,
    });

    async function run() {
      try {
        const session = await bootstrapSession();
        if (ignore) {
          return;
        }

        if (session) {
          setState({
            status: 'ready',
            role: session.user.role,
            userId: session.user.id,
            branchId: session.user.branchId,
            deviceId: session.session.deviceId,
            sessionLabel: `${session.user.role} · ${session.user.username}`,
          });
          return;
        }

        setState({
          status: 'unauthenticated',
          role: null,
          userId: null,
          branchId: null,
          deviceId: null,
          sessionLabel: null,
        });
      } catch {
        if (!ignore) {
          setState({
            status: 'error',
            role: null,
            userId: null,
            branchId: null,
            deviceId: null,
            sessionLabel: null,
          });
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return state;
}

export function SessionBootstrap() {
  const { status, sessionLabel } = useSessionBootstrapState();

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
