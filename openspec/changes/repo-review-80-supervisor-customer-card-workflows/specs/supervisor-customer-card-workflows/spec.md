# supervisor-customer-card-workflows Specification

## Purpose

Define focused Supervisor customer and physical-card workflows on existing routes while preserving backend-owned identity, eligibility, financial, lifecycle, audit and authorization decisions.

## ADDED Requirements

### Requirement: Customer and card routes provide focused task tabs

The Supervisor customer and card routes MUST each expose two directly addressable task tabs and render only the selected tab's primary workspace. Existing route paths MUST remain unchanged.

#### Scenario: Supervisor opens each route

- **WHEN** the Supervisor opens `/supervisor/customers`
- **THEN** the route offers `Register customer` and `Manage customers`
- **AND** only the selected task workspace is presented.
- **WHEN** the Supervisor opens `/supervisor/cards`
- **THEN** the route offers `Assign card` and `Manage cards`
- **AND** only the selected task workspace is presented.

#### Scenario: Tab state is linked directly

- **WHEN** a user loads, reloads, shares, or navigates back/forward to a supported tab URL
- **THEN** the matching tab is selected without changing the existing route path
- **AND** missing or invalid tab state resolves to the documented default
- **AND** URL context is not treated as authoritative customer/card data.

#### Scenario: Tab selection is browser-navigable

- **GIVEN** the Supervisor is on either customer or card task route
- **WHEN** the Supervisor selects a different task tab
- **THEN** the selected tab URL is added to browser history
- **AND** browser back and forward restore the corresponding selected task.

### Requirement: Customer registration is independent and atomic

Registration MUST open with an empty create form, require the fields supported by the existing contract including the initial card serial, and use the current atomic registration operation. It MUST NOT create a customer and first card in separate requests.

#### Scenario: Register first card with new customer

- **GIVEN** the registration tab is open
- **WHEN** the user submits valid full name, phone, and unused first-card serial (and optional supported email)
- **THEN** the frontend calls the existing customer-registration operation once with the required initial card serial and existing idempotency behavior
- **AND** reports success only after confirmed success, explicitly communicating that customer and card were registered together.

#### Scenario: Registration form remains blank

- **GIVEN** a customer was previously found or a customer ID is in URL context
- **WHEN** the user opens or switches to `Register customer`
- **THEN** the form is a new blank registration form and cannot silently edit the selected customer.

#### Scenario: Duplicate customer/card or invalid registration

- **WHEN** the existing backend rejects a duplicate normalized phone, duplicate/assigned serial, invalid field, or other registration conflict
- **THEN** the error is presented beside the appropriate task with values retained for correction
- **AND** no success state or partial customer/card result is shown.
- **WHEN** the conflict is a duplicate phone
- **THEN** the workflow uses the existing authorized customer-search path with the submitted phone to identify a possible existing customer
- **AND** reloads the matched customer's authoritative detail before offering an ID-based link to Manage customers.
- **AND** if existing APIs cannot safely resolve the match, it offers a safe recovery path to Manage customers with the phone search prefilled; it MUST NOT disclose an unverified match or require a new API contract without approval.

### Requirement: Customer management requires explicit selection

Manage customers MUST require deliberate selection from customer search/results before profile editing, status change, or card handoff. It MUST show customer identity/contact/status and only compact relevant linked-card context; customer and card statuses MUST remain distinct.

#### Scenario: Search and inspect a customer

- **WHEN** the user searches by supported name, phone, or customer ID and receives results
- **THEN** no result is implicitly selected
- **AND** selecting a result loads its authoritative detail before write actions are enabled.

#### Scenario: Edit profile or change customer status

- **GIVEN** a customer is explicitly selected and loaded
- **WHEN** the user edits supported profile fields or requests a supported customer status transition
- **THEN** the existing customer endpoint is used and its response/error remains authoritative
- **AND** customer status is labeled as customer status, not card status.

#### Scenario: Open linked card task

- **GIVEN** an explicitly loaded customer with linked card context
- **WHEN** the user opens card management
- **THEN** navigation passes the stable customer ID and intended tab
- **AND** the destination reloads current server details before enabling card actions.

### Requirement: Existing-customer card assignment enforces eligibility and uniqueness

Assign card MUST be a task for an existing customer with no active card, requiring explicit customer selection and a fresh new serial. Client-side eligibility is guidance; backend policy remains authoritative.

#### Scenario: Select eligible customer

- **GIVEN** a customer is explicitly selected in assignment
- **WHEN** authoritative details show the customer is active and has no active card
- **THEN** the assignment form allows entry of a new card serial and review before submit
- **AND** the serial field starts blank and never inherits any linked card serial.

#### Scenario: Ineligible customer or active card

