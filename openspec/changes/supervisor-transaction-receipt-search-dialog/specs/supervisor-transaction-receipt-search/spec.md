# Supervisor Transaction Receipt Search Specification

## Purpose

Define a branch-scoped Supervisor receipt-number lookup with authoritative transaction detail and a guarded reversal dialog.

## ADDED Requirements

### Requirement: Supervisor searches transactions by receipt number

The Supervisor transaction route MUST use receipt number as its search key and MUST present bounded transaction results in a cashier-style list/table. The search endpoint MUST be read-only, authenticated, branch-scoped from session context, and return stable ledger-entry transaction IDs required by existing detail and reversal operations. It MUST NOT reuse or broaden the Cashier-only activity feed.

#### Scenario: Supervisor searches a receipt

- **GIVEN** an authenticated Supervisor has a branch scope
- **WHEN** the Supervisor submits a receipt number
- **THEN** the system searches the authenticated tenant and branch using the normalized exact receipt identity
- **AND** returns bounded/paginated ledger-backed EARN/REDEEM rows with transaction ID, receipt number, operation, amount, status, and effective time
- **AND** does not disclose customer phone, email, or unrelated tenant/branch transactions.

#### Scenario: Search cannot select another branch

- **WHEN** a caller submits a branch identifier, lacks required Supervisor role, or has no branch scope
- **THEN** request data cannot widen the authenticated branch scope and access fails closed.

### Requirement: Transaction detail and reversal are selected in a dialog

Each transaction result MUST be keyboard- and pointer-selectable. Selecting a result MUST load current authoritative detail by its ledger-entry transaction ID and MUST display reversal controls only after a successful detail response. The reversal MUST use the existing CSRF-protected, idempotent operation with a reason and explicit confirmation; backend eligibility and immutable ledger policy remain authoritative.

#### Scenario: Open transaction details

- **WHEN** a Supervisor selects a transaction row
- **THEN** a focused dialog shows a loading state while authoritative detail is retrieved
- **AND** a failed, mismatched, or stale response cannot enable reversal controls.

#### Scenario: Reverse an eligible transaction

- **GIVEN** authoritative detail has loaded in the selected transaction dialog
- **AND** the Supervisor has entered a reason and typed `REVERSE`
- **WHEN** the Supervisor confirms the reversal
- **THEN** the frontend calls the existing reversal endpoint with CSRF protection and an idempotency key
- **AND** the original confirmed ledger entry remains unchanged
- **AND** success is shown only after the backend confirms the compensating reversal.

#### Scenario: Keep the dialog open during a reversal request

- **GIVEN** a reversal request is in progress
- **WHEN** the Supervisor presses Escape or attempts to close the dialog
- **THEN** the dialog remains open until the request resolves, so its outcome is not detached from the selected transaction.

#### Scenario: Close selected transaction

- **WHEN** the Supervisor closes the dialog or presses Escape outside a pending reversal request
- **THEN** the dialog closes without a write and focus returns to the originating result.
