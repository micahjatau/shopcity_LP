import type { HTMLAttributes } from 'react';

export function Separator({ className = '', ...props }: Readonly<HTMLAttributes<HTMLHRElement>>) {
  return <hr aria-orientation="horizontal" className={['sc-separator', className].filter(Boolean).join(' ')} {...props} />;
}
