'use client';

import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { options, placeholder, className = '', children, ...props },
    ref,
  ) {
    return (
      <select
        ref={ref}
        className={['sc-control sc-select', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
    );
  },
);
