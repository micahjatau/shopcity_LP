'use client';

export type ScannerContext =
  'lookup' | 'earn' | 'redeem' | 'customers' | 'sync' | 'disabled';

type ScannerListener = (scan: string) => void;

const listeners = new Set<ScannerListener>();
let activeContext: ScannerContext = 'disabled';
let buffer = '';
let timer: ReturnType<typeof setTimeout> | null = null;

function resetBuffer() {
  buffer = '';
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function flushBuffer() {
  const value = buffer.trim();
  resetBuffer();

  if (!value || activeContext === 'disabled') {
    return;
  }

  listeners.forEach((listener) => listener(value));
}

export function getScannerContext() {
  return activeContext;
}

export function setScannerContext(context: ScannerContext) {
  activeContext = context;
}

export function subscribeScannerListener(listener: ScannerListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initializeScannerRouting() {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (activeContext === 'disabled') {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    const isTypingSurface =
      tagName === 'input' ||
      tagName === 'textarea' ||
      target?.isContentEditable === true;

    if (isTypingSurface) {
      return;
    }

    if (event.key === 'Enter') {
      flushBuffer();
      return;
    }

    if (event.key.length === 1) {
      buffer += event.key;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => flushBuffer(), 40);
    }
  };

  window.addEventListener('keydown', onKeyDown);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    resetBuffer();
  };
}
