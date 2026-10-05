## Why

The current Manage customers screen keeps search results and an editable customer record side by side, leaving the list cramped and the page visually unbalanced. A full-width result list followed by a focused, guarded edit dialog makes search and profile management distinct, easier-to-understand steps.

This change intentionally supersedes the previous direct-profile-panel behavior for Manage customers. Registration review and card-assignment review remain separate workflows.

## What Changes

- Replace the two-column customer search/details workspace with full-width selectable customer rows.
- Open an editable Customer details dialog after authoritative detail loading and identity verification, including for stable-ID deep links.
- Keep profile editing, progressive account-status controls, linked-card summary, and card navigation inside the dialog; do not duplicate card lifecycle controls.
- Guard dirty close attempts with Keep editing / Discard confirmation.
- On confirmed profile save, reload and verify the record, update its search row, close the dialog, and announce a temporary success toast; keep failures in the dialog.

## Capabilities

### New Capabilities

- `supervisor-customer-management-dialog`: Defines full-width customer search results and verified profile/account editing in a guarded dialog.

### Modified Capabilities

None. The prior registration-review change is retained as history; this new capability supersedes its Manage customers presentation requirement for the current implementation.

## Impact

- `apps/web/components/workflows/supervisor-customer-workflows.tsx` and a new `CustomerDetailsDialog` component.
- Supervisor customer route styles and focused Jest/Playwright coverage.
- Existing generated customer read/update/status APIs only; no API, database, consent, or card-lifecycle contract changes.
