import type { ReactNode } from 'react';
import { AppShell } from '../../components/app-shell';
import { ScannerContextScope } from '../../components/scanner-context-scope';

export default function ShellLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AppShell>
      <ScannerContextScope context="disabled" />
      {children}
    </AppShell>
  );
}
