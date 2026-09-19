import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
  sessionLabel,
  workspaceLabel,
  role,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: AppTopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const username = sessionLabel?.split(' · ').at(-1) ?? 'ShopCity user';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <header className="shell-topbar" data-workspace={workspaceLabel}>
      <div className="shell-brand-row">
        <GlobalShellSearch userRole={role} />

        <div className="shell-topbar-actions">
          <div className="shell-notifications">
            <button
              type="button"
              className="shell-icon-button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="shell-notifications-panel"
              onClick={() => setNotificationsOpen((current) => !current)}
            >
              <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
            {notificationsOpen ? (
              <div
                id="shell-notifications-panel"
                className="shell-notifications-panel"
                role="status"
              >
                <strong>Notifications</strong>
                <p>
                  An in-app notification inbox is not available in this release.
                </p>
              </div>
            ) : null}
          </div>
          <Link
            href="/profile"
            className="shell-avatar"
            aria-label="View user profile"
            title="View user profile"
          >
            {initials || 'SC'}
          </Link>
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
          gap: 16px;
          align-items: center;
          justify-content: flex-end;
          flex: none;
        }
        .shell-notifications { position: relative; }
        .shell-icon-button { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 50%; background: transparent; color: var(--sc-color-neutral-900); cursor: pointer; }
        .shell-icon-button:hover, .shell-icon-button:focus-visible { background: var(--sc-color-neutral-50); }
        .shell-notifications-panel { position: absolute; right: 0; top: calc(100% + 12px); z-index: 10; width: min(280px, 78vw); padding: 16px; border: 1px solid var(--sc-color-semantic-border); border-radius: 16px; background: var(--sc-color-neutral-0); box-shadow: var(--sc-shadow-level2); font-size: 13px; }
        .shell-notifications-panel p { margin: 8px 0 0; white-space: normal; color: var(--sc-color-semantic-textSecondary); }

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
          text-decoration: none;
          flex: none;
        }
        .shell-avatar:hover, .shell-avatar:focus-visible { outline: 2px solid var(--sc-color-brand-700); outline-offset: 3px; }

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

          .shell-topbar-actions { gap: 8px; }

          .shell-mobile-menu-button {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
