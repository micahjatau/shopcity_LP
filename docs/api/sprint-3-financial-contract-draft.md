# Sprint 3 Financial Contract Draft

This draft captures request, response, and error examples before endpoint implementation. OpenAPI and Bruno artifacts must be generated from the final implemented contracts.

## Redeem

`POST /api/v1/transactions/redeem`

Required headers: `Idempotency-Key` plus existing authenticated session and CSRF requirements.

```json
{
  "cardSerialNumber": "SC-00001234",
  "posReceiptNumber": "10501",
  "basketAmountKobo": 2000000,
  "requestedRedemptionKobo": 500000,
  "occurredAt": "2026-07-19T09:44:00+01:00"
}
```

Confirmed response: `201`

```json
{
  "transactionId": "uuid",
  "redemptionId": "uuid",
  "receiptId": "uuid",
  "state": "CONFIRMED",
  "basketAmountKobo": 2000000,
  "redeemedKobo": 500000,
  "maximumAllowedKobo": 600000,
  "remainingBalanceKobo": 930000,
  "allocations": [
    {
      "creditLotId": "uuid",
      "amountKobo": 300000,
      "expiresAt": "2026-11-01T00:00:00.000Z"
    },
    {
      "creditLotId": "uuid",
      "amountKobo": 200000,
      "expiresAt": "2027-01-15T00:00:00.000Z"
    }
  ],
  "smsStatus": "QUEUED"
}
```

Pending approval response: `202`

```json
{
  "state": "PENDING_APPROVAL",
  "redemptionId": "uuid",
  "approvalId": "uuid",
  "requestedRedemptionKobo": 1000000,
  "maximumAllowedKoboAtRequest": 1500000,
  "reasonCode": "REDEMPTION_ABOVE_APPROVAL_THRESHOLD"
}
```

## Approval Decisions

Approval decision routes must support earn and redemption targets without trusting frontend-submitted target state.

Approve redemption response: `200`

```json
{
  "approvalId": "uuid",
  "targetType": "REDEEM",
  "redemptionId": "uuid",
  "state": "EXECUTED",
  "transactionId": "uuid",
  "redeemedKobo": 1000000,
  "remainingBalanceKobo": 500000,
  "smsStatus": "QUEUED"
}
```

Reject redemption response: `200`

```json
{
  "approvalId": "uuid",
  "targetType": "REDEEM",
  "redemptionId": "uuid",
  "state": "REJECTED"
}
```

## Reverse Transaction

`POST /api/v1/transactions/{transactionId}/reverse`

Required headers: `Idempotency-Key`.

```json
{
  "reason": "Customer returned goods"
}
```

Response: `201`

```json
{
  "originalTransactionId": "uuid",
  "reversalTransactionId": "uuid",
  "reversedAmountKobo": 500000,
  "remainingBalanceKobo": 1430000,
  "restorations": [
    {
      "allocationId": "uuid",
      "creditLotId": "uuid",
      "amountKobo": 300000,
      "expiresAt": "2026-11-01T00:00:00.000Z"
    }
  ],
  "smsStatus": "QUEUED"
}
```

## Manual Adjustment

`POST /api/v1/adjustments`

Required headers: `Idempotency-Key`.

```json
{
  "customerId": "uuid",
  "kind": "CREDIT",
  "amountKobo": 50000,
  "reason": "Service recovery credit",
  "effectiveAt": "2026-07-26T10:00:00.000Z",
  "expiryMonths": 12
}
```

Credit response: `201`

```json
{
  "transactionId": "uuid",
  "adjustmentId": "uuid",
  "kind": "CREDIT",
  "amountKobo": 50000,
  "createdCreditLotId": "uuid",
  "remainingBalanceKobo": 1480000,
  "smsStatus": "QUEUED"
}
```

Debit response: `201`

```json
{
  "transactionId": "uuid",
  "adjustmentId": "uuid",
  "kind": "DEBIT",
  "amountKobo": 50000,
  "remainingBalanceKobo": 1430000,
  "allocations": [
    {
      "creditLotId": "uuid",
      "amountKobo": 50000,
      "expiresAt": "2026-11-01T00:00:00.000Z"
    }
  ],
  "smsStatus": "QUEUED"
}
```

## Transaction Lookup

`GET /api/v1/transactions/{transactionId}` returns a discriminated response by ledger type.

Redemption lookup example:

```json
{
  "transactionId": "uuid",
  "type": "REDEEM",
  "direction": "DEBIT",
  "amountKobo": 500000,
  "redemptionId": "uuid",
  "receiptId": "uuid",
  "basketAmountKobo": 2000000,
  "allocations": [
    {
      "creditLotId": "uuid",
      "amountKobo": 300000,
      "expiresAt": "2026-11-01T00:00:00.000Z"
    }
  ],
  "approval": null,
  "smsStatus": "SENT",
  "createdAt": "2026-07-26T10:00:00.000Z"
}
```

## Stable Errors

All errors use the API error envelope and stable machine-readable codes.

Auth endpoints also document the stable device/session failures used by the auth controller: `AUTH_REQUIRED`, `DEVICE_REVOKED`, and `DEVICE_ATTESTATION_REPLAYED`.

Receiptless Adjustment/Reversal execution is deferred for the halfway release, so this draft only documents receipt-backed success responses and explicit deferral.

| Status | Code                                                          |
| -----: | ------------------------------------------------------------- |
|    401 | `AUTH_REQUIRED`                                               |
|    401 | `DEVICE_REVOKED`                                              |
|    400 | `SESSION_DEVICE_REQUIRED`                                     |
|    400 | `DEVICE_NOT_ACTIVE`                                           |
|    400 | `DEVICE_BRANCH_MISMATCH`                                      |
|    400 | `VALIDATION_ERROR`                                            |
|    403 | role or approval-policy authorization failures                |
|    404 | `CARD_NOT_FOUND` under the documented anti-enumeration policy |
|    409 | `RECEIPT_ALREADY_USED`                                        |
|    409 | `IDEMPOTENCY_CONFLICT`                                        |
|    409 | `DEVICE_ATTESTATION_REPLAYED`                                 |
|    409 | duplicate reversal conflict                                   |
|    422 | `REDEMPTION_BELOW_MINIMUM`                                    |
|    422 | `REDEMPTION_EXCEEDS_BASKET_CAP`                               |
|    422 | `INSUFFICIENT_BALANCE`                                        |
|    422 | `SAME_PURCHASE_REDEMPTION_NOT_ALLOWED`                        |
|    422 | `OFFLINE_REDEMPTION_NOT_ALLOWED`                              |
|    422 | `REDEMPTION_POLICY_CHANGED`                                   |
|    422 | `REVERSAL_REVIEW_REQUIRED`                                    |
|    429 | `RATE_LIMITED`                                                |
|    503 | `REDEMPTION_TRANSACTION_CONFLICT`                             |
|    503 | `DEPENDENCY_UNAVAILABLE`                                      |
