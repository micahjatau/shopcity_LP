# Sprint 4 Reporting Definitions

These definitions are frozen for Sprint 4 reporting materialization.

## Executive summary

- `registeredCustomers`: customers in scope whose `createdAt` falls on or before the row's report date (a stock metric, not a current total repeated into historical rows).
- `activeCustomers`: distinct customers with at least one confirmed financial transaction on the row's report date.
- `loyaltyPurchaseValueKobo`: sum of confirmed earn purchase amounts.
- `creditIssuedKobo`: sum of confirmed earn credits.
- `creditRedeemedKobo`: sum of confirmed redemption amounts.
- `creditExpiredKobo`: credit expired on the row's local report date D (a daily flow).
- `outstandingLiabilityKobo`: remaining active lot value at the end of report date D (an end-of-day stock).

## Liability ageing

- `expiryMonth`: `YYYY-MM` bucket derived from lot expiry date.
- `ageBucket`: `0-30`, `31-60`, `61-90`, or `90+` based on days remaining until expiry.
- `customerCount`: distinct customers with lots in the bucket.
- `lotCount`: count of lots in the bucket.
- `outstandingKobo`: sum of remaining lot value in the bucket.

## Cashier activity

- `transactionCount`: count of confirmed customer-facing Earn and Redeem transactions in scope; reversed entries are excluded.
- `purchaseValueKobo`: sum of Earn receipt purchase values only.
- `creditIssuedKobo`: sum of earn ledger credits.
- `redemptionCount`: count of confirmed customer-facing redemption transactions.
- `redemptionValueKobo`: sum of confirmed redemption debit amounts.
- `duplicateAttempts`: count of duplicate receipt attempts for the cashier/day.
- `reversalCount`: count of reversal ledger entries created by the cashier/day.
- `approvalRequests`: count of approvals requested by the cashier/day.
- `fraudFlagCount`: count of fraud flags first detected for the cashier/day.

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
- `basketRatioBps`: confirmed redemption value divided by the confirmed redemption basket value, expressed in basis points; zero when the denominator is zero.
- `lotsConsumed`: distinct FIFO credit lots consumed by confirmed or reversed redemptions.
- `allocationCount`: number of FIFO allocation rows for confirmed or reversed redemptions.

## SMS operations

- `queuedCount`, `sentCount`, `deliveredCount`, `failedCount`, and `suppressedCount` are reconstructed from SMS status transitions at the materialization watermark. `queuedCount` is the count of messages queued during the report date; terminal counts identify the resulting provider state.

## Materialization rules

- Derived tables are rebuildable and never authoritative.
- Materialization is tenant-scoped and branch-scoped.
- Report rows store `scope` and `scopeKey` for safe rebuild and idempotent replace.
- Money values remain integer kobo.
