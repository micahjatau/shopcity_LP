'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  bootstrapSession,
  configurationControllerGetPublicConfigV1,
  type ConfigurationControllerGetPublicConfigV1200Data,
} from '../lib/api';
import { createApiRequest } from '../lib/api/request';

export type SessionBootstrapStatus =
  'loading' | 'ready' | 'unauthenticated' | 'error';

export type ConfigBootstrapStatus =
  'loading' | 'ready' | 'stale' | 'unavailable';

export type SessionRole = 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | 'SYSTEM';

export type SessionBootstrapState = {
  status: SessionBootstrapStatus;
  role: SessionRole | null;
  userId: string | null;
  branchId: string | null;
  deviceId: string | null;
  sessionLabel: string | null;
  publicConfig: ConfigurationControllerGetPublicConfigV1200Data | null;
  configStatus: ConfigBootstrapStatus;
  configMessage: string;
};

const initialState: SessionBootstrapState = {
  status: 'loading',
  role: null,
  userId: null,
  branchId: null,
  deviceId: null,
  sessionLabel: null,
  publicConfig: null,
  configStatus: 'loading',
  configMessage: 'Loading public context…',
};

type CachedConfig = {
  data: ConfigurationControllerGetPublicConfigV1200Data;
  fetchedAt: number;
};

const CONFIG_FRESHNESS_MS = 5 * 60 * 1000;
const CONFIG_STALE_WINDOW_MS = 30 * 60 * 1000;
const configCache = new Map<string, CachedConfig>();
const configRequests = new Map<
  string,
  Promise<ConfigurationControllerGetPublicConfigV1200Data>
>();

type SessionBootstrapContextValue = {
  state: SessionBootstrapState;
  reset: () => void;
};

const SessionBootstrapContext =
  createContext<SessionBootstrapContextValue | null>(null);

function configCacheKey(userId: string | null, branchId: string | null) {
  // The current auth response exposes branch but not tenant. Scoping by the
  // backend-owned user and branch prevents cross-session tenant leakage.
  return `${userId ?? 'anonymous'}:${branchId ?? 'unassigned'}`;
}

export function invalidatePublicConfigCache(scope?: {
  userId?: string | null;
  branchId?: string | null;
}) {
  if (!scope) {
    configCache.clear();
    return;
  }
  configCache.delete(
    configCacheKey(scope.userId ?? null, scope.branchId ?? null),
  );
}

async function loadPublicConfig(
  userId: string | null,
  branchId: string | null,
  setState: React.Dispatch<React.SetStateAction<SessionBootstrapState>>,
) {
  const key = configCacheKey(userId, branchId);
  const cached = configCache.get(key);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;

  if (cached && age <= CONFIG_FRESHNESS_MS) {
    setState((current) => ({
      ...current,
      publicConfig: cached.data,
      configStatus: 'ready',
      configMessage: 'Public context loaded from the session cache.',
    }));
    return;
  }

  if (cached && age <= CONFIG_STALE_WINDOW_MS) {
    setState((current) => ({
      ...current,
      publicConfig: cached.data,
      configStatus: 'stale',
      configMessage: 'Using cached public context while refreshing.',
    }));
  } else {
    setState((current) => ({
      ...current,
      publicConfig: null,
      configStatus: 'loading',
      configMessage: 'Loading public context…',
    }));
  }

  try {
    let request = configRequests.get(key);
    if (!request) {
      request = (async () => {
        const response =
          await configurationControllerGetPublicConfigV1(createApiRequest());
        if (response.status !== 200) {
          throw new Error(`Public context unavailable (${response.status}).`);
        }
        return response.data.data;
      })();
      configRequests.set(key, request);
      void request.finally(() => configRequests.delete(key));
    }

    const data = await request;
    configCache.set(key, { data, fetchedAt: Date.now() });
    setState((current) => ({
      ...current,
      publicConfig: data,
      configStatus: 'ready',
      configMessage: 'Public context loaded.',
    }));
  } catch {
    setState((current) => ({
      ...current,
      configStatus: cached ? 'stale' : 'unavailable',
      configMessage: cached
        ? 'Public context is stale; refresh could not complete.'
        : 'Public context unavailable.',
    }));
  }
}

async function loadSessionState(
  setState: React.Dispatch<React.SetStateAction<SessionBootstrapState>>,
) {
  try {
    const session = await bootstrapSession();
    if (!session) {
      setState({
        ...initialState,
        status: 'unauthenticated',
        configStatus: 'unavailable',
        configMessage: 'Public context pending until sign-in.',
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: 'ready',
      role: session.user.role,
      userId: session.user.id,
      branchId: session.user.branchId,
      deviceId: session.session.deviceId,
      sessionLabel: `${session.user.role} · ${session.user.username}`,
    }));
    await loadPublicConfig(session.user.id, session.user.branchId, setState);
  } catch {
    setState({
      ...initialState,
      status: 'error',
      configStatus: 'unavailable',
      configMessage: 'Session check unavailable.',
    });
  }
}

function useStandaloneSessionBootstrapState(
  refreshKey: string | number = 0,
  enabled = true,
) {
  const [state, setState] = useState<SessionBootstrapState>(initialState);

  useEffect(() => {
    if (!enabled) return;
    setState(initialState);
    void loadSessionState(setState);
  }, [enabled, refreshKey]);

  return state;
}

export function useSessionBootstrapState(refreshKey: string | number = 0) {
  const context = useContext(SessionBootstrapContext);
  const standaloneState = useStandaloneSessionBootstrapState(
    refreshKey,
    context === null,
  );
  return context
    ? { ...context.state, reset: context.reset }
    : { ...standaloneState, reset: () => undefined };
}

export function SessionBootstrapProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<SessionBootstrapState>(initialState);
  const reset = useCallback(() => {
    setState({ ...initialState });
  }, []);

  useEffect(() => {
    void loadSessionState(setState);
  }, []);

  return (
    <SessionBootstrapContext.Provider value={{ state, reset }}>
      {children}
    </SessionBootstrapContext.Provider>
  );
}

export function SessionBootstrap() {
  const { status, sessionLabel, configStatus } = useSessionBootstrapState();

  const label =
    status === 'loading'
      ? 'Checking session…'
      : status === 'ready'
        ? `Session ready${sessionLabel ? ` · ${sessionLabel}` : ''}`
        : status === 'unauthenticated'
          ? 'Sign in required'
          : 'Session check unavailable';

  return (
    <p data-config-status={configStatus} data-status={status}>
      {label}
    </p>
  );
}
