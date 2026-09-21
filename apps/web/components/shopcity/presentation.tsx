'use client';

import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from 'react';

export function CashierPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}: Readonly<{
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <header className={['sc-page-head', className].filter(Boolean).join(' ')}>
      <div className="sc-page-head__copy">
        {eyebrow ? <p className="sc-page-head__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="sc-page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function ShopCityCard({
  as: Element = 'section',
  variant = 'standard',
  className = '',
  children,
  ...props
}: Readonly<{
  as?: 'article' | 'section' | 'div';
  variant?: 'standard' | 'metric' | 'table' | 'flow';
  className?: string;
  children: ReactNode;
}> &
  Record<string, unknown>) {
  return (
    <Element
      className={['sc-card', `sc-card--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Element>
  );
}

export function CashierFlowPanel({
  flow,
  state,
  className = '',
  dataOdId,
  children,
}: Readonly<{
  flow: 'earn' | 'redeem';
  state?: string;
  className?: string;
  dataOdId?: string;
  children: ReactNode;
}>) {
  return (
    <article
      className={['sc-flow-panel', className].filter(Boolean).join(' ')}
      data-flow={flow}
      data-state={state}
      data-od-id={dataOdId}
      aria-label={`${flow} transaction`}
    >
      {children}
    </article>
  );
}

export function CashierTableToolbar({
  title,
  description,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
}>) {
  return (
    <div className="table-head">
      <div>
        <h2>{title}</h2>
        {description ? <p className="cashier-muted">{description}</p> : null}
      </div>
      <label className="table-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={onSearchChange}
        />
      </label>
    </div>
  );
}

export function ShopCityStatusMessage({
  tone = 'neutral',
  live = true,
  children,
}: Readonly<{
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  live?: boolean;
  children: ReactNode;
}>) {
  return (
    <p
      className="sc-status"
      data-tone={tone}
      role={live ? 'status' : undefined}
    >
      {children}
    </p>
  );
}

export function ShopCityFormActions({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={['sc-form-actions', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function ShopCityActionButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        'sc-button sc-button--secondary sc-button--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
