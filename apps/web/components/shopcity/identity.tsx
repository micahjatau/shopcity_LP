'use client';

import type { ReactNode } from 'react';
import { Money } from './money';
import { StatusBadge } from './status-badge';

export type IdentityProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: {
    label: string;
    tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  };
  details?: ReactNode[];
  action?: ReactNode;
  className?: string;
};

function IdentityBase({
  title,
  subtitle,
  status,
  details,
  action,
  className = '',
}: IdentityProps) {
  return (
    <article className={['sc-identity', className].filter(Boolean).join(' ')}>
      <h3 className="sc-identity__title">
        <span>{title}</span>
        {status ? (
          <StatusBadge label={status.label} tone={status.tone} />
        ) : null}
      </h3>
      {subtitle ? <div>{subtitle}</div> : null}
      {details?.length ? (
        <div className="sc-identity__meta">
          {details.map((detail, index) => (
            <span key={index}>{detail}</span>
          ))}
        </div>
      ) : null}
      {action ? <div>{action}</div> : null}
    </article>
  );
}

export type CustomerIdentityProps = {
  name: string;
  phoneMasked: string;
  statusLabel?: string;
  branchName?: string;
  detailLink?: ReactNode;
  className?: string;
};

export function CustomerIdentity({
  name,
  phoneMasked,
  statusLabel,
  branchName,
  detailLink,
  className,
}: CustomerIdentityProps) {
  return (
    <IdentityBase
      className={className}
      title={name}
      status={statusLabel ? { label: statusLabel, tone: 'brand' } : undefined}
      details={[phoneMasked, branchName].filter(Boolean) as ReactNode[]}
      action={detailLink}
    />
  );
}

export type CardIdentityProps = {
  serialMasked: string;
  statusLabel?: string;
  customerName?: string;
  context?: string;
  className?: string;
};

export function CardIdentity({
  serialMasked,
  statusLabel,
  customerName,
  context,
  className,
}: CardIdentityProps) {
  return (
    <IdentityBase
      className={className}
      title={serialMasked}
      status={statusLabel ? { label: statusLabel, tone: 'neutral' } : undefined}
      details={[customerName, context].filter(Boolean) as ReactNode[]}
    />
  );
}

export type ReceiptIdentityProps = {
  receiptNumber: string;
  branchName?: string;
  occurredAt?: string;
  amountKobo?: number;
  className?: string;
};

export function ReceiptIdentity({
  receiptNumber,
  branchName,
  occurredAt,
  amountKobo,
  className,
}: ReceiptIdentityProps) {
  return (
    <IdentityBase
      className={className}
      title={receiptNumber}
      details={
        [
          branchName,
          occurredAt,
          typeof amountKobo === 'number' ? (
            <Money amountKobo={amountKobo} />
          ) : null,
        ].filter(Boolean) as ReactNode[]
      }
    />
  );
}
