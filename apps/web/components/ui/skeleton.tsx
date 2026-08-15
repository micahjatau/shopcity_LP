import type { HTMLAttributes } from 'react';

export function Skeleton({
  className = '',
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      aria-hidden="true"
      className={['sc-skeleton', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
