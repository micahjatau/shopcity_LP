# Sprint 4 Reporting Definitions

These definitions are frozen for Sprint 4 reporting materialization.

## Executive summary

- `registeredCustomers`: total customers in scope.
- `activeCustomers`: distinct customers with at least one confirmed financial transaction during the report period.
- `loyaltyPurchaseValueKobo`: sum of confirmed earn purchase amounts.
- `creditIssuedKobo`: sum of confirmed earn credits.
- `creditRedeemedKobo`: sum of confirmed redemption amounts.
- `creditExpiredKobo`: sum of remaining lot value where the lot is expired as of the report watermark.
- `outstandingLiabilityKobo`: sum of remaining lot value where the lot is still active as of the report watermark.

## Liability ageing

- `expiryMonth`: `YYYY-MM` bucket derived from lot expiry date.
- `ageBucket`: `0-30`, `31-60`, `61-90`, or `90+` based on days remaining until expiry.
- `customerCount`: distinct customers with lots in the bucket.
- `lotCount`: count of lots in the bucket.
- `outstandingKobo`: sum of remaining lot value in the bucket.

## Cashier activity

- `transactionCount`: count of confirmed customer-facing transactions in scope.
- `purchaseValueKobo`: sum of receipt purchase values.
- `creditIssuedKobo`: sum of earn ledger credits.
- `duplicateAttempts`: count of duplicate receipt attempts for the cashier/day.
- `reversalCount`: count of reversal ledger entries created by the cashier/day.
- `approvalRequests`: count of approvals requested by the cashier/day.

## Customer performance

- `purchaseValueKobo`: cumulative confirmed purchase value.
- `currentBalanceKobo`: current active credit balance.
- `visitCount`: confirmed transaction count for the customer.
- `lastActivityAt`: most recent confirmed financial activity.
- `dormant`: true when `lastActivityAt` is older than the configured dormancy window.

## Redemption reporting

- `redemptionCount`: count of redemption attempts.
- `requestedKobo`: sum of requested redemption amounts.
- `confirmedKobo`: sum of confirmed redemption amounts.
- `reversedKobo`: sum of reversed redemption amounts.
- `pendingApprovalCount`: count of redemptions awaiting approval.

## SMS operations

- `queuedCount`, `sentCount`, `deliveredCount`, `failedCount`, `suppressedCount` from SMS message status.

## Materialization rules

- Derived tables are rebuildable and never authoritative.
- Materialization is tenant-scoped and branch-scoped.
- Report rows store `scope` and `scopeKey` for safe rebuild and idempotent replace.
- Money values remain integer kobo.
