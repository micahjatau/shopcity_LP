import type { HTMLAttributes, ReactNode } from 'react';

export type AlertTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title?: ReactNode;
};

export function Alert({
  tone = 'neutral',
  title,
  className = '',
  children,
  ...props
}: Readonly<AlertProps>) {
  return (
    <div
      role="alert"
      className={['sc-alert', `sc-alert--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
