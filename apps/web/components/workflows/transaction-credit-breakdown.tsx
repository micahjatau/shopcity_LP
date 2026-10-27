'use client';

import { Money } from '../shopcity';

type TransactionCreditBreakdownProps = Readonly<{
  operation: 'EARN' | 'REDEEM';
  status: string | null | undefined;
  loyaltyAmountKobo: number | null | undefined;
  redeemedAmountKobo: number | null | undefined;
  earnedAmountKobo: number | null | undefined;
}>;

type CreditEffect = Readonly<{
  label: 'Redeemed' | 'Earned';
  amountKobo: number | null;
  sign: '−' | '+';
  accessibilityLabel: string;
}>;

function isPending(status: string | null | undefined) {
  return [
    'PENDING',
    'PENDING_APPROVAL',
    'AWAITING_APPROVAL',
    'PROCESSING',
  ].includes(
    String(status ?? '')
      .trim()
      .toUpperCase(),
  );
}

function toneFor(status: string | null | undefined) {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase();
  if (isPending(normalized)) return 'pending';
  if (['REVERSED', 'VOIDED'].includes(normalized)) return 'reversed';
  if (['FAILED', 'REJECTED', 'DECLINED', 'DENIED'].includes(normalized)) {
    return 'failed';
  }
  if (['CONFIRMED', 'APPROVED', 'POSTED', 'COMPLETED'].includes(normalized)) {
    return 'approved';
  }
  return 'unknown';
}

export function TransactionCreditBreakdown({
  operation,
  status,
  loyaltyAmountKobo,
  redeemedAmountKobo,
  earnedAmountKobo,
}: TransactionCreditBreakdownProps) {
  const pending = isPending(status);
  const tone = toneFor(status);
  const effects: CreditEffect[] =
    operation === 'REDEEM'
      ? [
          {
            label: 'Redeemed',
            amountKobo: pending
              ? null
              : (redeemedAmountKobo ?? loyaltyAmountKobo ?? null),
            sign: '−',
            accessibilityLabel: 'Credit redeemed',
          },
          {
            label: 'Earned',
            amountKobo: pending ? null : (earnedAmountKobo ?? null),
            sign: '+',
            accessibilityLabel: 'Credit earned',
          },
        ]
      : [
          {
            label: 'Earned',
            amountKobo: pending
              ? null
              : (earnedAmountKobo ?? loyaltyAmountKobo ?? null),
            sign: '+',
            accessibilityLabel: 'Credit earned',
          },
        ];

  return (
    <div className="transaction-table-credit-breakdown">
      {effects.map((effect) => (
        <div key={effect.label}>
          <span>{effect.label}</span>
          {effect.amountKobo === null ? (
            <span className={`transaction-table-credit--${tone}`}>
              {pending ? 'Awaiting approval' : 'Not recorded'}
            </span>
          ) : (
            <span className={`transaction-table-credit--${tone}`}>
              <span aria-hidden="true">{effect.sign}</span>{' '}
              <Money
                amountKobo={effect.amountKobo}
                className={`transaction-table-credit--${tone}`}
                label={`${effect.accessibilityLabel}: ${effect.amountKobo} kobo`}
              />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
