# Change: Supervisor approval centre redesign

## Why

The Supervisor approvals route uses a dense, single-table workflow that does not match the supplied Figma reference. Reviewers need a focused queue and decision workspace, with backend support for the defined late receipt claim category and accurate cross-page category filtering/counts.

## What Changes

- Restyle only `/supervisor/approvals` with the supplied heading, category navigation, two-panel queue/detail layout, responsive behavior, status/search/page-size controls, and decision controls.
- Keep the shared Admin approvals panel presentation and existing authorization, CSRF, idempotency, status filtering, refresh, cursor pagination, and decision safeguards.
- Add late receipt claims as earn approvals when the receipt occurred more than seven elapsed days before the server receives the claim. Store them as pending approvals with reason code `LATE_RECEIPT_CLAIM`; do not create ledger credit or SMS until the existing audited approval decision executes.
- Expose a typed approval category, a category filter applied before cursor pagination, and exact per-category counts scoped by tenant/branch, status, and search. Supervisor categories are High-value transaction and Late receipt claim. Do not show Manual adjustment or OTP override as Supervisor approval categories.
- Use API-provided categories/counts; do not classify records in the browser.
- Use the updated Recent customers title and customer subtitle, and keep a selected request's evidence, required free-text decision reason, Approve/Reject actions, and View Customer link in the detail card.
- Auto-select the first pending request when a page loads; after a confirmed decision remove it from the visible queue and select the next pending request.
- Keep the customer-oriented queue subtitle from the design, while recording that it appears to be placeholder copy for an approvals queue.

## Backend capability note

The approvals response provides request `id`, `requestedAmountKobo`, `requestedAt`, `expiresAt`, `decidedAt`, `executedAt`, nullable customer `id`/`fullName`, and nullable requester `username`/`role`. It does not provide wallet balance, lifetime earned, or submitted free-text reason. `reasonCode` is a policy code, not a submitted explanation. Show unavailable fields as “Not provided”; do not substitute `reasonCode` for submitted reason. Request ID is the API UUID (no AP-style display reference is returned).

The approval list will expose typed categories, a server-side category filter, and per-category counts that match caller scope, status, and search independently of cursor pagination. Manual adjustments remain Admin-only under the TRD and are excluded from the Supervisor queue; OTP overrides are not an MVP approval category.

## Impact

- `apps/web/components/workflows/approvals-panel.tsx` (Supervisor variant only)
- `apps/web/app/(shell)/supervisor/approvals/page.tsx`
- Supervisor route styles and focused frontend tests
- Approval/earn API contract and financial workflow for late receipt claims; no database schema migration is expected because `Approval.reasonCode`, receipt review state, and the existing audited decision path already persist the required state. Authorization and self-approval controls remain unchanged.
