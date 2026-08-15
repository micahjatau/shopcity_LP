'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { BrowserStateBootstrap } from './browser-state-bootstrap';
import { useSessionBootstrapState } from './session-bootstrap';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from './offline';
import { logoutSession } from '../lib/api';

type RouteHref = '/login' | '/cashier' | '/supervisor' | '/admin';

type Role = 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | 'SYSTEM';

const roleRoutes: Record<Exclude<Role, 'SYSTEM'>, RouteHref[]> = {
  CASHIER: ['/cashier'],
  SUPERVISOR: ['/supervisor'],
  ADMIN: ['/admin'],
};

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, sessionLabel } = useSessionBootstrapState();

  const routeGroup = useMemo(() => {
    if (status !== 'ready' || !role) {
      return [] as RouteHref[];
    }

    return role === 'SYSTEM'
      ? roleRoutes.ADMIN
      : roleRoutes[role as Exclude<Role, 'SYSTEM'>];
  }, [role, status]);

  const primaryRoute = routeGroup[0] ?? '/login';
  const isAuthorizedRoute = routeGroup.length === 0 || routeGroup.includes(pathname as RouteHref);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'ready' && routeGroup.length > 0 && !routeGroup.includes(pathname as RouteHref)) {
      router.replace(primaryRoute);
    }
  }, [pathname, primaryRoute, routeGroup, router, status]);

  const navItems = useMemo(() => {
    if (status === 'ready' && role) {
      return routeGroup.map((href) => ({
        href,
        label:
          href === '/cashier'
            ? 'Cashier'
            : href === '/supervisor'
              ? 'Supervisor'
              : 'Admin',
      }));
    }

    return [{ href: '/login' as const, label: 'Login' }];
  }, [routeGroup, role, status]);

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const showProtectedContent = status === 'ready' && isAuthorizedRoute;

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
              <div style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.9 }}>
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
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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
          <p data-status={status}>
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
                border: '1px solid var(--sc-color-semantic-borderStrong)',
                background: 'var(--sc-color-neutral-0)',
                color: 'var(--sc-color-semantic-textPrimary)',
                padding: '6px 12px',
              }}
            >
              Sign out
            </button>
          ) : null}
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
            <h1 style={{ margin: 0 }}>Protected shell</h1>
            <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
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