- **WHEN** authoritative customer details show a non-active customer or an active card
- **THEN** assignment is blocked with the precise available status/context
- **AND** an active-card case offers the existing Manage cards path for replacement/status work rather than a second assignment.

#### Scenario: Duplicate card serial or stale eligibility

- **WHEN** an entered serial conflicts, or eligibility changes between load and submit
- **THEN** the existing backend response is shown as a correctable conflict/ineligibility error
- **AND** no optimistic assignment is shown; authoritative details are refreshed before another write.

### Requirement: Card management respects lifecycle status boundaries

Manage cards MUST provide a read-only tenant-scoped card lookup at `GET /api/v1/cards/management/lookup/{serialNumber}`, require explicit card selection and show sufficient card/customer context to prevent acting on the wrong account. It MUST show only supported actions for the authoritative current card/customer status. Only `SUPERVISOR` and `ADMIN` may use this endpoint. Tenant scope MUST always come from authenticated context and MUST NOT be request-selected. Lookup MUST canonicalize serial matching case-insensitively; return ACTIVE, BLOCKED and REPLACED cards; return 404 when no tenant-scoped match exists; and fail closed rather than choose arbitrarily when canonical matches are ambiguous. The authoritative response MUST contain card `id`, `serial`, `status`, `issuedAt`, `blockedAt`, `replacedAt`, `replacedByCardId`, and `customer` `{ id, fullName, status }` only. It MUST exclude phone, email, balance, audit and internal actor details. It MUST be bounded by the existing card-lookup throttle policy. It is read-only and MUST NOT change DB/schema, RBAC policy, or status policy. Existing Cashier `GET /cards/lookup/:serialNumber` MUST remain unchanged and continue its active-card behavior.

#### Scenario: Locate a card for management

- **WHEN** a Supervisor or Admin submits a serial to `GET /api/v1/cards/management/lookup/{serialNumber}`
- **THEN** the server performs canonical, case-insensitive lookup in the authenticated tenant and returns authoritative ACTIVE, BLOCKED or REPLACED card data using only the specified response fields
- **AND** no match in that tenant returns 404 and ambiguous canonical matches fail closed rather than selecting an arbitrary card
- **AND** no card is implicitly selected for a lifecycle mutation, and the selected card/customer are reloaded authoritatively before enabling an action.
- **AND** the endpoint is read-only and follows existing card-lookup throttling; phone, email, balance, audit and internal actor details are absent.

#### Scenario: Management lookup enforces role and tenant boundaries

- **WHEN** a Cashier or any other unauthorized role calls the management lookup, or a caller attempts to select a tenant through request data
- **THEN** authorization denies the unauthorized role and tenant scope remains derived only from authenticated context
- **AND** no cross-tenant card is disclosed.
- **AND** the existing Cashier `GET /cards/lookup/:serialNumber` remains unchanged and continues to return its active-card behavior.

#### Scenario: Active card is selected

- **WHEN** an active card linked to an active customer is selected
- **THEN** the available lifecycle operations are replacement and supported status change (block)
- **AND** each operation reveals only its own fields and confirmation controls.

#### Scenario: Blocked card is selected

- **WHEN** a blocked card is selected
- **THEN** a supported reactivation action may be offered only when the existing status API and authoritative customer state permit it
- **AND** the user receives an action-specific confirmation.

#### Scenario: Replaced or otherwise unsupported card status

- **WHEN** a replaced/terminal card or unsupported customer/card state is selected
- **THEN** no lifecycle write control is offered for that unsupported action
- **AND** status is explained without conflating customer and card state.

### Requirement: Replacement preserves customer-owned balance

Replacement MUST use the existing replacement operation, maintain card history, and preserve the existing customer wallet/balance without a transfer or separate financial write.

#### Scenario: Replace a lost active card

- **GIVEN** an active card is selected and its customer is active
- **WHEN** the Supervisor enters an unused replacement serial, reviews the linked customer/card and confirms
- **THEN** the existing replacement operation is called for that card with its existing idempotency contract
- **AND** on confirmed success the old card is represented as replaced and the new card is associated with the same customer
- **AND** the customer's balance is unchanged and no balance-transfer transaction is attempted.

#### Scenario: Replacement serial conflict or request failure

- **WHEN** replacement serial is already in use or the operation fails
- **THEN** the old card remains displayed according to refreshed authoritative state, the entered serial may be corrected, and the frontend does not claim replacement success.

### Requirement: Deep links carry identity but reload authority

Cross-tab/cross-route handoffs MUST preserve existing routes, pass customer identity by stable ID rather than displayed name, and reload authoritative customer/card state before enabling a write.

#### Scenario: Customer context opens card management

