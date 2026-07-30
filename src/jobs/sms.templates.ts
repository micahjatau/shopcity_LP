export type SmsTemplate =
  | 'earn-confirmed'
  | 'redemption-confirmed'
  | 'transaction-reversed'
  | 'balance-adjusted';

export type RedemptionConfirmedSmsPayload = {
  version: 1;
  receiptId: string;
  transactionId: string;
  redemptionId: string;
  customerId: string;
  phoneE164: string;
  template: 'redemption-confirmed';
  redeemedKobo: string;
  remainingBalanceKobo: string;
};

export class SmsPayloadError extends Error {
  readonly failureCategory = 'terminal' as const;
}

export function renderSmsMessage(input: {
  receiptId: string | null;
  template: SmsTemplate;
  payload: Record<string, unknown>;
}): string {
  validateSmsIntent(input.template, input.payload);

  switch (input.template) {
    case 'earn-confirmed':
      return renderEarnConfirmed(input);
    case 'redemption-confirmed':
      return renderRedemptionConfirmed(input);
    case 'transaction-reversed':
      return renderTransactionReversed(input);
    case 'balance-adjusted':
      return renderBalanceAdjusted(input);
    default:
      throw new Error(
        `Unsupported SMS template ${(input as { template: string }).template}`,
      );
  }
}

export function buildRedemptionConfirmedSmsPayload(input: {
  receiptId: string;
  transactionId: string;
  redemptionId: string;
  customerId: string;
  phoneE164: string;
  redeemedKobo: bigint;
  remainingBalanceKobo: bigint;
}): RedemptionConfirmedSmsPayload {
  return {
    version: 1,
    receiptId: input.receiptId,
    transactionId: input.transactionId,
    redemptionId: input.redemptionId,
    customerId: input.customerId,
    phoneE164: input.phoneE164,
    template: 'redemption-confirmed',
    redeemedKobo: input.redeemedKobo.toString(),
    remainingBalanceKobo: input.remainingBalanceKobo.toString(),
  };
}

export function validateSmsIntent(
  template: SmsTemplate,
  payload: Record<string, unknown>,
): void {
  switch (template) {
    case 'redemption-confirmed':
      assertRedemptionConfirmedPayload(payload);
      return;
    default:
      return;
  }
}

function renderEarnConfirmed(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const creditKobo = readPayloadString(input.payload, 'creditKobo');
  const creditNaira = creditKobo
    ? formatKoboAsNaira(BigInt(creditKobo))
    : 'store credit';

  return `ShopCity: Your receipt ${input.receiptId ?? 'unknown'} earned ${creditNaira}.`;
}

function renderRedemptionConfirmed(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const redeemedKobo = readPayloadString(input.payload, 'redeemedKobo');
  const remainingBalanceKobo = readPayloadString(
    input.payload,
    'remainingBalanceKobo',
  );
  const redemptionId = readPayloadString(input.payload, 'redemptionId');
  const transactionId = readPayloadString(input.payload, 'transactionId');

  if (
    !redeemedKobo ||
    !remainingBalanceKobo ||
    !redemptionId ||
    !transactionId
  ) {
    throw new SmsPayloadError(
      'redemption-confirmed payload is missing required fields',
    );
  }

  return `ShopCity: Redeemed ${formatKoboAsNaira(BigInt(redeemedKobo))} from receipt ${input.receiptId ?? 'unknown'}. Remaining balance ${formatKoboAsNaira(BigInt(remainingBalanceKobo))}.`;
}

function assertRedemptionConfirmedPayload(
  payload: Record<string, unknown>,
): void {
  const redeemedKobo = readPayloadString(payload, 'redeemedKobo');
  const remainingBalanceKobo = readPayloadString(
    payload,
    'remainingBalanceKobo',
  );
  const redemptionId = readPayloadString(payload, 'redemptionId');
  const transactionId = readPayloadString(payload, 'transactionId');

  if (
    !redeemedKobo ||
    !remainingBalanceKobo ||
    !redemptionId ||
    !transactionId
  ) {
    throw new SmsPayloadError(
      'redemption-confirmed payload is missing required fields',
    );
  }
}

function renderTransactionReversed(input: {
  receiptId: string | null;
}): string {
  return `ShopCity: Your transaction ${input.receiptId ?? 'unknown'} was reversed.`;
}

function renderBalanceAdjusted(input: { receiptId: string | null }): string {
  return `ShopCity: Your balance was adjusted for receipt ${input.receiptId ?? 'unknown'}.`;
}

function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatKoboAsNaira(kobo: bigint): string {
  const naira = kobo / 100n;
  const remainder = kobo % 100n;

  return `NGN ${naira.toString()}.${remainder.toString().padStart(2, '0')}`;
}
