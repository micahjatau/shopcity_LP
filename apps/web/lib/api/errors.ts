export type ApiErrorCategory =
  | 'validation'
  | 'business-rule'
  | 'conflict'
  | 'session'
  | 'connectivity'
  | 'unexpected';

const sessionErrorCodes = new Set([
  'AUTH_REQUIRED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_SESSION_REVOKED',
  'AUTH_FORBIDDEN',
  'AUTH_CSRF_MISSING',
  'AUTH_CSRF_MISMATCH',
  'AUTH_CSRF_INVALID',
]);

const conflictErrorCodes = new Set([
  'IDEMPOTENCY_CONFLICT',
  'RECEIPT_ALREADY_USED',
  'SYNC_RECORD_CONFLICT',
]);

const businessRuleCodes = new Set([
  'INSUFFICIENT_BALANCE',
  'REDEMPTION_BASKET_CAP_EXCEEDED',
  'APPROVAL_POLICY_CHANGED',
  'DEVICE_INACTIVE',
  'CUSTOMER_BLOCKED',
]);

export function classifyApiError(
  error: unknown,
  statusCode?: number,
): ApiErrorCategory {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (statusCode === 0) {
    return 'connectivity';
  }

  if (statusCode === 401 || statusCode === 403 || sessionErrorCodes.has(code)) {
    return 'session';
  }

  if (statusCode === 409 || conflictErrorCodes.has(code)) {
    return 'conflict';
  }

  if (statusCode === 422 || code === 'VALIDATION_ERROR') {
    return 'validation';
  }

  if (businessRuleCodes.has(code)) {
    return 'business-rule';
  }

  return 'unexpected';
}
