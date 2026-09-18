import type { RefObject } from 'react';
import { ConnectionStatus, SyncQueueIndicator } from './offline';

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
  activeSectionLabel: string;
  routeTrailLabel: string;
  pageTitle: string;
  deviceLabel: string | null;
  context: AppTopbarContext;
  showProtectedContent: boolean;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
}>;

export function AppTopbar({
  status,
  sessionLabel,
  configMessage,
  workspaceLabel,

  routeTrailLabel,

  deviceLabel,
  context,
  showProtectedContent,
  onLogout,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: AppTopbarProps) {
  return (
    <header className="shell-topbar" data-workspace={workspaceLabel}>
      <div className="shell-brand-row">
        <label className="shell-search">
          <span aria-hidden="true">⌕</span>
          <input
            readOnly
            aria-label="Current route context"
            value={routeTrailLabel}
            title={`${configMessage} · ${sessionLabel ?? status} · ${deviceLabel ? `Device ${deviceLabel}` : 'Device pending'}`}
          />
        </label>

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
          <span className="shell-online" title={configMessage}>
            <i aria-hidden="true" /> System Online
          </span>
          <ConnectionStatus />
          <SyncQueueIndicator />
          <button
            type="button"
            className="shell-icon-button"
            aria-label="Notifications unavailable"
            disabled
            title="Notifications are not enabled for this pilot"
          >
            ●
          </button>
          <span
            className="shell-avatar"
            aria-label={sessionLabel ?? 'Signed in user'}
          >
            {sessionLabel?.slice(0, 2).toUpperCase() ?? 'SC'}
          </span>
          {showProtectedContent ? (
            <button type="button" onClick={onLogout} className="shell-signout">
              Sign out
            </button>
          ) : null}
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

      <p className="shell-context-strip shell-context-line--secondary">
        {context?.branch?.name ?? context?.branch?.id ?? 'Branch pending'} ·{' '}
        {context?.branch?.timezone ?? 'Timezone pending'} · {routeTrailLabel} ·{' '}
        <span>{deviceLabel ? `Device ${deviceLabel}` : 'Device pending'}</span>
      </p>

      <style>{`
        .shell-topbar {
          height: auto;
          min-height: 64px;
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-neutral-900);
          border: 1px solid var(--sc-color-semantic-border);
          border-radius: 16px;
          display: grid;
          gap: 6px;
          padding: 8px 16px;
          margin-bottom: 42px;
        }

        .shell-brand-row {
          display: flex;
          gap: 20px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          width: 100%;
        }

        .shell-search {
          height: 36px;
          width: min(300px, 40vw);
          border: 1px solid var(--sc-color-semantic-border);
          background: var(--sc-color-neutral-50);
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          color: var(--sc-color-semantic-textSecondary);
          margin-right: auto;
        }

        .shell-search input {
          border: 0;
          outline: 0;
          background: transparent;
          width: 100%;
          color: var(--sc-color-neutral-900);
          font-size: 12px;
        }

        .shell-topbar-actions {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .shell-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--sc-color-success-700);
          background: var(--sc-color-success-50);
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 11px;
        }

        .shell-online i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sc-color-success-600);
        }

        .shell-icon-button {
          width: 38px;
          height: 38px;
          border: 0;
          background: transparent;
          color: var(--sc-color-neutral-900);
          display: grid;
          place-items: center;
          border-radius: 50%;
          opacity: 0.5;
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
          .shell-mobile-menu-button {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
