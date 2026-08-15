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

function splitKobo(amountKobo: number) {
  const absolute = Math.abs(Math.trunc(amountKobo));
  return {
    sign: amountKobo < 0 ? '-' : '',
    whole: Math.trunc(absolute / 100),
    fraction: absolute % 100,
  };
}

export function formatMoney(amountKobo: number, locale = 'en-NG') {
  const currency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency.format(amountKobo / 100);
}

export function formatMoneyInputDraft(amountKobo: number, locale = 'en-NG') {
  const { sign, whole, fraction } = splitKobo(amountKobo);
  const wholeText = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(whole);
  return `${sign}${wholeText}.${fraction.toString().padStart(2, '0')}`;
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
  const sign = signed && amountKobo > 0 ? '+' : '';

  return (
    <span
      aria-label={label ?? amount}
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

function parseIntegerPart(value: string, separator: ',' | '.') {
  if (!value) return null;

  if (value.includes(separator)) {
    const grouped = new RegExp(`^\\d{1,3}(\\${separator}\\d{3})+$`);
    if (!grouped.test(value)) {
      return null;
    }

    return value.split(separator).join('');
  }

  return /^\d+$/.test(value) ? value : null;
}

export function parseNaira(input: string) {
  const cleaned = input.trim().replace(/[₦\s\u00a0]/g, '');
  if (!cleaned) return null;

  let sign = '';
  let body = cleaned;
  if (body.startsWith('+') || body.startsWith('-')) {
    sign = body[0] === '-' ? '-' : '';
    body = body.slice(1);
  }

  if (!body || /[+-]/.test(body) || !/^[\d.,]+$/.test(body)) {
    return null;
  }

  const commaCount = (body.match(/,/g) ?? []).length;
  const dotCount = (body.match(/\./g) ?? []).length;

  let whole = '';
  let fraction = '';

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator =
      body.lastIndexOf(',') > body.lastIndexOf('.') ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    const parts = body.split(decimalSeparator);
    if (parts.length !== 2) return null;

    const [integerPart, decimalPart] = parts;
    if (!decimalPart || decimalPart.length > 2 || !/^\d+$/.test(decimalPart)) {
      return null;
    }

    const normalizedInteger = parseIntegerPart(integerPart, thousandSeparator);
    if (!normalizedInteger) return null;

    whole = normalizedInteger;
    fraction = decimalPart;
  } else if (commaCount > 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(body)) {
      whole = body.split(',').join('');
      fraction = '00';
    } else if (/^\d+,\d{1,2}$/.test(body)) {
      const [integerPart, decimalPart] = body.split(',');
      whole = integerPart;
      fraction = decimalPart;
    } else {
      return null;
    }
  } else if (dotCount > 0) {
    if (!/^\d+\.\d{1,2}$/.test(body)) {
      return null;
    }
    const [integerPart, decimalPart] = body.split('.');
    whole = integerPart;
    fraction = decimalPart;
  } else {
    whole = body;
    fraction = '00';
  }

  if (!/^\d+$/.test(whole) || !/^\d{1,2}$/.test(fraction)) {
    return null;
  }

  const koboText = `${sign}${whole}${fraction.padEnd(2, '0')}`;
  const parsed = Number(koboText);
  return Number.isSafeInteger(parsed) ? parsed : null;
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
    const initialKobo = valueKobo ?? defaultValueKobo ?? null;
    const [draft, setDraft] = useState(() =>
      initialKobo === null ? '' : formatMoneyInputDraft(initialKobo),
    );

    useEffect(() => {
      if (typeof valueKobo === 'number') {
        setDraft(formatMoneyInputDraft(valueKobo));
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
              setDraft(formatMoneyInputDraft(parsed));
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
