'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'compact' | 'standard' | 'large';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'standard',
      loading = false,
      disabled,
      type = 'button',
      className = '',
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          'sc-button',
          `sc-button--${variant}`,
          `sc-button--${size}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <span aria-hidden="true" className="sc-button__spinner" />
        ) : null}
        <span>{children}</span>
      </button>
    );
  },
);
