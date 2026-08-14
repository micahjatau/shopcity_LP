import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell } from '../../components/app-shell';

export default function ShellLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AppShell>
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          marginBottom: 'var(--sc-spacing-6)',
        }}
      >
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Shell routes are scoped by role and will later consume
          backend-authenticated session context.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/cashier">Cashier</Link>
          <Link href="/supervisor">Supervisor</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
