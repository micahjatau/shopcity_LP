export const APPROVAL_CATEGORY = {
  HIGH_VALUE_TRANSACTION: 'HIGH_VALUE_TRANSACTION',
  LATE_RECEIPT_CLAIM: 'LATE_RECEIPT_CLAIM',
} as const;

export type ApprovalCategory =
  (typeof APPROVAL_CATEGORY)[keyof typeof APPROVAL_CATEGORY];

export const HIGH_VALUE_APPROVAL_REASON_CODES = [
  'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
  'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
] as const;

export const LATE_RECEIPT_APPROVAL_REASON_CODE = 'LATE_RECEIPT_CLAIM';

export function categoryForApprovalReasonCode(
  reasonCode: string | null | undefined,
): ApprovalCategory | null {
  if (!reasonCode) return null;
  if (reasonCode === LATE_RECEIPT_APPROVAL_REASON_CODE) {
    return APPROVAL_CATEGORY.LATE_RECEIPT_CLAIM;
  }
  if (
    HIGH_VALUE_APPROVAL_REASON_CODES.includes(
      reasonCode as (typeof HIGH_VALUE_APPROVAL_REASON_CODES)[number],
    )
  ) {
    return APPROVAL_CATEGORY.HIGH_VALUE_TRANSACTION;
  }
  return null;
}

export function reasonCodesForApprovalCategory(
  category: ApprovalCategory,
): readonly string[] {
  return category === APPROVAL_CATEGORY.LATE_RECEIPT_CLAIM
    ? [LATE_RECEIPT_APPROVAL_REASON_CODE]
    : HIGH_VALUE_APPROVAL_REASON_CODES;
}
