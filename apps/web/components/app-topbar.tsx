import type { RefObject } from 'react';
import { GlobalShellSearch } from './global-shell-search';

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
  status,
  sessionLabel,
  configMessage,
  workspaceLabel,
  deviceLabel,
  role,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: AppTopbarProps) {
  return (
    <header className="shell-topbar" data-workspace={workspaceLabel}>
      <div className="shell-brand-row">
        <GlobalShellSearch userRole={role} />

        <div className="shell-topbar-actions">
          <p data-status={status} className="shell-session-label sr-only">
            {status === 'loading'
              ? 'Checking session…'
              : status === 'ready'
                ? `Session ready${sessionLabel ? ` · ${sessionLabel}` : ''}`
                : status === 'unauthenticated'
                  ? 'Sign in required'
                  : 'Session check unavailable'}
          </p>
          <p className="sr-only">
            {deviceLabel ? `Device ${deviceLabel}` : 'Device pending'}
          </p>

          <span
            className="shell-avatar"
            aria-label={sessionLabel ?? 'Signed in user'}
          >
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
