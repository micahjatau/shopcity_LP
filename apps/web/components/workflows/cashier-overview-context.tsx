'use client';

import { OfflineIndicator } from '../offline';
import { ScannerContextScope } from '../scanner-context-scope';
import { useSessionBootstrapState } from '../session-bootstrap';
import Link from 'next/link';

export function CashierOverviewContext() {
  const { deviceId, publicConfig, configStatus } = useSessionBootstrapState();
  const branch = publicConfig?.branch;
  const deviceLabel = deviceId ?? 'Device not provisioned';
  const branchLabel = branch?.name ?? branch?.id ?? 'Branch pending';

  return (
    <>
      <ScannerContextScope context="lookup" />
      <section className="cashier-context-strip" aria-label="Cashier context">
        <div className="cashier-context-item">
          <span>Branch</span>
          <strong>{branchLabel}</strong>
          <small>{branch?.timezone ?? 'Timezone pending'}</small>
        </div>
        <div className="cashier-context-item">
          <span>Device</span>
          <strong>{deviceLabel}</strong>
          <small>{deviceId ? 'Session associated' : 'Offline blocked'}</small>
        </div>
        <div className="cashier-context-item">
          <span>Policy</span>
          <strong>
            {configStatus === 'stale'
              ? 'Cached · refreshing'
              : configStatus === 'ready'
                ? 'Ready'
                : 'Pending'}
          </strong>
          <small>Server remains authoritative</small>
        </div>
        <Link href="/cashier/sync" className="cashier-context-sync">
          Open sync queue
        </Link>
      </section>
      <OfflineIndicator />
    </>
  );
}
