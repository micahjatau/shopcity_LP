'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BrowserStateBootstrap } from './browser-state-bootstrap';
import { useSessionBootstrapState } from './session-bootstrap';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from './offline';
import {
  logoutSession,
  configurationControllerGetPublicConfigV1,
} from '../lib/api';
import { createApiRequest } from '../lib/api/request';

type Role = 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | 'SYSTEM';

type RouteItem = {
  href: string;
  label: string;
};

const roleRoutes: Record<Exclude<Role, 'SYSTEM'>, RouteItem[]> = {
  CASHIER: [
    { href: '/cashier', label: 'Cashier home' },
    { href: '/cashier/customers', label: 'Customers' },
    { href: '/cashier/sync', label: 'Sync queue' },
  ],
  SUPERVISOR: [
    { href: '/supervisor', label: 'Supervisor home' },
    { href: '/supervisor/customers', label: 'Customers' },
    { href: '/supervisor/cards', label: 'Cards' },
    { href: '/supervisor/transactions', label: 'Transactions' },
    { href: '/supervisor/approvals', label: 'Approvals' },
    { href: '/supervisor/fraud', label: 'Fraud' },
    { href: '/supervisor/reports', label: 'Reports' },
  ],
  ADMIN: [
    { href: '/admin', label: 'Admin home' },
    { href: '/admin/operations', label: 'Operations' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/devices', label: 'Devices' },
    { href: '/admin/cards', label: 'Cards' },
    { href: '/admin/branches', label: 'Branches' },
    { href: '/admin/audit', label: 'Audit' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/adjustments', label: 'Adjustments' },
  ],
};

function matchesRoute(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, sessionLabel } = useSessionBootstrapState();
  const [publicConfig, setPublicConfig] = useState<any | null>(null);
  const [configMessage, setConfigMessage] = useState('Loading public context…');

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

  const routeGroup = useMemo(() => {
    if (status !== 'ready' || !role) {
      return [] as RouteItem[];
    }

    if (role === 'SYSTEM') {
      return [] as RouteItem[];
    }

    return roleRoutes[role as Exclude<Role, 'SYSTEM'>];
  }, [role, status]);

  const primaryRoute = routeGroup[0]?.href ?? '/login';
  const isAuthorizedRoute =
    routeGroup.length === 0 ||
    routeGroup.some((item) => matchesRoute(pathname, item.href));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'ready' && routeGroup.length > 0 && !isAuthorizedRoute) {
      router.replace(primaryRoute);
    }
  }, [
    isAuthorizedRoute,
    pathname,
    primaryRoute,
    routeGroup.length,
    router,
    status,
  ]);

  const navItems = useMemo<RouteItem[]>(() => {
    if (status === 'ready' && role) {
      return routeGroup;
    }

    return [{ href: '/login', label: 'Login' }];
  }, [routeGroup, role, status]);

  const activeRoute =
    navItems.find((item) => matchesRoute(pathname, item.href)) ??
    navItems[0] ??
    null;
  const workspaceLabel =
    status === 'ready'
      ? role === 'ADMIN'
        ? 'Admin workspace'
        : role === 'SUPERVISOR'
          ? 'Supervisor workspace'
          : role === 'CASHIER'
            ? 'Cashier workspace'
            : role === 'SYSTEM'
              ? 'Operational session'
              : 'Operational workspace'
      : 'Protected shell';

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
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          background: 'var(--sc-color-brand-700)',
          color: 'var(--sc-color-neutral-0)',
          padding: 'var(--sc-spacing-4)',
        }}
      >
        <div
          style={{
            margin: '0 auto',
            maxWidth: 1200,
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--sc-spacing-4)',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sc-spacing-3)',
              }}
            >
              <Image
                src="/brand/shopcity-mark-white.svg"
                alt="ShopCity"
                width={40}
                height={40}
              />
              <div>
                <div style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                  SHOPCITY
                </div>
                <div
                  style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}
                >
                  Loyalty operations
                </div>
              </div>
            </Link>
            <nav aria-label="Primary">
              <ul
                style={{
                  display: 'flex',
                  gap: 'var(--sc-spacing-3)',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  flexWrap: 'wrap',
                }}
              >
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        borderRadius: 'var(--sc-radius-full)',
                        border: '1px solid rgba(255,255,255,0.24)',
                        padding: '10px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        background:
                          pathname && matchesRoute(pathname, item.href)
                            ? 'rgba(255,255,255,0.12)'
                            : 'transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--sc-spacing-3)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <p data-status={status} style={{ margin: 0 }}>
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
                style={{
                  borderRadius: 'var(--sc-radius-full)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--sc-color-neutral-0)',
                  padding: '6px 12px',
                }}
              >
                Sign out
              </button>
            ) : null}
          </div>

          <div
            style={{
              display: 'grid',
              gap: 'var(--sc-spacing-3)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            <div
              style={{
                borderRadius: 'var(--sc-radius-lg)',
                background: 'rgba(255,255,255,0.08)',
                padding: 'var(--sc-spacing-4)',
              }}
            >
              <p style={{ margin: 0, opacity: 0.8 }}>Shell context</p>
              <strong>{configMessage}</strong>
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
                Session {sessionLabel ?? 'pending'} · {status}
              </div>
            </div>
            <div
              style={{
                borderRadius: 'var(--sc-radius-lg)',
                background: 'rgba(255,255,255,0.08)',
                padding: 'var(--sc-spacing-4)',
              }}
            >
              <p style={{ margin: 0, opacity: 0.8 }}>Workspace</p>
              <strong>{workspaceLabel}</strong>
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
                {activeRoute?.label ?? 'Route pending'}
              </div>
            </div>
            <div
              style={{
                borderRadius: 'var(--sc-radius-lg)',
                background: 'rgba(255,255,255,0.08)',
                padding: 'var(--sc-spacing-4)',
              }}
            >
              <p style={{ margin: 0, opacity: 0.8 }}>Branch and policy</p>
              <strong>
                {context?.branch?.name ?? context?.branch?.id ?? 'Loading…'}
              </strong>
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
                {context?.tenant?.name ??
                  context?.tenant?.id ??
                  'Tenant pending'}
                {context?.branch?.timezone
                  ? ` · ${context.branch.timezone}`
                  : ''}
              </div>
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
                {typeof context?.branch?.receiptWeekStartDay === 'number'
                  ? `Receipt week starts ${context.branch.receiptWeekStartDay}`
                  : 'Receipt week start pending'}
                {typeof context?.policies?.offlineRedemptionDisabled === 'boolean'
                  ? context.policies.offlineRedemptionDisabled
                    ? ' · Offline redemption disabled'
                    : ' · Offline redemption available'
                  : ''}
              </div>
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
                {typeof context?.policies?.defaultEarnRateBps === 'number'
                  ? `${context.policies.defaultEarnRateBps / 100}% earn rate`
                  : 'Policy values pending'}
                {typeof context?.policies?.minRedemptionKobo === 'number'
                  ? ` · Min redemption ₦${(context.policies.minRedemptionKobo / 100).toLocaleString()}`
                  : ''}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main
        style={{
          margin: '0 auto',
          maxWidth: 1200,
          padding: 'var(--sc-spacing-6)',
        }}
      >
        <BrowserStateBootstrap />
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 'var(--sc-spacing-4)',
          }}
        >
          {showProtectedContent ? null : (
            <p
              style={{
                margin: 0,
                color: 'var(--sc-color-semantic-textSecondary)',
              }}
            >
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
          <section
            style={{
              borderRadius: 'var(--sc-radius-xl)',
              background: 'var(--sc-color-neutral-0)',
              border: '1px solid var(--sc-color-semantic-border)',
              padding: 'var(--sc-spacing-6)',
              boxShadow: 'var(--sc-shadow-level1)',
              display: 'grid',
              gap: 'var(--sc-spacing-3)',
            }}
          >
            <h1 style={{ margin: 0 }}>{workspaceLabel}</h1>
            <p
              style={{
                margin: 0,
                color: 'var(--sc-color-semantic-textSecondary)',
              }}
            >
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
  );
}
