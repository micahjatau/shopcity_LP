'use client';

import type { FieldsetHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export type RadioGroupOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps = {
  name: string;
  value?: string;
  defaultValue?: string;
  options: RadioGroupOption[];
  onValueChange?: (value: string) => void;
  legend?: ReactNode;
  description?: ReactNode;
} & Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'value' | 'defaultValue' | 'onChange'
>;

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  function RadioGroup(
    {
      name,
      value,
      defaultValue,
      options,
      onValueChange,
      legend,
      description,
      className = '',
      ...props
    },
    ref,
  ) {
    return (
      <fieldset
        ref={ref}
        className={['sc-radio-group', className].filter(Boolean).join(' ')}
        {...props}
      >
        {legend ? <legend>{legend}</legend> : null}
        {description ? <p>{description}</p> : null}
        {options.map((option) => (
          <label key={option.value} className="sc-radio-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              defaultChecked={defaultValue === option.value}
              disabled={option.disabled}
              onChange={() => onValueChange?.(option.value)}
            />
            <span className="sc-radio-option__body">
              <strong>{option.label}</strong>
              {option.description ? <span>{option.description}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
    );
  },
);
