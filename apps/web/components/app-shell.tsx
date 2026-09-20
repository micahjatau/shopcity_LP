'use client';

import Image from 'next/image';
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

function ShellLoadingScreen() {
  return (
    <main className="shell-loading-screen" aria-busy="true" aria-live="polite">
      <div className="shell-loading-card">
        <Image
          src="/brand/shopcity-mark-white.svg"
          alt="ShopCity"
          width={44}
          height={44}
          priority
        />
        <div className="shell-loading-brand">
          <strong>SHOPCITY</strong>
          <small>SUPERMARKET</small>
        </div>
        <p>Preparing your workspace…</p>
        <div className="shell-loading-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
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
      const stored =
        window.localStorage.getItem('shopcity:shell:sidebar-collapsed') ??
        window.sessionStorage.getItem('shopcity:shell:sidebar-collapsed');
      if (stored === 'true' || stored === 'false') {
        setSidebarCollapsed(stored === 'true');
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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(
        'shopcity:shell:sidebar-collapsed',
        String(next),
      );
      window.sessionStorage.setItem(
        'shopcity:shell:sidebar-collapsed',
        String(next),
      );
      return next;
    });
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

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      resetSessionContext();
      router.replace('/login');
      router.refresh();
    }
  }

  if (status === 'loading') {
    return <ShellLoadingScreen />;
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
    <div
      className={`shell-root${role === 'CASHIER' ? ' shell-root--cashier' : ''}`}
    >
      <Link className="shell-skip-link" href="#shell-main-content">
        Skip to content
      </Link>
      <div ref={shellFrameRef} className="shell-frame">
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
            onToggleCollapse={toggleSidebar}
            onLogout={() => void handleLogout()}
          />

          <div className="shell-main-column">
            <AppTopbar
              status={status}
              sessionLabel={sessionLabel}
              configMessage={configMessage}
              workspaceLabel={workspaceLabel}
              routeTrailLabel={routeTrailLabel}
              deviceLabel={deviceId}
              role={
                role === 'CASHIER' || role === 'SUPERVISOR' || role === 'ADMIN'
                  ? role
                  : null
              }
              mobileMenuButtonRef={mobileMenuButtonRef}
              onOpenMobileMenu={() => setMobileNavigationOpen(true)}
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
                  <h1 className="shell-gate-heading">{workspaceLabel}</h1>
                  <p className="shell-access-message">
                    {status === 'ready'
                      ? 'You do not have access to this workspace. Redirecting to your permitted shell.'
                      : 'Sign in to access cashier, supervisor and admin workflows.'}
                  </p>
                  <Link href={status === 'ready' ? primaryRoute : '/login'}>
                    {status === 'ready'
                      ? 'Go to my workspace'
                      : 'Go to sign in'}
                  </Link>
                </section>
              )}
            </main>
          </div>
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
              <div className="shell-mobile-drawer-brand">
                <Image
                  src="/brand/shopcity-mark-white.svg"
                  alt=""
                  width={32}
                  height={32}
                />
                <div>
                  <strong>ShopCity</strong>
                  <span>{workspaceLabel}</span>
                </div>
              </div>
              <button
                type="button"
                ref={mobileCloseButtonRef}
                onClick={closeMobileNavigation}
                className="shell-mobile-close"
                aria-label="Close navigation"
              >
                Close
              </button>
            </div>
            <ShellNavigation
              sections={navigationSections}
              pathname={pathname}
              onNavigate={closeMobileNavigation}
            />
            <div className="shell-mobile-drawer-footer">
              <a href="/help" className="shell-mobile-drawer-action">
                <span aria-hidden="true">?</span>
                Help &amp; Training
              </a>
              <button
                type="button"
                className="shell-mobile-drawer-action"
                onClick={() => void handleLogout()}
              >
                <span aria-hidden="true">↪</span>
                Logout
              </button>
              <span>
                {context?.branch?.name ??
                  context?.branch?.id ??
                  'Branch pending'}
              </span>
              <span>{context?.branch?.timezone ?? 'Timezone pending'}</span>
            </div>
          </div>
        </div>
      ) : null}
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
              const accessibleLabel =
                item.id === 'cashier-lookup'
                  ? 'Find Customer Lookup'
                  : item.id === 'cashier-earn'
                    ? 'Capture Purchase Earn'
                    : item.id === 'cashier-redeem'
                      ? 'Redeem Credit Redeem'
                      : item.label;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    aria-label={accessibleLabel}
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
    </nav>
  );
}
