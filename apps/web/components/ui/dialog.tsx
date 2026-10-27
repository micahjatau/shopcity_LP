'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';

export function useDialogLifecycle(
  open: boolean,
  onClose: (() => void) | undefined,
  panelRef: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const elements = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, panelRef]);
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogLifecycle(open, onClose, panelRef);

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
        ref={panelRef}
        tabIndex={-1}
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
