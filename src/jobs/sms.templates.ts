export type SmsTemplate =
  | 'earn-confirmed'
  | 'redemption-confirmed'
  | 'transaction-reversed'
  | 'balance-adjusted';

export type AdjustmentKind = 'CREDIT' | 'DEBIT';

type SmsPayloadVersion = 1;

type SmsPayloadBase<TTemplate extends SmsTemplate> = {
  version: SmsPayloadVersion;
  template: TTemplate;
  phoneE164: string;
};

export type RedemptionConfirmedSmsPayload = {
  version: SmsPayloadVersion;
  receiptId: string;
  transactionId: string;
  redemptionId: string;
  customerId: string;
  phoneE164: string;
  template: 'redemption-confirmed';
  redeemedKobo: string;
  remainingBalanceKobo: string;
};

export type EarnConfirmedSmsPayload = SmsPayloadBase<'earn-confirmed'> & {
  receiptId: string;
  transactionId: string;
  customerId: string;
  creditKobo: string;
};

export type TransactionReversedSmsPayload =
  SmsPayloadBase<'transaction-reversed'> & {
    transactionId: string;
    receiptId?: string | null;
  };

export type BalanceAdjustedSmsPayload = SmsPayloadBase<'balance-adjusted'> & {
  transactionId: string;
  adjustmentId: string;
  kind: AdjustmentKind;
  receiptId?: string | null;
  amountKobo: string;
  remainingBalanceKobo?: string;
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

export function buildEarnConfirmedSmsPayload(input: {
  receiptId: string;
  transactionId: string;
  customerId: string;
  phoneE164: string;
  creditKobo: bigint;
}): EarnConfirmedSmsPayload {
  return {
    version: 1,
    receiptId: input.receiptId,
    transactionId: input.transactionId,
    customerId: input.customerId,
    phoneE164: input.phoneE164,
    template: 'earn-confirmed',
    creditKobo: input.creditKobo.toString(),
  };
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

export function buildTransactionReversedSmsPayload(input: {
  transactionId: string;
  phoneE164: string;
  receiptId?: string | null;
}): TransactionReversedSmsPayload {
  return {
    version: 1,
    receiptId: input.receiptId ?? null,
    transactionId: input.transactionId,
    phoneE164: input.phoneE164,
    template: 'transaction-reversed',
  };
}

export function buildBalanceAdjustedSmsPayload(input: {
  transactionId: string;
  adjustmentId: string;
  kind: AdjustmentKind;
  phoneE164: string;
  receiptId?: string | null;
  amountKobo: bigint;
  remainingBalanceKobo?: bigint;
}): BalanceAdjustedSmsPayload {
  return {
    version: 1,
    receiptId: input.receiptId ?? null,
    transactionId: input.transactionId,
    adjustmentId: input.adjustmentId,
    kind: input.kind,
    phoneE164: input.phoneE164,
    template: 'balance-adjusted',
    amountKobo: input.amountKobo.toString(),
    ...(input.remainingBalanceKobo !== undefined
      ? { remainingBalanceKobo: input.remainingBalanceKobo.toString() }
      : {}),
  };
}

export function validateSmsIntent(
  template: SmsTemplate,
  payload: Record<string, unknown>,
): void {
  switch (template) {
    case 'earn-confirmed':
      assertEarnConfirmedPayload(payload);
      return;
    case 'redemption-confirmed':
      assertRedemptionConfirmedPayload(payload);
      return;
    case 'transaction-reversed':
      assertTransactionReversedPayload(payload);
      return;
    case 'balance-adjusted':
      assertBalanceAdjustedPayload(payload);
      return;
    default:
      return;
  }
}

function renderEarnConfirmed(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const creditKobo = requirePayloadAmount(input.payload, 'creditKobo');
  const creditNaira = formatKoboAsNaira(BigInt(creditKobo));

  return `ShopCity: Your receipt ${input.receiptId ?? 'unknown'} earned ${creditNaira}.`;
}

function assertEarnConfirmedPayload(payload: Record<string, unknown>): void {
  requirePayloadTemplate(payload, 'earn-confirmed');
  requirePayloadString(payload, 'receiptId');
  requirePayloadString(payload, 'transactionId');
  requirePayloadString(payload, 'customerId');
  requirePayloadPhone(payload);
  const creditKobo = requirePayloadAmount(payload, 'creditKobo');

  if (!creditKobo) {
    throw new SmsPayloadError(
      'earn-confirmed payload is missing required fields',
    );
  }
}

function renderRedemptionConfirmed(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const redeemedKobo = requirePayloadAmount(input.payload, 'redeemedKobo');
  const remainingBalanceKobo = requirePayloadAmount(
    input.payload,
    'remainingBalanceKobo',
  );

  return `ShopCity: Redeemed ${formatKoboAsNaira(BigInt(redeemedKobo))} from receipt ${input.receiptId ?? 'unknown'}. Remaining balance ${formatKoboAsNaira(BigInt(remainingBalanceKobo))}.`;
}

function assertRedemptionConfirmedPayload(
  payload: Record<string, unknown>,
): void {
  requirePayloadTemplate(payload, 'redemption-confirmed');
  requirePayloadString(payload, 'receiptId');
  requirePayloadString(payload, 'transactionId');
  requirePayloadString(payload, 'redemptionId');
  requirePayloadString(payload, 'customerId');
  requirePayloadPhone(payload);
  const redeemedKobo = requirePayloadAmount(payload, 'redeemedKobo');
  const remainingBalanceKobo = requirePayloadAmount(
    payload,
    'remainingBalanceKobo',
  );

  if (!redeemedKobo || !remainingBalanceKobo) {
    throw new SmsPayloadError(
      'redemption-confirmed payload is missing required fields',
    );
  }
}

function renderTransactionReversed(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const transactionId = readPayloadString(input.payload, 'transactionId');

  return `ShopCity: Your transaction ${transactionId ?? input.receiptId ?? 'unknown'} was reversed.`;
}

function renderBalanceAdjusted(input: {
  receiptId: string | null;
  payload: Record<string, unknown>;
}): string {
  const transactionId = readPayloadString(input.payload, 'transactionId');
  const amountKobo = requirePayloadAmount(input.payload, 'amountKobo');
  const amount = formatKoboAsNaira(BigInt(amountKobo));
  const kind = readPayloadString(input.payload, 'kind');
  const remainingBalanceKobo = readPayloadString(
    input.payload,
    'remainingBalanceKobo',
  );
  const remainingBalance = remainingBalanceKobo
    ? ` Remaining balance ${formatKoboAsNaira(BigInt(remainingBalanceKobo))}.`
    : '';
  const verb = kind === 'CREDIT' ? 'increased' : 'reduced';

  return `ShopCity: Your balance was ${verb} by ${amount} for transaction ${transactionId ?? input.receiptId ?? 'unknown'}.${remainingBalance}`;
}

function assertTransactionReversedPayload(
  payload: Record<string, unknown>,
): void {
  requirePayloadTemplate(payload, 'transaction-reversed');
  requirePayloadString(payload, 'transactionId');
  requirePayloadPhone(payload);
  const receiptId = payload.receiptId;

  if (receiptId !== undefined && receiptId !== null) {
    requirePayloadString(payload, 'receiptId');
  }
}

function assertBalanceAdjustedPayload(payload: Record<string, unknown>): void {
  requirePayloadTemplate(payload, 'balance-adjusted');
  requirePayloadString(payload, 'transactionId');
  requirePayloadString(payload, 'adjustmentId');
  const kind = requirePayloadString(payload, 'kind');
  if (kind !== 'CREDIT' && kind !== 'DEBIT') {
    throw new SmsPayloadError('balance-adjusted payload has an invalid kind');
  }
  requirePayloadPhone(payload);
  requirePayloadAmount(payload, 'amountKobo');
  const remainingBalanceKobo = payload.remainingBalanceKobo;

  if (remainingBalanceKobo !== undefined && remainingBalanceKobo !== null) {
    requirePayloadAmount(payload, 'remainingBalanceKobo');
  }
}

function requirePayloadTemplate(
  payload: Record<string, unknown>,
  expected: SmsTemplate,
): void {
  const version = payload.version;

  if (version !== 1) {
    throw new SmsPayloadError('SMS payload version must be 1');
  }

  const template = readPayloadString(payload, 'template');

  if (template !== expected) {
    throw new SmsPayloadError(
      `${expected} payload has an invalid or missing template`,
    );
  }
}

function requirePayloadPhone(payload: Record<string, unknown>): void {
  const phoneE164 = readPayloadString(payload, 'phoneE164');

  if (!phoneE164 || !/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
    throw new SmsPayloadError('SMS payload has an invalid phoneE164');
  }
}

function requirePayloadString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = readPayloadString(payload, key);

  if (!value) {
    throw new SmsPayloadError(`SMS payload is missing ${key}`);
  }

  return value;
}

function requirePayloadAmount(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = requirePayloadString(payload, key);

  if (!/^\d+$/.test(value)) {
    throw new SmsPayloadError(`SMS payload has an invalid ${key}`);
  }

  return value;
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
