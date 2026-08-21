'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserStateBootstrap } from './browser-state-bootstrap';
import { useSessionBootstrapState } from './session-bootstrap';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from './offline';
import {
  getOfflineEarnRecordCount,
  subscribeOfflineQueue,
} from '../lib/browser/offline-earn-queue';
import { Badge } from './ui';
import {
  getActiveShellNavigationSection,
  getShellNavigationSections,
  getShellNavigationTrail,
  getShellPrimaryRoute,
  getShellWorkspaceLabel,
  matchShellRoute,
} from './shell-navigation';
import {
  logoutSession,
  configurationControllerGetPublicConfigV1,
  type ConfigurationControllerGetPublicConfigV1200Data,
} from '../lib/api';
import { createApiRequest } from '../lib/api/request';

type PublicConfig = ConfigurationControllerGetPublicConfigV1200Data;

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, sessionLabel } = useSessionBootstrapState(
    pathname ?? 0,
  );
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [configMessage, setConfigMessage] = useState('Loading public context…');
  const [syncQueueCount, setSyncQueueCount] = useState<number | null>(null);
  const [syncQueueError, setSyncQueueError] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPublicConfig() {
      try {
        const response =
          await configurationControllerGetPublicConfigV1(createApiRequest());

        if (ignore) return;

        if (response.status === 200) {
          setPublicConfig(response.data.data);
          setConfigMessage('Public context loaded.');
          return;
        }

        setPublicConfig(null);
        setConfigMessage(`Public context unavailable (${response.status}).`);
      } catch {
        if (!ignore) {
          setPublicConfig(null);
          setConfigMessage('Public context unavailable.');
        }
      }
    }

    void loadPublicConfig();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function refreshSyncQueueCount() {
      try {
        const count = await getOfflineEarnRecordCount();
        if (mounted) {
          setSyncQueueCount(count);
          setSyncQueueError(null);
        }
      } catch {
        if (mounted) {
          setSyncQueueCount(null);
          setSyncQueueError('Offline queue unavailable');
        }
      }
    }

    void refreshSyncQueueCount();
    const unsubscribe = subscribeOfflineQueue(() => {
      void refreshSyncQueueCount();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const sections = useMemo(
    () => getShellNavigationSections(role, status),
    [role, status],
  );
  const navigationSections = useMemo(() => {
    if (status !== 'ready' || role !== 'CASHIER') {
      return sections;
    }

    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === 'cashier-sync'
          ? {
              ...item,
              badge:
                syncQueueError !== null
                  ? {
                      label: 'Unavailable',
                      tone: 'danger' as const,
                      title: syncQueueError,
                    }
                  : typeof syncQueueCount === 'number' && syncQueueCount > 0
                    ? {
                        label: String(syncQueueCount),
                        tone: 'warning' as const,
                        title: `${syncQueueCount} offline transaction${syncQueueCount === 1 ? '' : 's'} waiting to sync`,
                      }
                    : undefined,
            }
          : item,
      ),
    }));
  }, [role, sections, status, syncQueueCount, syncQueueError]);
  const primaryRoute = getShellPrimaryRoute(role, status);
  const isAuthorizedRoute =
    status === 'ready' &&
    role !== 'SYSTEM' &&
    sections.some((section) =>
      section.items.some((item) => matchShellRoute(pathname, item)),
    );
  const activeSection = getActiveShellNavigationSection(pathname, sections);
  const navigationTrail = getShellNavigationTrail(pathname, sections);
  const workspaceLabel = getShellWorkspaceLabel(role, status);
  const routeTrailLabel =
    navigationTrail.labels.length > 0
      ? navigationTrail.labels.join(' · ')
      : 'Route pending';
  const pageTitle = `${
    navigationTrail.labels.length > 0
      ? navigationTrail.labels.join(' · ')
      : workspaceLabel
  } · ShopCity`;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'ready' && role === 'SYSTEM') {
      router.replace('/login');
      return;
    }

    if (status === 'ready' && sections.length > 0 && !isAuthorizedRoute) {
      router.replace(primaryRoute);
    }
  }, [isAuthorizedRoute, primaryRoute, role, router, sections.length, status]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return undefined;
    }

    mobileCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavigationOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavigationOpen]);

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const showProtectedContent = status === 'ready' && isAuthorizedRoute;
  const context = publicConfig as {
    tenant?: { id?: string; name?: string };
    branch?: {
      id?: string;
      name?: string;
      timezone?: string;
      receiptWeekStartDay?: number;
    };
    policies?: {
      defaultEarnRateBps?: number;
      minRedemptionKobo?: number;
      maxRedemptionBasketPercent?: number;
      purchaseFlagThresholdKobo?: number;
      purchaseApprovalThresholdKobo?: number;
      redemptionApprovalThresholdKobo?: number;
      offlineRedemptionDisabled?: boolean;
    };
  } | null;

  return (
    <div className="shell-root">
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
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="shell-signout"
              >
                Sign out
              </button>
            ) : null}
            <button
              type="button"
              className="shell-mobile-menu-button"
              onClick={() => setMobileNavigationOpen(true)}
            >
              Menu
            </button>
          </div>
        </div>

        <div className="shell-context-grid">
          <div className="shell-context-card">
            <p className="shell-context-label">Shell context</p>
            <strong>{configMessage}</strong>
            <div className="shell-context-meta">
              Session {sessionLabel ?? 'pending'} · {status}
            </div>
          </div>
          <div className="shell-context-card">
            <p className="shell-context-label">Workspace</p>
            <strong>{workspaceLabel}</strong>
            <div className="shell-context-meta">
              {activeSection?.label ?? 'Section pending'}
            </div>
            <div className="shell-context-meta">{routeTrailLabel}</div>
            <div className="shell-context-meta">{pageTitle}</div>
          </div>
          <div className="shell-context-card">
            <p className="shell-context-label">Branch and policy</p>
            <strong>
              {context?.branch?.name ?? context?.branch?.id ?? 'Loading…'}
            </strong>
            <div className="shell-context-meta">
              {context?.tenant?.name ?? context?.tenant?.id ?? 'Tenant pending'}
              {context?.branch?.timezone ? ` · ${context.branch.timezone}` : ''}
            </div>
            <div className="shell-context-meta">
              {typeof context?.branch?.receiptWeekStartDay === 'number'
                ? `Receipt week starts ${context.branch.receiptWeekStartDay}`
                : 'Receipt week start pending'}
              {typeof context?.policies?.offlineRedemptionDisabled === 'boolean'
                ? context.policies.offlineRedemptionDisabled
                  ? ' · Offline redemption disabled'
                  : ' · Offline redemption available'
                : ''}
            </div>
            <div className="shell-context-meta">
              {typeof context?.policies?.defaultEarnRateBps === 'number'
                ? `${context.policies.defaultEarnRateBps / 100}% earn rate`
                : 'Policy values pending'}
              {typeof context?.policies?.minRedemptionKobo === 'number'
                ? ` · Min redemption ₦${(context.policies.minRedemptionKobo / 100).toLocaleString()}`
                : ''}
            </div>
          </div>
        </div>
      </header>

      <div className="shell-body">
        <aside className="shell-sidebar" aria-label="Primary navigation">
          <div className="shell-sidebar-brand">
            <Image
              src="/brand/shopcity-mark-white.svg"
              alt="ShopCity"
              width={28}
              height={28}
            />
            <div>
              <div className="shell-sidebar-brand-title">ShopCity</div>
              <div className="shell-sidebar-brand-subtitle">{workspaceLabel}</div>
            </div>
          </div>
          <ShellNavigation sections={navigationSections} pathname={pathname} />
          <div className="shell-sidebar-footer">
            <p className="shell-sidebar-footer-label">Branch and device</p>
            <div className="shell-sidebar-footer-meta">
              {context?.branch?.name ?? context?.branch?.id ?? 'Branch pending'}
            </div>
            <div className="shell-sidebar-footer-meta">
              {context?.branch?.timezone ?? 'Timezone pending'}
            </div>
          </div>
        </aside>

        <main className="shell-main">
          <BrowserStateBootstrap />
          <div className="shell-main-status-row">
            {showProtectedContent ? null : (
              <p className="shell-access-message">
                {status === 'ready'
                  ? 'You do not have access to this workspace. Redirecting to your permitted shell.'
                  : 'Sign in to access cashier, supervisor and admin workflows.'}
              </p>
            )}
          </div>
          <OfflineIndicator />
          {showProtectedContent ? (
            children
          ) : (
            <section className="shell-gate-card">
              <h1 style={{ margin: 0 }}>{workspaceLabel}</h1>
              <p className="shell-access-message">
                {status === 'ready'
                  ? 'You do not have access to this workspace. Redirecting to your permitted shell.'
                  : 'Sign in to access cashier, supervisor and admin workflows.'}
              </p>
              <Link href={status === 'ready' ? primaryRoute : '/login'}>
                {status === 'ready' ? 'Go to my workspace' : 'Go to sign in'}
              </Link>
            </section>
          )}
        </main>
      </div>

      {mobileNavigationOpen ? (
        <div className="shell-mobile-overlay" role="presentation">
          <div
            className="shell-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
          >
            <div className="shell-mobile-drawer-header">
              <strong>Navigation</strong>
              <button
                type="button"
                ref={mobileCloseButtonRef}
                onClick={() => setMobileNavigationOpen(false)}
                className="shell-mobile-close"
              >
                Close
              </button>
            </div>
            <ShellNavigation
              sections={navigationSections}
              pathname={pathname}
              onNavigate={() => setMobileNavigationOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .shell-root {
          min-height: 100vh;
          background: var(--sc-color-neutral-50);
          color: var(--sc-color-neutral-900);
        }

        .shell-topbar {
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-4);
        }

        .shell-brand-row {
          display: flex;
          gap: var(--sc-spacing-4);
          align-items: flex-start;
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

        .shell-brand-mark,
        .shell-sidebar-brand-title {
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .shell-brand-subtitle,
        .shell-sidebar-brand-subtitle,
        .shell-context-label,
        .shell-sidebar-footer-label {
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
        .shell-mobile-menu-button,
        .shell-mobile-close {
          border-radius: var(--sc-radius-full);
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: var(--sc-color-neutral-0);
          padding: 6px 12px;
        }

        .shell-mobile-menu-button {
          display: none;
        }

        .shell-context-grid {
          display: grid;
          gap: var(--sc-spacing-3);
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          max-width: 1440px;
          margin: var(--sc-spacing-4) auto 0;
        }

        .shell-context-card {
          border-radius: var(--sc-radius-lg);
          background: rgba(255, 255, 255, 0.08);
          padding: var(--sc-spacing-4);
        }

        .shell-context-meta {
          font-size: var(--sc-font-size-sm);
          opacity: 0.9;
        }

        .shell-body {
          display: grid;
          grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
          gap: var(--sc-spacing-5);
          align-items: start;
          max-width: 1440px;
          margin: 0 auto;
          padding: var(--sc-spacing-6);
        }

        .shell-sidebar {
          position: sticky;
          top: var(--sc-spacing-4);
          display: grid;
          gap: var(--sc-spacing-4);
          border-radius: var(--sc-radius-xl);
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-4);
          box-shadow: var(--sc-shadow-level2);
        }

        .shell-sidebar-brand {
          display: flex;
          align-items: center;
          gap: var(--sc-spacing-3);
        }

        .shell-sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.16);
          padding-top: var(--sc-spacing-3);
        }

        .shell-sidebar-footer-meta {
          font-size: var(--sc-font-size-sm);
          opacity: 0.9;
        }

        .shell-main {
          min-width: 0;
          display: grid;
          gap: var(--sc-spacing-4);
        }

        .shell-main-status-row {
          display: flex;
          gap: var(--sc-spacing-3);
          flex-wrap: wrap;
          align-items: center;
        }

        .shell-access-message {
          margin: 0;
          color: var(--sc-color-semantic-textSecondary);
        }

        .shell-gate-card {
          border-radius: var(--sc-radius-xl);
          background: var(--sc-color-neutral-0);
          border: 1px solid var(--sc-color-semantic-border);
          padding: var(--sc-spacing-6);
          box-shadow: var(--sc-shadow-level1);
          display: grid;
          gap: var(--sc-spacing-3);
        }

        .shell-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(13, 13, 13, 0.52);
          padding: var(--sc-spacing-4);
        }

        .shell-mobile-drawer {
          display: grid;
          gap: var(--sc-spacing-4);
          width: min(100%, 360px);
          max-height: 100%;
          overflow: auto;
          border-radius: var(--sc-radius-xl);
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-4);
          box-shadow: var(--sc-shadow-level3);
        }

        .shell-mobile-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--sc-spacing-3);
        }

        @media (max-width: 767px) {
          .shell-topbar {
            padding-bottom: 0;
          }

          .shell-brand-row {
            gap: var(--sc-spacing-3);
          }

          .shell-mobile-menu-button {
            display: inline-flex;
          }

          .shell-body {
            grid-template-columns: minmax(0, 1fr);
            padding-top: var(--sc-spacing-4);
          }

          .shell-sidebar {
            display: none;
          }
        }

        @media (min-width: 768px) and (max-width: 1199px) {
          .shell-body {
            grid-template-columns: 208px minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

function ShellNavigation({
  sections,
  pathname,
  onNavigate,
}: Readonly<{
  sections: ReturnType<typeof getShellNavigationSections>;
  pathname: string | null;
  onNavigate?: () => void;
}>) {
  return (
    <nav aria-label="Primary navigation" className="shell-nav">
      {sections.map((section) => (
        <section key={section.id} className="shell-nav-section">
          <p className="shell-nav-section-label">{section.label}</p>
          <ul className="shell-nav-list">
            {section.items.map((item) => {
              const active = matchShellRoute(pathname, item);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`shell-nav-link${active ? ' is-active' : ''}`}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <Badge
                        tone={item.badge.tone ?? 'neutral'}
                        title={item.badge.title}
                        className="shell-nav-badge"
                      >
                        {item.badge.label}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <style jsx>{`
        .shell-nav {
          display: grid;
          gap: var(--sc-spacing-4);
        }

        .shell-nav-section {
          display: grid;
          gap: var(--sc-spacing-2);
        }

        .shell-nav-section-label {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          opacity: 0.78;
        }

        .shell-nav-list {
          list-style: none;
          display: grid;
          gap: var(--sc-spacing-2);
          padding: 0;
          margin: 0;
        }

        .shell-nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--sc-spacing-2);
          border-radius: var(--sc-radius-md);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 10px 12px;
          text-decoration: none;
          color: inherit;
          background: transparent;
        }

        .shell-nav-badge {
          flex: none;
          white-space: nowrap;
        }

        .shell-nav-link.is-active {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.34);
          font-weight: 700;
        }
      `}</style>
    </nav>
  );
}
