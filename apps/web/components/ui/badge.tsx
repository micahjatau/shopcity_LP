import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  icon?: ReactNode;
};

export function Badge({ tone = 'neutral', icon, className = '', children, ...props }: Readonly<BadgeProps>) {
  return (
    <span className={['sc-badge', `sc-badge--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {icon ?? <span aria-hidden="true" className="sc-badge__dot" />}
      <span>{children}</span>
    </span>
  );
}
