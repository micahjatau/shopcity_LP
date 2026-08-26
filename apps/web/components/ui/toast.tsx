import type { ReactNode } from 'react';

export function Toast({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div role="status" aria-live="polite" className="sc-toast">
      {children}
    </div>
  );
}
