'use client';

import type { ReactNode } from 'react';

export function Popover({
  open,
  children,
}: Readonly<{ open: boolean; children: ReactNode }>) {
  if (!open) return null;
  return (
    <div role="dialog" className="sc-popover">
      {children}
    </div>
  );
}
