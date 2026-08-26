'use client';

import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className = '', type = 'checkbox', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={['sc-checkbox', className].filter(Boolean).join(' ')}
        {...props}
      />
    );
  },
);
