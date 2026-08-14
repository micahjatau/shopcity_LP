'use client';

import type { ReactNode } from 'react';

export type StatusTone =
  'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  title?: string;
  className?: string;
};

export function StatusBadge({
  label,
  tone = 'neutral',
  icon,
  title,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      title={title}
      className={['sc-badge', `sc-badge--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? icon : <span aria-hidden="true" className="sc-badge__dot" />}
      <span>{label}</span>
    </span>
  );
}
