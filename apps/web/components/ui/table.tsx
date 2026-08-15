import type { TableHTMLAttributes } from 'react';

export function Table({
  className = '',
  ...props
}: Readonly<TableHTMLAttributes<HTMLTableElement>>) {
  return (
    <table
      className={['sc-table', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
