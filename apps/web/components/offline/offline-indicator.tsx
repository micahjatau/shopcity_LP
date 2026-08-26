'use client';

import { useEffect, useState } from 'react';
import {
  getConnectivityState,
  subscribeConnectivityState,
  type ConnectivityState,
} from '../../lib/browser/connectivity';

export function OfflineIndicator() {
  const [state, setState] = useState<ConnectivityState>(getConnectivityState());

  useEffect(() => {
    return subscribeConnectivityState(setState);
  }, []);

  if (
    state !== 'offline' &&
    state !== 'synchronizing' &&
    state !== 'sync-failed'
  ) {
    return null;
  }

  return (
    <aside
      style={{
        borderRadius: 'var(--sc-radius-lg)',
        padding: 'var(--sc-spacing-4)',
        background: 'var(--sc-color-danger-surface)',
        color: 'var(--sc-color-danger-strong)',
        border: '1px solid var(--sc-color-danger-border)',
      }}
    >
      <strong>{state === 'sync-failed' ? 'Sync failed' : 'Offline'}</strong>
      <p style={{ margin: 'var(--sc-spacing-2) 0 0' }}>
        {state === 'offline'
          ? 'Transactions saved locally will sync when the connection returns.'
          : 'Local records are being synchronized with the server.'}
      </p>
    </aside>
  );
}
