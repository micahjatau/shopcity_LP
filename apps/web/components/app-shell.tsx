import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SessionBootstrap } from './session-bootstrap';

type RouteHref = '/login' | '/cashier' | '/supervisor' | '/admin';

const navItems: Array<{ href: RouteHref; label: string }> = [
  { href: '/login', label: 'Login' },
  { href: '/cashier', label: 'Cashier' },
  { href: '/supervisor', label: 'Supervisor' },
  { href: '/admin', label: 'Admin' },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
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
        <SessionBootstrap />
        {children}
      </main>
    </div>
  );
}
