'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useEffect, useId, useMemo, useState } from 'react';

export type MoneyProps = {
  amountKobo: number;
  signed?: boolean;
  emphasis?: 'normal' | 'positive' | 'negative' | 'muted';
  currency?: 'NGN';
  locale?: string;
  label?: string;
  className?: string;
};

export function formatMoney(amountKobo: number, locale = 'en-NG') {
  const currency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency.format(Math.abs(amountKobo) / 100);
}

export function Money({
  amountKobo,
  signed = false,
  emphasis = 'normal',
  locale = 'en-NG',
  label,
  className = '',
}: MoneyProps) {
  const amount = useMemo(
    () => formatMoney(amountKobo, locale),
    [amountKobo, locale],
  );
  const sign =
    signed && amountKobo > 0 ? '+' : signed && amountKobo < 0 ? '−' : '';

  return (
    <span
      aria-label={label ?? `${amountKobo < 0 ? 'negative ' : ''}${amount}`}
      className={['sc-money', `sc-money--${emphasis}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {sign}
      {amount}
    </span>
  );
}

export type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue'
> & {
  label?: ReactNode;
  valueKobo?: number | null;
  defaultValueKobo?: number | null;
  onValueChange?: (valueKobo: number | null) => void;
  hint?: string;
};

function parseNaira(input: string) {
  const cleaned = input.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return null;

  const normalized = cleaned.replace(/,/g, '.');
  const lastSeparator = normalized.lastIndexOf('.');

  let numeric = normalized;
  if (lastSeparator !== -1) {
    numeric = `${normalized.slice(0, lastSeparator).replace(/\./g, '')}.${normalized.slice(lastSeparator + 1)}`;
  }

  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    {
      label,
      valueKobo,
      defaultValueKobo = null,
      onValueChange,
      hint,
      className = '',
      onBlur,
      onChange,
      id,
      ...props
    },
    ref,
  ) {
    const fieldId = useId();
    const inputId = id ?? fieldId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const [draft, setDraft] = useState(() =>
      (valueKobo ?? defaultValueKobo ?? null) === null
        ? ''
        : (Math.abs(valueKobo ?? defaultValueKobo ?? 0) / 100).toFixed(2),
    );

    useEffect(() => {
      if (typeof valueKobo === 'number') {
        setDraft((Math.abs(valueKobo) / 100).toFixed(2));
      }
    }, [valueKobo]);

    return (
      <div className="sc-money-input">
        {label ? <label htmlFor={inputId}>{label}</label> : null}
        <input
          ref={ref}
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={hintId}
          className={['sc-control sc-input', className]
            .filter(Boolean)
            .join(' ')}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange?.(event);
          }}
          onBlur={(event) => {
            const parsed = parseNaira(event.target.value);
            if (parsed === null) {
              onValueChange?.(null);
              setDraft('');
            } else {
              onValueChange?.(parsed);
              setDraft((parsed / 100).toFixed(2));
            }
            onBlur?.(event);
          }}
          {...props}
        />
        {hint ? (
          <p id={hintId} className="sc-money-input__hint">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
