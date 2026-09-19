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

      <style>{`
        .shell-topbar {
          height: 64px;
          min-height: 64px;
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-neutral-900);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0 16px;
          margin-bottom: 42px;
        }

        .shell-brand-row {
          display: flex;
          gap: 20px;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .shell-topbar-actions {
          display: flex;
          gap: 20px;
          align-items: center;
          justify-content: flex-end;
        }

        .shell-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: oklch(72% 0.06 55);
          display: grid;
          place-items: center;
          color: var(--sc-color-neutral-0);
          font-weight: 700;
          font-size: 12px;
        }

        .shell-signout,
        .shell-mobile-menu-button {
          border-radius: var(--sc-radius-full);
          border: 1px solid var(--sc-color-brand-700);
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-brand-700);
          padding: 6px 12px;
        }

        .shell-mobile-menu-button {
          display: none;
        }

        .shell-context-strip {
          margin: 0;
          color: var(--sc-color-semantic-textSecondary);
          font-size: 12px;
        }

        @media (max-width: 767px) {
          .shell-topbar {
            height: auto;
            min-height: 64px;
            margin-bottom: 16px;
            padding: 10px 12px;
          }

          .shell-brand-row,
          .shell-topbar-actions {
            gap: 8px;
          }

          .shell-topbar-actions {
            min-width: 0;
          }

          .shell-mobile-menu-button {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