- **WHEN** a user follows a Manage customers card link or directly opens a supported assignment/management context link
- **THEN** the URL contains a customer ID and intended tab using the established parameter convention
- **AND** destination details and eligibility are re-fetched from existing APIs
- **AND** absent, invalid, inaccessible, or stale IDs produce a truthful empty/error state without allowing a write.

### Requirement: Authorization and backend-owned audit remain intact

Frontend controls MUST reflect the existing Supervisor/Admin permission boundary but MUST NOT be treated as the authority for access, identity, eligibility, status, or audit. This change MUST NOT weaken backend role enforcement or alter audit events.

#### Scenario: Authorized supervisor or admin uses workflow

- **WHEN** an authorized role enters customer/card management
- **THEN** only actions supported by existing contracts are available and existing CSRF/idempotency request behavior is retained.

#### Scenario: Unauthorized user attempts access or write

- **WHEN** a role without permission attempts a protected route/action or an API request is denied
- **THEN** current shell/API authorization behavior remains in force and no client-side role check is treated as sufficient enforcement.

#### Scenario: Successful or failed lifecycle operation

- **WHEN** an existing registration, assignment, replacement, or status operation is submitted
- **THEN** backend-owned audit behavior remains unchanged
- **AND** the UI displays user-actionable outcome without rendering raw response JSON or internal diagnostics.

### Requirement: Errors and retries are truthful and safe

The workflow MUST distinguish validation, duplicate/conflict, ineligible status, authorization, network/server failure, pending and confirmed outcomes; preserve user input when correction is safe; prevent duplicate submission; and use existing idempotency contracts without creating a new operation or claiming an uncertain outcome as success.

#### Scenario: A state-changing request is pending

- **WHEN** a mutation is in flight
- **THEN** duplicate submission is disabled and the operation is visibly pending.

#### Scenario: A mutation fails or times out

- **WHEN** a mutation returns a rejection or uncertain transport failure
- **THEN** no success is reported, safe entered values are retained, the user gets a clear next action, and current state is reloaded before a retry that could otherwise duplicate a write.

#### Scenario: A mutation is retried

- **WHEN** retry is safe under the existing idempotency contract
- **THEN** the same logical operation/payload uses the correct stable idempotency key according to current client behavior
- **AND** a changed payload starts a new logical operation only after the earlier outcome is resolved or reconciled.

### Requirement: Workflow presentation is accessible and responsive

Each selected workspace MUST expose a coherent heading, labeled controls, meaningful status/error announcements, visible focus, keyboard-operable tabs/actions, and logical DOM reading order. At supported desktop and mobile widths, the active workspace MUST use available width without horizontal page overflow; inactive workspaces MUST NOT be stacked below it.

#### Scenario: Keyboard and assistive technology use tabs

- **WHEN** a keyboard or screen-reader user navigates either route
- **THEN** tab role/selection state, associated panel, focus behavior, form labels, validation feedback, confirmations, loading and result announcements are programmatically available.

#### Scenario: Narrow viewport displays any workspace

- **WHEN** either route is viewed at desktop, tablet, or narrow mobile widths
- **THEN** the one active workflow reflows into a readable single-column order as space requires
- **AND** controls remain operable with no horizontal document overflow or clipped error/confirmation content.

#### Scenario: Tablet shell help link remains accessible on Supervisor routes

- **WHEN** a Supervisor customer or card workspace is displayed at tablet width
- **THEN** the shared sidebar's Help & Training link remains visually contained and keeps its accessible name
- **AND** the route-scoped treatment MUST NOT change Admin or Cashier rendering.

### Requirement: Workflow acceptance covers failure and status matrix

Focused tests MUST demonstrate the workflows against existing contracts and the approved management lookup contract, including API/OpenAPI/generated-client agreement, role, tenant isolation, response privacy, throttle behavior, uniqueness, eligibility, lifecycle, retry, responsiveness, and accessibility behavior.

#### Scenario: Required test matrix is reviewed

- **WHEN** the change is proposed for acceptance
- **THEN** tests cover new registration and atomic first-card request; duplicate phone/card; explicit versus absent selection; active/blocked customer; customer already having active card; duplicate serial; active/blocked/replaced card; lost-card replacement and unchanged balance; failed/uncertain request and retry; unauthorized role; URL ID reload/staleness; and desktop/mobile/accessibility states.
- **AND** API tests cover management lookup canonical/case-insensitive matching, all supported card statuses, exact response allowlist and excluded fields, 404 no-match, ambiguous-match fail-closed behavior, authenticated-tenant isolation, SUPERVISOR/ADMIN-only authorization, existing lookup throttle policy and read-only behavior.
- **AND** regression tests confirm existing Cashier lookup active-card behavior is unchanged, with OpenAPI and generated client generated using repository CLIs rather than hand-edited.
