'use client';

import { useEffect, useState } from 'react';
import {
  getOfflineEarnRecordCount,
  subscribeOfflineQueue,
} from '../../lib/browser/offline-earn-queue';

export function SyncQueueIndicator() {
  const [count, setCount] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const next = await getOfflineEarnRecordCount();
        if (mounted) {
          setCount(next);
          setError(null);
        }
      } catch {
        if (mounted) {
          setCount(null);
          setError('Offline queue unavailable');
        }
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

  if (count === 0 && !error) {
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
        background: error
          ? 'var(--sc-color-danger-surface)'
          : 'var(--sc-color-warning-surface)',
        color: error
          ? 'var(--sc-color-danger-strong)'
          : 'var(--sc-color-warning-strong)',
        border: error
          ? '1px solid var(--sc-color-danger-border)'
          : '1px solid var(--sc-color-warning-border)',
      }}
    >
      <span aria-hidden="true">↻</span>
      <span>
        {error ??
          `Offline — ${count ?? 0} transaction${count === 1 ? '' : 's'} saved locally`}
      </span>
    </a>
  );
}
