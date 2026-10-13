import { createHash } from 'node:crypto';

export interface EarnPolicyValues {
  version: number;
  defaultEarnRateBps: number;
  purchaseFlagThresholdKobo: bigint;
  purchaseApprovalThresholdKobo: bigint;
  purchaseAmountCeilingKobo: bigint;
}

export interface EarnConfigReader {
  get<T = unknown>(key: string): T | undefined;
}

export function calculateEarnAmountKobo(
  paidAmountKobo: bigint,
  earnRateBps: bigint,
): bigint {
  if (paidAmountKobo < 0n || earnRateBps < 0n) {
    throw new RangeError('Earn inputs cannot be negative');
  }

  return (paidAmountKobo * earnRateBps + 9_999n) / 10_000n;
}

export function resolveEarnRateBps(
  config: EarnConfigReader,
  policy?: Pick<EarnPolicyValues, 'defaultEarnRateBps'>,
): bigint {
  return BigInt(
    policy?.defaultEarnRateBps ??
      config.get<number>('DEFAULT_EARN_RATE_BPS') ??
      200,
  );
}

export function resolveEarnCaptureStatus(
  purchaseAmountKobo: number,
  config: EarnConfigReader,
  policy?: Pick<
    EarnPolicyValues,
    'purchaseFlagThresholdKobo' | 'purchaseApprovalThresholdKobo'
  >,
): 'CAPTURED' | 'FLAGGED' | 'PENDING_APPROVAL' {
  const flagThresholdKobo = policy
    ? Number(policy.purchaseFlagThresholdKobo)
    : (config.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ?? 10_000_000);
  const approvalThresholdKobo = policy
    ? Number(policy.purchaseApprovalThresholdKobo)
    : (config.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ?? 20_000_000);

  if (purchaseAmountKobo > approvalThresholdKobo) {
    return 'PENDING_APPROVAL';
  }
  if (purchaseAmountKobo > flagThresholdKobo) {
    return 'FLAGGED';
  }
  return 'CAPTURED';
}

export function getEarnApprovalPolicyVersion(
  config: EarnConfigReader,
  policy?: EarnPolicyValues,
): string {
  return createHash('sha256')
    .update(
      stableStringify({
        purchaseFlagThresholdKobo: Number(
          policy?.purchaseFlagThresholdKobo ??
            BigInt(
              config.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ?? 10_000_000,
            ),
        ),
        purchaseApprovalThresholdKobo: Number(
          policy?.purchaseApprovalThresholdKobo ??
            BigInt(
              config.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
                20_000_000,
            ),
        ),
        purchaseAmountCeilingKobo: Number(
          policy?.purchaseAmountCeilingKobo ??
            BigInt(
              config.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ?? 100_000_000,
            ),
        ),
        defaultEarnRateBps:
          policy?.defaultEarnRateBps ??
          config.get<number>('DEFAULT_EARN_RATE_BPS') ??
          200,
        version: policy?.version ?? null,
      }),
    )
    .digest('hex');
}

export function buildSettlementPolicyVersion(
  redemptionPolicyVersion: string,
  earnPolicyVersion: string,
): string {
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ redemptionPolicyVersion, earnPolicyVersion }))
    .digest('hex');
  return `settlement-v1:${fingerprint}`;
}

export function isSettlementPolicyVersion(version: string): boolean {
  return version.startsWith('settlement-v1:');
}

export function addUtcMonthsClamped(date: Date, months: number): Date {
  if (!Number.isInteger(months)) {
    throw new RangeError('Month interval must be an integer');
  }

  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(',')}}`;
}
