import type { HTMLAttributes } from 'react';

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
};

export function Progress({
  value,
  max = 100,
  className = '',
  ...props
}: Readonly<ProgressProps>) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={['sc-progress', className].filter(Boolean).join(' ')}
      {...props}
    >
      <div className="sc-progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
