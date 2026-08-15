'use client';

import type { ReactNode } from 'react';

export function DropdownMenu({
  open,
  children,
}: Readonly<{ open: boolean; children: ReactNode }>) {
  if (!open) return null;
  return (
    <div role="menu" className="sc-dropdown">
      {children}
    </div>
  );
}
