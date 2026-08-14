import type { ReactNode } from 'react';

export function Tooltip({ content, children }: Readonly<{ content: ReactNode; children: ReactNode }>) {
  return <span title={typeof content === 'string' ? content : undefined}>{children}</span>;
}
