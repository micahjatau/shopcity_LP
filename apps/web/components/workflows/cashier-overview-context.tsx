'use client';

import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../offline';
import { ScannerContextScope } from '../scanner-context-scope';
import { useSessionBootstrapState } from '../session-bootstrap';

export function CashierOverviewStatus() {
  return (
    <div
      className="cashier-overview-status"
      aria-label="Cashier operating context"
    >
      <ConnectionStatus />
      <SyncQueueIndicator />
    </div>
  );
}

export function CashierOverviewContext() {
  const { deviceId, publicConfig, configStatus } = useSessionBootstrapState();
  const branch = publicConfig?.branch;
  const deviceLabel = deviceId ?? 'Device not provisioned';
  const branchLabel = branch?.name ?? branch?.id ?? 'Branch pending';

  return (
    <>
      <ScannerContextScope context="lookup" />
      <OfflineIndicator />

      <section className="cashier-context-grid" aria-label="Cashier context">
        <div className="cashier-context-card">
          <span className="cashier-context-label">Branch</span>
          <strong>{branchLabel}</strong>
          <span className="cashier-muted">
            {branch?.timezone ?? 'Timezone pending'}
          </span>
        </div>
        <div className="cashier-context-card">
          <span className="cashier-context-label">Device</span>
          <strong>{deviceLabel}</strong>
          <span className="cashier-muted">
            {deviceId
              ? 'Backend-associated session'
              : 'Offline work is blocked until ready'}
          </span>
        </div>
        <div className="cashier-context-card">
          <span className="cashier-context-label">Policy context</span>
          <strong>
            {configStatus === 'stale'
              ? 'Cached · refreshing'
              : configStatus === 'ready'
                ? 'Ready'
                : 'Pending'}
          </strong>
          <span className="cashier-muted">
            Only active restrictions appear in transaction review.
          </span>
        </div>
      </section>
    </>
  );
}
