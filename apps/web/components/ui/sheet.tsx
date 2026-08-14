'use client';

import type { ReactNode } from 'react';

export function Sheet({ open, title, children }: Readonly<{ open: boolean; title: ReactNode; children: ReactNode }>) {
  if (!open) return null;
  return <aside aria-label={typeof title === 'string' ? title : undefined} className="sc-sheet"><strong>{title}</strong>{children}</aside>;
}
