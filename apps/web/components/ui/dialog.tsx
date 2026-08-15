'use client';

import type { ReactNode } from 'react';

export function Dialog({
  open,
  title,
  children,
  onClose,
}: Readonly<{
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}>) {
  if (!open) return null;
  return (
    <div role="presentation" className="sc-dialog">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="sc-dialog__backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="sc-dialog__panel"
      >
        <header>
          <strong>{title}</strong>
        </header>
        {children}
      </div>
    </div>
  );
}
