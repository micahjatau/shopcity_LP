'use client';

import { StatusBadge, type StatusTone } from '../shopcity';

export function SupervisorCustomerStatusBadge({
  status,
  fallback = 'Not provided',
  className = '',
}: Readonly<{
  status: unknown;
  fallback?: string;
  className?: string;
}>) {
  const normalized =
    typeof status === 'string' ? status.trim().toUpperCase() : '';
  const label = normalized
    ? normalized
        .toLowerCase()
        .split(/[\s_-]+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : fallback;
  const tone: StatusTone =
    normalized === 'ACTIVE'
      ? 'success'
      : normalized === 'BLOCKED'
        ? 'danger'
        : 'neutral';

  return <StatusBadge className={className} label={label} tone={tone} />;
}
