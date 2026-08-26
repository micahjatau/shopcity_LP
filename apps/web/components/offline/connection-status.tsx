'use client';

import { useEffect, useState } from 'react';
import {
  getConnectivityState,
  initializeConnectivityTracking,
  subscribeConnectivityState,
  type ConnectivityState,
} from '../../lib/browser/connectivity';

const labels: Record<ConnectivityState, string> = {
  online: 'Online',
  'connection-unstable': 'Connection unstable',
  offline: 'Offline',
  synchronizing: 'Synchronizing',
  'sync-failed': 'Sync failed',
};

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectivityState>(getConnectivityState());

  useEffect(() => initializeConnectivityTracking(), []);

  useEffect(() => {
    return subscribeConnectivityState(setState);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: 'var(--sc-radius-full)',
        padding: '6px 12px',
        background:
          state === 'offline' || state === 'sync-failed'
            ? 'var(--sc-color-danger-surface)'
            : 'var(--sc-color-semantic-surfaceSubtle)',
        color:
          state === 'offline' || state === 'sync-failed'
            ? 'var(--sc-color-danger-strong)'
            : 'var(--sc-color-semantic-textSecondary)',
        border: '1px solid var(--sc-color-semantic-borderStrong)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <span aria-hidden="true">
        {state === 'offline' || state === 'sync-failed' ? '●' : '◌'}
      </span>
      <span>{labels[state]}</span>
    </div>
  );
}
