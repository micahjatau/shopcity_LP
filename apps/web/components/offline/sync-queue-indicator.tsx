'use client';

import { useEffect, useState } from 'react';
import {
  getOfflineEarnRecordCount,
  subscribeOfflineQueue,
} from '../../lib/browser/offline-earn-queue';

export function SyncQueueIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const next = await getOfflineEarnRecordCount();
      if (mounted) {
        setCount(next);
      }
    }

    void refresh();
    const unsubscribe = subscribeOfflineQueue(() => {
      void refresh();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (count === 0) {
    return null;
  }

  return (
    <a
      href="/cashier"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '8px 12px',
        borderRadius: 'var(--sc-radius-full)',
        background: 'var(--sc-color-warning-surface)',
        color: 'var(--sc-color-warning-strong)',
        border: '1px solid var(--sc-color-warning-border)',
      }}
    >
      <span aria-hidden="true">↻</span>
      <span>
        Offline — {count} transaction{count === 1 ? '' : 's'} saved locally
      </span>
    </a>
  );
}
