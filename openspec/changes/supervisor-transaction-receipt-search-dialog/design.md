## Design Read

A Supervisor transaction lookup for staff who know a receipt number and need to inspect one transaction before deciding whether a reversal is appropriate. Match the Cashier transactions table/search composition, but use a Supervisor-only server query and keep reversal actions inside a selected-record dialog.

## Search Contract

Use `GET /api/v1/transactions` for `SUPERVISOR` only. Require branch scope from the authenticated session; never accept a request-selected branch. When `receiptNumber` is present, normalize it using the existing receipt identity rule and filter by exact identity; when omitted, list all eligible receipt-backed ledger rows in the authenticated tenant and branch. Return only ledger-backed `EARN`/`REDEEM` rows with stable ledger-entry transaction IDs, receipt number, operation, amount in integer kobo, status, and effective time. Order by effective time descending, then ledger-entry ID descending for deterministic ties, before cursor pagination; expose effective time as the table's occurred-at value. Exclude customer contact data and other unnecessary details. The endpoint is read-only.

The existing Cashier-only `/reports/cashier-today` and aggregate `/reports/cashier-activity` contracts are not widened or repurposed.

### Cursor pagination and refresh

Keep pagination cursor-based; the endpoint does not supply a total page count, so show the current page number and do not invent a total. Omit the static `Results are limited to the authenticated branch.` footer sentence; authorization remains enforced by the endpoint, and the footer keeps pagination and the active receipt filter when present. Place the compact outlined previous/next icon controls matching the existing Supervisor overview pager at the right edge of the results footer, with black icons and page text; convey disabled state through reduced opacity. Place Refresh at the right of the page heading using the Customers table's filled neutral action-pill style with a subtle border; keep its icon and label side by side. Load the first branch-scoped page automatically when the route opens. Refresh is available after that initial list request has completed and while filters are unchanged. It re-fetches the current optional receipt filter, applied filters, and current-page cursor from the same authenticated branch scope, preserving visible rows and page position while loading; it does not load selected-transaction details or initiate a write.

## Page and Dialog

Replace the Supervisor `TransactionWorkspace` usage with a route-specific cashier-style table. Use header copy `Transactions` / `Review branch transactions and filter by receipt number.` Load the first bounded page of transactions for the authenticated branch on route entry. Keep the initial state concise and show no contract/policy pills, transaction-ID loader, or duplicate initial status instruction. Receipt number is an optional filter applied explicitly with the other filters; do not require it to load the table.

Each result is keyboard- and pointer-selectable. The table preserves the operation in the accessible row label and selected dialog even though it is not a visible reference column. Opening a result shows a dialog in a loading state while the existing transaction-detail endpoint is fetched by the ledger transaction ID. Only a successful authoritative response enables the reversal form. The dialog includes the receipt, transaction type/status, amount and relevant authoritative summary, plus a reason field and typed `REVERSE` confirmation. A failure or stale response cannot enable a write. Escape, backdrop, and close actions do not dismiss the dialog while reversal is submitting, and async response updates are guarded by the selected-dialog generation.

### Reference alignment

Use `supervisor-transactions-table.svg` and `supervisor-transaction-popup.svg` as visual references only; never render their sample rows or embed the illustrations. Match the compact toolbar with receipt search, `All Statuses`, `All Staff`, and `Minimum amount (₦)`, plus the white rounded surface, restrained separators, clear column hierarchy, and textual status badges. Reuse the Customers directory's rounded filter buttons, accessible selected-state dropdown menu, primary-action buttons, table typography, separators, and responsive row-card presentation. All three filters must be applied by the branch-scoped endpoint before cursor pagination; changing filters starts a fresh cursor sequence. Status options must reflect only supported outcomes (`CONFIRMED` and `REVERSED`), staff options must be limited to cashiers who captured receipts in the authenticated branch (and to the exact receipt when that filter is present), and minimum receipt amount must be converted to integer kobo without floating-point financial logic.

Use the supported reference columns: Receipt No., Name, Receipt amount, Credit, Date & Time, and Status. The endpoint may return the branch-scoped customer's name and receipt purchase amount, but never customer phone or email. Credit is shown only for EARN rows; REDEEM rows show it as not applicable. Omit the reference's Eligible column because neither the TRD nor current data model defines an authoritative eligibility amount.

### Typography

Use the Customers directory table typography for transaction results: 12px headings and 13px row values. Filter labels and rounded trigger/menu text use 12px; every placeholder on the Supervisor Transactions page, including receipt, minimum amount, and reversal-dialog fields, uses the same 12px size. Typed input text and dialog values retain their existing readable sizing, and the dialog title remains 24px. Keep the page heading at the existing CashierPageHeader scale. Scope these adjustments to the Supervisor transaction route; use the Customers table's labeled row-card layout on narrow screens and retain the responsive single-column dialog.

Style the selected-transaction dialog as a spacious white two-column detail surface with a red transaction heading, muted field labels, and a compact audit timeline. Keep reversal controls in the dialog and retain their existing validation and pending-submit behavior. Do not fabricate a receipt preview or audit events: use only authoritative detail fields (`occurredAt`, `capturedAt`, `state`, amounts, and IDs already allowed by the route); if showing a receipt-preview region, state clearly that the image is not provided by the transaction API.

On confirmation, retain the existing `reversalsControllerReverseV1` request with CSRF and a fresh idempotency key. Backend eligibility remains authoritative. Show failures in the dialog; after confirmed success, refresh authoritative detail and the receipt results. Closing the dialog restores focus to the originating row. The original confirmed ledger entry is never modified or deleted.

## Boundaries

Do not edit `TransactionDashboard` or change Cashier behavior. Do not edit Admin's shared `TransactionWorkspace`. Do not create schema migrations, expose customer PII, add client-selected branch scope, loosen endpoint roles, or implement reversal eligibility in the UI.

## Verification

Test normalized receipt search, required input, pagination bounds, tenant/branch scoping, role denial, response IDs, and absence of PII. Test loading/error/empty/stale detail states, keyboard row selection, dialog focus/Escape behavior, validation, CSRF/idempotency on reversal, and confirmed-success refresh. Retain the existing reversal smoke evidence that the source transaction stays confirmed and a compensating ledger record is created.
