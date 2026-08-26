'use client';

import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={['sc-control sc-input', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
});
