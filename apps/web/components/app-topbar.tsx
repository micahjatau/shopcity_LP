import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import {
  getConnectivityState,
  initializeConnectivityTracking,
  subscribeConnectivityState,
  type ConnectivityState,
} from '../lib/browser/connectivity';
import { GlobalShellSearch } from './global-shell-search';

const connectivityLabels: Record<ConnectivityState, string> = {
  online: 'Browser online',
  'connection-unstable': 'Connection unstable',
  offline: 'Browser offline',
  synchronizing: 'Sync in progress',
  'sync-failed': 'Sync failed',
};

export type AppTopbarContext = {
  tenant?: { id?: string; name?: string };
  branch?: {
    id?: string;
    name?: string;
    timezone?: string;
    receiptWeekStartDay?: number;
  };
} | null;

export type AppTopbarProps = Readonly<{
  status: 'loading' | 'ready' | 'unauthenticated' | 'error';
  sessionLabel: string | null;
  configMessage: string;
  workspaceLabel: string;
  routeTrailLabel: string;
  deviceLabel: string | null;
  role: 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | null;
  onOpenMobileMenu: () => void;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
}>;

export function AppTopbar({
  sessionLabel,
  workspaceLabel,
  role,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: AppTopbarProps) {
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>(
    getConnectivityState(),
  );

  useEffect(() => {
    const stopTracking = initializeConnectivityTracking();
    return stopTracking;
  }, []);

  useEffect(() => subscribeConnectivityState(setConnectivityState), []);

  const systemStatusLabel = connectivityLabels[connectivityState];

  return (
    <header className="shell-topbar" data-workspace={workspaceLabel}>
      <div className="shell-brand-row">
        <GlobalShellSearch userRole={role} />

        <div
          className={`shell-system-status shell-system-status--${connectivityState}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true" />
          {systemStatusLabel}
        </div>

        <div className="shell-topbar-actions">
          <button
            type="button"
            className="shell-notifications"
            aria-label="Notifications"
            disabled
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
          </button>
          <span className="shell-avatar" role="img" aria-label="Signed in user">
            {sessionLabel?.slice(0, 2).toUpperCase() ?? 'SC'}
          </span>
          <button
            type="button"
            ref={mobileMenuButtonRef}
            className="shell-mobile-menu-button"
            onClick={onOpenMobileMenu}
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
