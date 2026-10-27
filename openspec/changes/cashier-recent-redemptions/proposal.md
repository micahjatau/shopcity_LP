## Why

Cashiers can review recent purchase captures on the Capture Purchase lookup step, but the Redeem Credit lookup step has no comparable view of recent redemption outcomes. Add a compact, read-only activity table inspired by the supplied Figma reference so the cashier can see recent redemption amounts and whether each request was approved, is pending, or was denied before starting another lookup.

## What Changes

- Add a “Recently redeemed” table below the verified-card lookup on the Redeem Credit Find Customer step.
- Populate it from the existing authenticated, cashier-scoped `cashier-today` report; do not add a financial write or another data contract.
- Show the customer, receipt, amount, and outcome. Distinguish a confirmed redeemed amount from an unconfirmed requested amount.
- Include loading, empty, and unavailable states; remove the table when the workflow advances from Find Customer.
- Match the Figma activity panel’s compact title, white surface, border, and aligned customer/amount/status rows while retaining semantic table accessibility.

## Capabilities

### New Capabilities

- `cashier-recent-redemptions`: Read-only, scoped recent redemption activity on the Redeem Credit lookup step.

### Modified Capabilities

- None.

## Impact

- Frontend: `CashierWorkflowRoute`, a new recent-redemptions presentation component, cashier route styles, and focused tests.
- Data source: existing generated `reportsControllerListCashierTodayV1` client and current cashier-today response; no endpoint, API schema, database, or migration change.
- The response does not contain a customer phone number; show the receipt as secondary customer context instead of fabricating or retrieving extra PII.
- Existing cashier authorization, branch/business-day scope, ledger semantics, approval behavior, and offline-redemption prohibition remain unchanged.
