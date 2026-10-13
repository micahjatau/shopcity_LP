'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Money, StatusBadge } from '../shopcity';
import { Button } from '../ui';
import type { EarnLookupContext } from './use-earn-transaction-controller';

type EarnTransactionSuccessProps = {
  responseData: Record<string, unknown>;
  lookupContext?: EarnLookupContext;
  cashierDisplayName?: string | null;
  cashbackRateLabel: string;
  branchTimezone?: string | null;
  onCaptureAnother: () => void;
};

export function EarnTransactionSuccess({
  responseData,
  lookupContext,
  cashierDisplayName,
  cashbackRateLabel,
  branchTimezone,
  onCaptureAnother,
}: EarnTransactionSuccessProps) {
  const [copyMessage, setCopyMessage] = useState('');
  const result = getEarnResult(responseData);
  const creditKobo = readSafeInteger(result.creditKobo);
  const availableBalanceKobo = readSafeInteger(result.availableBalanceKobo);
  const purchaseAmountKobo = readSafeInteger(result.purchaseAmountKobo);
  // The confirmed API response has no separate item-level eligible amount.
  const eligibleAmountKobo = purchaseAmountKobo;
  const receiptNumber = readDisplayString(result.posReceiptNumber);
  const capturedAt = formatCapturedAt(result.capturedAt, branchTimezone);
  const customerName = lookupContext?.customerName?.trim();
  const cashierName = cashierDisplayName?.trim() || 'Cashier';
  const cardSerialNumber = lookupContext?.cardSerialNumber?.trim();
  const customerId = lookupContext?.customerId?.trim();
  const reviewStatus = readDisplayString(result.reviewStatus);
  const statusLabel =
    reviewStatus?.toUpperCase() === 'APPROVED' ? 'Approved' : 'Confirmed';

  async function copyCashierName() {
    try {
      await navigator.clipboard.writeText(cashierName);
      setCopyMessage('Cashier name copied.');
    } catch {
      setCopyMessage('Could not copy cashier name. Select the value manually.');
    }
  }

  return (
    <section
      className="capture-result-card capture-result-card--confirmed cashier-workflow-stage"
      data-od-id="capture-success"
      aria-live="polite"
      aria-labelledby="earn-result-title"
    >
      <div className="capture-result-card__hero">
        <h2 id="earn-result-title" className="capture-result-card__hero-title">
          ShopCity Credit earned
        </h2>
        <strong className="capture-result-card__hero-credit">
          {creditKobo === null
            ? 'Not available'
            : `+${formatNaira(creditKobo)}`}
        </strong>
        <p className="capture-result-card__hero-balance">
          {customerName ? `${customerName}’s new balance is ` : 'New balance: '}
          {availableBalanceKobo === null ? (
            'Not available'
          ) : (
            <Money amountKobo={availableBalanceKobo} />
          )}
        </p>
      </div>

      <dl className="capture-result-card__details">
        <div>
          <dt>Receipt number</dt>
          <dd>{receiptNumber ?? 'Not available'}</dd>
        </div>
        <div>
          <dt>Cashback rate</dt>
          <dd>{cashbackRateLabel}</dd>
        </div>
        <div>
          <dt>Receipt amount</dt>
          <dd>
            {purchaseAmountKobo === null ? (
              'Not available'
            ) : (
              <Money amountKobo={purchaseAmountKobo} />
            )}
          </dd>
        </div>
        <div>
          <dt>Captured</dt>
          <dd>{capturedAt}</dd>
        </div>
        <div>
          <dt>Eligible amount</dt>
          <dd>
            {eligibleAmountKobo === null ? (
              'Not available'
            ) : (
              <Money amountKobo={eligibleAmountKobo} />
            )}
          </dd>
        </div>
        <div>
          <dt>Captured by</dt>
          <dd className="capture-result-card__cashier">
            <span>{cashierName}</span>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              className="capture-result-card__copy"
              aria-label={`Copy cashier name ${cashierName}`}
              title="Copy cashier name"
              onClick={() => void copyCashierName()}
            >
              <Image
                src="/brand/cashier/cashier-confirmation-copy.svg"
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
              />
            </Button>
            <span className="sr-only" aria-live="polite">
              {copyMessage}
            </span>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge label={statusLabel} tone="success" />
          </dd>
        </div>
      </dl>

      <div className="capture-result-card__actions">
        <Button
          type="button"
          size="compact"
          className="capture-result-card__action"
          onClick={onCaptureAnother}
        >
          Capture Another
        </Button>
        {cardSerialNumber ? (
          <Link
            className="sc-button sc-button--secondary sc-button--compact capture-result-card__action"
            href={`/cashier/redeem?card=${encodeURIComponent(cardSerialNumber)}`}
          >
            Redeem Now
          </Link>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="compact"
            className="capture-result-card__action"
            disabled
          >
            Redeem Now
          </Button>
        )}
        {customerId ? (
          <Link
            className="sc-button sc-button--secondary sc-button--compact capture-result-card__action"
            href={`/cashier/customers?id=${encodeURIComponent(customerId)}`}
          >
            View Customer
          </Link>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="compact"
            className="capture-result-card__action"
            disabled
          >
            View Customer
          </Button>
        )}
      </div>
    </section>
  );
}

function getEarnResult(responseData: Record<string, unknown>) {
  let value: unknown = responseData;
  for (let depth = 0; depth < 2; depth += 1) {
    if (!isRecord(value) || !isRecord(value.data)) break;
    value = value.data;
  }
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSafeInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : null;
}

function readDisplayString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatNaira(amountKobo: number) {
  const sign = amountKobo < 0 ? '-' : '';
  const absoluteKobo = Math.abs(amountKobo);
  const naira = Math.trunc(absoluteKobo / 100);
  const kobo = absoluteKobo % 100;
  const formattedNaira = new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(naira);
  return `${sign}₦${formattedNaira}${kobo ? `.${kobo.toString().padStart(2, '0')}` : ''}`;
}

function formatCapturedAt(value: unknown, timeZone?: string | null) {
  if (typeof value !== 'string') return 'Not available';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not available';

  try {
    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: timeZone || undefined,
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined,
    }).format(date);
    return `${datePart}, ${timePart}`;
  } catch {
    return 'Not available';
  }
}
