## Design Read

A Supervisor transaction lookup for staff who know a receipt number and need to inspect one transaction before deciding whether a reversal is appropriate. Match the Cashier transactions table/search composition, but use a Supervisor-only server query and keep reversal actions inside a selected-record dialog.

## Search Contract

Add `GET /api/v1/transactions?receiptNumber=...` for `SUPERVISOR` only. Normalize the receipt number using the existing receipt identity rule. Require branch scope from the authenticated session; never accept a request-selected branch. Filter by authenticated tenant, branch, and exact normalized receipt number. Return only ledger-backed `EARN`/`REDEEM` rows with stable ledger-entry transaction IDs, receipt number, operation, amount in integer kobo, status, and effective time. Bound rows with cursor pagination. Exclude customer contact data and other unnecessary details. The endpoint is read-only.

The existing Cashier-only `/reports/cashier-today` and aggregate `/reports/cashier-activity` contracts are not widened or repurposed.

## Page and Dialog

Replace the Supervisor `TransactionWorkspace` usage with a route-specific cashier-style table. Use header copy `Transactions` / `Search by receipt number to review transaction details.` Keep the initial state concise and show no contract/policy pills or transaction-ID loader. Search is explicit; no report is loaded implicitly.

Each result is keyboard- and pointer-selectable. Opening it shows a dialog in a loading state while the existing transaction-detail endpoint is fetched by the ledger transaction ID. Only a successful authoritative response enables the reversal form. The dialog includes the receipt, transaction type/status, amount and relevant authoritative summary, plus a reason field and typed `REVERSE` confirmation. A failure or stale response cannot enable a write. Escape, backdrop, and close actions do not dismiss the dialog while reversal is submitting, and async response updates are guarded by the selected-dialog generation.

On confirmation, retain the existing `reversalsControllerReverseV1` request with CSRF and a fresh idempotency key. Backend eligibility remains authoritative. Show failures in the dialog; after confirmed success, refresh authoritative detail and the receipt results. Closing the dialog restores focus to the originating row. The original confirmed ledger entry is never modified or deleted.

## Boundaries

Do not edit `TransactionDashboard` or change Cashier behavior. Do not edit Admin's shared `TransactionWorkspace`. Do not create schema migrations, expose customer PII, add client-selected branch scope, loosen endpoint roles, or implement reversal eligibility in the UI.

## Verification

Test normalized receipt search, required input, pagination bounds, tenant/branch scoping, role denial, response IDs, and absence of PII. Test loading/error/empty/stale detail states, keyboard row selection, dialog focus/Escape behavior, validation, CSRF/idempotency on reversal, and confirmed-success refresh. Retain the existing reversal smoke evidence that the source transaction stays confirmed and a compensating ledger record is created.
