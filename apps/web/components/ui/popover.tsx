'use client';

import type { ReactNode } from 'react';

export function Popover({
  open,
  children,
  label,
  className = '',
}: Readonly<{
  open: boolean;
  children: ReactNode;
  label?: string;
  className?: string;
}>) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label={label}
      className={['sc-popover', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
