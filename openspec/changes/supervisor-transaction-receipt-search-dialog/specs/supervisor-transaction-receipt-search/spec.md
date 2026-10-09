# Supervisor Transaction Receipt Search Specification

## Purpose

Define a branch-scoped Supervisor receipt-number lookup with authoritative transaction detail and a guarded reversal dialog.

## ADDED Requirements

### Requirement: Supervisor lists and filters branch transactions

The Supervisor transaction route MUST automatically load bounded transaction results in a cashier-style list/table when opened, without requiring a receipt number. Receipt number MUST be an optional exact-identity filter. The list endpoint MUST be read-only, authenticated, branch-scoped from session context, and return stable ledger-entry transaction IDs required by existing detail and reversal operations. It MUST NOT reuse or broaden the Cashier-only activity feed.

#### Scenario: Load the branch transaction list on entry

- **GIVEN** an authenticated Supervisor has a branch scope
- **WHEN** the Supervisor opens the transactions route without a receipt filter
- **THEN** the system returns the first bounded page of eligible ledger-backed EARN/REDEEM rows from that tenant and branch
- **AND** cursor pagination can retrieve the remaining rows without requiring a search term.

#### Scenario: Keep the results footer concise

- **WHEN** branch transaction results are rendered
- **THEN** the table does not repeat the static sentence `Results are limited to the authenticated branch.`
- **AND** the API continues to enforce the Supervisor's session-derived branch scope.

#### Scenario: Supervisor filters by receipt number

- **GIVEN** an authenticated Supervisor has a branch scope
- **WHEN** the Supervisor submits a receipt number
- **THEN** the system searches the authenticated tenant and branch using the normalized exact receipt identity
- **AND** returns bounded/paginated ledger-backed EARN/REDEEM rows with transaction ID, receipt number, operation, amount in integer kobo, status, effective time, customer name, receipt purchase amount, and cashier filter identity
- **AND** returns only cashier filter options associated with receipts matching that identity in the authenticated branch
- **AND** does not disclose customer phone, email, or unrelated tenant/branch transactions.

#### Scenario: Search cannot select another branch

- **WHEN** a caller submits a branch identifier, lacks required Supervisor role, or has no branch scope
- **THEN** request data cannot widen the authenticated branch scope and access fails closed.

### Requirement: Branch transaction results default to newest-first date/time order

The transaction-list endpoint MUST order results by ledger effective time descending (newest first), with ledger-entry ID descending as a deterministic tie-breaker. This order MUST be applied before cursor pagination. The response's occurred-at value MUST represent that same effective time, and the table MUST preserve the server-returned order rather than sorting each cursor page independently.

#### Scenario: List without a sort request

- **WHEN** a Supervisor loads or filters the transaction list without specifying a sort
- **THEN** the newest effective transaction is first
- **AND** transactions with equal effective times are ordered by descending ledger-entry ID.

#### Scenario: Continue date-ordered cursor pages

- **GIVEN** a receipt search has more than one bounded page
- **WHEN** the Supervisor advances through cursor pages
- **THEN** the same descending time and ID order continues across pages without client-side reordering.

### Requirement: Supervisor filters and reviews transaction columns

The transaction table MUST offer status, staff, and minimum receipt amount filters. The endpoint MUST apply each submitted filter within the authenticated tenant and branch scope before cursor pagination. A minimum amount submitted in naira MUST be converted to integer kobo exactly; malformed, negative, or out-of-range values MUST fail validation. Filter changes MUST reset pagination to the first page. Status choices MUST be limited to outcomes the API can establish (`CONFIRMED` and `REVERSED`), and staff options MUST be limited to cashiers associated with branch receipts, narrowed to the exact receipt when a receipt filter is present.

The table MUST display Receipt No., Name, Receipt amount, Credit, Date & Time, and Status. It MAY return the customer's name and receipt amount for this Supervisor-only, branch-scoped view, but MUST NOT return customer phone or email. Credit MUST be shown only for EARN transactions; it is not applicable to REDEEM rows. The table MUST omit an Eligible amount column because the TRD and current data model do not define an authoritative eligible amount.

#### Scenario: Apply filters across cursor pages

- **GIVEN** a Supervisor has loaded the branch transaction list and selected a supported status, staff member, minimum amount, or receipt filter
- **WHEN** the Supervisor submits the filters or navigates between result pages
- **THEN** all filters are applied server-side within the same session-derived branch
- **AND** the cursor is reset when the filter set changes
- **AND** a cursor page does not silently omit rows due to client-only filtering.

#### Scenario: Show only authoritative column values

- **WHEN** filtered transaction results are rendered
- **THEN** customer name, receipt amount, credit, date/time, and status reflect the authorized search response
- **AND** no Eligible amount column is shown without an authoritative definition and source.

### Requirement: Refresh current branch transaction results

The results view MUST provide a refresh control after the initial branch-scoped list request has completed. Refresh MUST repeat the branch-scoped request with the same optional receipt filter, applied filters, and current cursor. It MUST preserve the current page and visible rows while loading, and MUST NOT load selected transaction detail or initiate a write. Refresh MUST be unavailable while a request is in progress or while filter edits are unapplied.

#### Scenario: Refresh the current page

- **GIVEN** a Supervisor has loaded transaction results on any cursor page with no unapplied filter edits
- **WHEN** the Supervisor activates Refresh
- **THEN** the same optional receipt filter, applied filters, and page cursor are requested within the authenticated branch scope
- **AND** the prior rows remain visible until the response is handled
- **AND** the page number does not change.

#### Scenario: Refresh is unavailable before initial load or with unapplied filters

- **GIVEN** the initial branch list has not finished loading or filter values have changed without being applied
- **WHEN** the results controls render
- **THEN** Refresh is disabled until the current branch-scoped query is settled and no filter edits are pending.

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
