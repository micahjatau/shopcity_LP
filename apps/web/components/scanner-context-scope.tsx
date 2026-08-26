'use client';

import { useEffect } from 'react';
import { setScannerContext, type ScannerContext } from '../lib/browser/scanner';

export function ScannerContextScope({
  context,
}: Readonly<{ context: ScannerContext }>) {
  useEffect(() => {
    setScannerContext(context);
    return () => setScannerContext('disabled');
  }, [context]);

  return null;
}
