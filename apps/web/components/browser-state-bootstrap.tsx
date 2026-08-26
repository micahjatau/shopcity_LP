'use client';

import { useEffect } from 'react';
import { initializeConnectivityTracking } from '../lib/browser/connectivity';
import { initializeScannerRouting } from '../lib/browser/scanner';

export function BrowserStateBootstrap() {
  useEffect(() => {
    const stopConnectivity = initializeConnectivityTracking();
    const stopScanner = initializeScannerRouting();

    return () => {
      stopScanner();
      stopConnectivity();
    };
  }, []);

  return null;
}
