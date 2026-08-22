'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserStateBootstrap } from './browser-state-bootstrap';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { ShellNavigationIcon } from './shell-navigation-icon';
import {
  SessionBootstrapProvider,
  useSessionBootstrapState,
} from './session-bootstrap';
import { OfflineIndicator } from './offline';
import { Badge } from './ui';
import {
  getOfflineEarnRecordCount,
  subscribeOfflineQueue,
} from '../lib/browser/offline-earn-queue';
import {
  getActiveShellNavigationSection,
  getShellNavigationSections,
  getShellNavigationTrail,
  getShellPrimaryRoute,
  getShellWorkspaceLabel,
  matchShellRoute,
} from './shell-navigation';
import { logoutSession } from '../lib/api';

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionBootstrapProvider>
      <AppShellContent>{children}</AppShellContent>
    </SessionBootstrapProvider>
  );
}

function AppShellContent({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    status,
    role,
    sessionLabel,
    deviceId,
    publicConfig,
    configMessage,
    reset: resetSessionContext,
  } = useSessionBootstrapState();
  const [syncQueueCount, setSyncQueueCount] = useState<number | null>(null);
  const [syncQueueError, setSyncQueueError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const shellFrameRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavigationWasOpenRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(
        'shopcity:shell:sidebar-collapsed',
      );
      if (stored !== null) {
        setSidebarCollapsed(stored === 'true');
      } else if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(min-width: 768px) and (max-width: 1199px)').matches
      ) {
        setSidebarCollapsed(true);
      }
    }

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
    const frame = shellFrameRef.current;
    if (!frame) return undefined;

    if (mobileNavigationOpen) {
      frame.inert = true;
      frame.setAttribute('aria-hidden', 'true');
    } else {
      frame.inert = false;
      frame.removeAttribute('aria-hidden');
    }

    return () => {
      frame.inert = false;
      frame.removeAttribute('aria-hidden');
    };
  }, [mobileNavigationOpen]);

  useEffect(() => {
    const wasOpen = mobileNavigationWasOpenRef.current;
    mobileNavigationWasOpenRef.current = mobileNavigationOpen;

    if (wasOpen && !mobileNavigationOpen) {
      mobileMenuButtonRef.current?.focus();
    }
  }, [mobileNavigationOpen]);

  const closeMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return undefined;
    }

    mobileCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMobileNavigation();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const drawer = mobileDrawerRef.current;
      if (!drawer) {
        return;
      }

      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMobileNavigation, mobileNavigationOpen]);

  function handleToggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'shopcity:shell:sidebar-collapsed',
          String(next),
        );
      }
      return next;
    });
  }

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      resetSessionContext();
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
      <Link className="shell-skip-link" href="#shell-main-content">
        Skip to content
      </Link>
      <div ref={shellFrameRef} className="shell-frame">
        <AppTopbar
          status={status}
          sessionLabel={sessionLabel}
          configMessage={configMessage}
          workspaceLabel={workspaceLabel}
          activeSectionLabel={activeSection?.label ?? 'Section pending'}
          routeTrailLabel={routeTrailLabel}
          pageTitle={pageTitle}
          deviceLabel={deviceId}
          context={context}
          showProtectedContent={showProtectedContent}
          mobileMenuButtonRef={mobileMenuButtonRef}
          onLogout={() => void handleLogout()}
          onOpenMobileMenu={() => setMobileNavigationOpen(true)}
        />

        <div
          className={`shell-body${sidebarCollapsed ? ' shell-body--collapsed' : ''}`}
        >
          <AppSidebar
            sections={navigationSections}
            pathname={pathname}
            workspaceLabel={workspaceLabel}
            branchLabel={
              context?.branch?.name ?? context?.branch?.id ?? 'Branch pending'
            }
            branchTimezone={context?.branch?.timezone ?? 'Timezone pending'}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />

          <main id="shell-main-content" tabIndex={-1} className="shell-main">
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
      </div>

      {mobileNavigationOpen ? (
        <div
          className="shell-mobile-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeMobileNavigation();
            }
          }}
        >
          <div
            ref={mobileDrawerRef}
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
                onClick={closeMobileNavigation}
                className="shell-mobile-close"
              >
                Close
              </button>
            </div>
            <ShellNavigation
              sections={navigationSections}
              pathname={pathname}
              onNavigate={closeMobileNavigation}
            />
          </div>
        </div>
      ) : null}

      <style>{`
        .shell-root {
          min-height: 100vh;
          background: var(--sc-color-neutral-50);
          color: var(--sc-color-neutral-900);
        }

        .shell-skip-link {
          position: absolute;
          left: var(--sc-spacing-4);
          top: var(--sc-spacing-4);
          transform: translateY(-180%);
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-brand-700);
          border-radius: var(--sc-radius-full);
          padding: 8px 14px;
          z-index: 60;
        }

        .shell-skip-link:focus {
          transform: translateY(0);
        }

        .shell-frame {
          display: grid;
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

        .shell-body--collapsed {
          grid-template-columns: 84px minmax(0, 1fr);
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
        }

        @media (min-width: 768px) and (max-width: 1199px) {
          .shell-body,
          .shell-body--collapsed {
            grid-template-columns: 84px minmax(0, 1fr);
          }

          .shell-sidebar {
            gap: var(--sc-spacing-3);
            padding-inline: var(--sc-spacing-3);
          }

          .shell-sidebar-brand-subtitle,
          .shell-sidebar-footer,
          .shell-nav-section-label,
          .shell-nav-link-label,
          .shell-nav-badge {
            display: none;
          }

          .shell-sidebar-brand-title {
            display: none;
          }

          .shell-sidebar-brand-row {
            flex-direction: column;
            align-items: center;
          }

          .shell-sidebar-toggle {
            width: 2.5rem;
            height: 2.5rem;
            justify-content: center;
            padding: 0;
          }

          .shell-sidebar-toggle-label {
            display: none;
          }

          .shell-nav-link {
            justify-content: center;
            padding: 10px;
          }

          .shell-nav-link-icon {
            width: 1.1rem;
            height: 1.1rem;
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
                    aria-label={item.label}
                    title={item.badge?.title ?? item.label}
                    className={`shell-nav-link${active ? ' is-active' : ''}`}
                  >
                    <span aria-hidden="true" className="shell-nav-link-icon">
                      <ShellNavigationIcon name={item.icon} />
                    </span>
                    <span className="shell-nav-link-label">{item.label}</span>
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

      <style>{`
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
          gap: var(--sc-spacing-2);
          border-radius: var(--sc-radius-md);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 10px 12px;
          text-decoration: none;
          color: inherit;
          background: transparent;
        }

        .shell-nav-link-icon {
          display: inline-flex;
          width: 1rem;
          height: 1rem;
          flex: none;
        }

        .shell-nav-link-icon :global(svg) {
          width: 100%;
          height: 100%;
        }

        .shell-nav-link-label {
          min-width: 0;
        }

        .shell-nav-badge {
          flex: none;
          white-space: nowrap;
          margin-left: auto;
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
