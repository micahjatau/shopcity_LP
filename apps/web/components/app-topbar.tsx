import Image from 'next/image';
import Link from 'next/link';
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
  activeSectionLabel,
  routeTrailLabel,
  pageTitle,
  deviceLabel,
  context,
  showProtectedContent,
  onLogout,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: AppTopbarProps) {
  return (
    <header className="shell-topbar">
      <div className="shell-brand-row">
        <Link href="/" className="shell-brand">
          <Image
            src="/brand/shopcity-mark-white.svg"
            alt="ShopCity"
            width={40}
            height={40}
          />
          <div>
            <div className="shell-brand-mark">SHOPCITY</div>
            <div className="shell-brand-subtitle">Loyalty operations</div>
          </div>
        </Link>

        <div className="shell-topbar-actions">
          <p data-status={status} className="shell-session-label">
            {status === 'loading'
              ? 'Checking session…'
              : status === 'ready'
                ? `Session ready${sessionLabel ? ` · ${sessionLabel}` : ''}`
                : status === 'unauthenticated'
                  ? 'Sign in required'
                  : 'Session check unavailable'}
          </p>
          <ConnectionStatus />
          <SyncQueueIndicator />
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

      <div className="shell-context-strip">
        <div className="shell-context-line">
          <strong>{configMessage}</strong>
          <span>
            Session {sessionLabel ?? 'pending'} · {status}
          </span>
          <span>
            {workspaceLabel} · {activeSectionLabel}
          </span>
          <span>
            {deviceLabel ? `Device ${deviceLabel}` : 'Device pending'}
          </span>
        </div>
        <div className="shell-context-line shell-context-line--secondary">
          <span>
            {context?.tenant?.name ?? context?.tenant?.id ?? 'Tenant pending'}
            {context?.branch?.name || context?.branch?.id
              ? ` · ${context.branch?.name ?? context.branch?.id}`
              : ''}
            {context?.branch?.timezone ? ` · ${context.branch.timezone}` : ''}
          </span>
          <span>
            {typeof context?.branch?.receiptWeekStartDay === 'number'
              ? `Receipt week starts ${context.branch.receiptWeekStartDay}`
              : 'Receipt week start pending'}
          </span>
          <span>{routeTrailLabel}</span>
        </div>
      </div>

      <style>{`
        .shell-topbar {
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-3) var(--sc-spacing-4);
        }

        .shell-brand-row {
          display: flex;
          gap: var(--sc-spacing-4);
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          margin: 0 auto;
          max-width: 1440px;
        }

        .shell-brand {
          display: flex;
          gap: var(--sc-spacing-3);
          align-items: center;
          color: inherit;
          text-decoration: none;
        }

        .shell-brand-mark {
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .shell-brand-subtitle,
        .shell-context-label {
          font-size: var(--sc-font-size-sm);
          opacity: 0.86;
        }

        .shell-topbar-actions {
          display: flex;
          gap: var(--sc-spacing-3);
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .shell-session-label {
          margin: 0;
        }

        .shell-signout,
        .shell-mobile-menu-button {
          border-radius: var(--sc-radius-full);
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: var(--sc-color-neutral-0);
          padding: 6px 12px;
        }

        .shell-mobile-menu-button {
          display: none;
        }

        .shell-context-strip {
          display: grid;
          gap: var(--sc-spacing-2);
          max-width: 1440px;
          margin: var(--sc-spacing-3) auto 0;
          padding: var(--sc-spacing-3);
          border-radius: var(--sc-radius-lg);
          background: rgba(255, 255, 255, 0.08);
        }

        .shell-context-line {
          display: flex;
          gap: var(--sc-spacing-3);
          flex-wrap: wrap;
          align-items: center;
        }

        .shell-context-line strong {
          font-size: var(--sc-font-size-sm);
        }

        .shell-context-line--secondary {
          font-size: var(--sc-font-size-sm);
          opacity: 0.92;
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
