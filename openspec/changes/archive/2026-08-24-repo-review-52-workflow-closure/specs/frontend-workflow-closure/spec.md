## ADDED Requirements

### Requirement: Route-backed workspaces are role-aware and human-safe

The frontend SHALL expose cashier, supervisor, and admin workspaces through role-aware route entry points and SHALL NOT treat SYSTEM as a human admin.

#### Scenario: Persona navigation matches the authenticated role

- **GIVEN** a user is authenticated as cashier, supervisor, or admin
- **WHEN** the shell renders
- **THEN** the user sees the route entry points and controls that match that role
- **AND** unsupported persona areas are hidden or rendered non-actionable

#### Scenario: SYSTEM is not shown as a human admin

- **GIVEN** the session resolves to SYSTEM or another non-human technical actor
- **WHEN** the shell renders
- **THEN** human admin navigation is not exposed
- **AND** the UI does not imply that the technical actor can use staff workspaces as a normal user

#### Scenario: Unauthorized routes fail safely

- **GIVEN** a user opens a route they cannot access
- **WHEN** authorization is resolved
- **THEN** the user sees an authorization-aware fallback state
- **AND** no forbidden workflow data is rendered

### Requirement: Public configuration is visible shell context

The frontend SHALL render public branch, tenant, timezone, receipt-week-start, policy, and offline-redemption context where those values affect the user decision.

#### Scenario: Shell shows live organization context

- **GIVEN** public configuration is available
- **WHEN** the shell renders
- **THEN** the current tenant, branch identity, and timezone are visible
- **AND** receipt-week-start and policy values that shape workflows are available in the relevant workspace

#### Scenario: Missing public config fails gracefully

- **GIVEN** public configuration is temporarily unavailable
- **WHEN** the shell renders
- **THEN** the UI shows a non-destructive fallback state
- **AND** the app does not invent branch, tenant, policy, or offline-redemption values

### Requirement: Placeholder affordances are not treated as real actions

The frontend SHALL NOT present no-op buttons, fake cards, or summary text as if they were operational workflows.

#### Scenario: Nonfunctional control is removed or hidden

- **GIVEN** a button or card has no real handler or navigation target
- **WHEN** the workspace renders
- **THEN** the control is hidden, disabled, or replaced with truthful copy
- **AND** the user is not misled into expecting a working action

#### Scenario: Demo metrics are not shown as operational truth

- **GIVEN** a previous panel showed demo numbers
- **WHEN** the new workflow loads
- **THEN** it either uses live data or stays hidden until the source exists

### Requirement: Cashier lookup is aligned to supported identifier behavior

The cashier workflow SHALL only advertise lookup paths that the current backend contract actually supports.

#### Scenario: Lookup prompt matches backend support

- **GIVEN** the cashier opens lookup
- **WHEN** the prompt is shown
- **THEN** it advertises card serial, receipt identifier, or both only if the current backend path supports them
- **AND** unsupported lookup claims are not shown as if they were real

#### Scenario: Lookup returns identity, balance, and policy context

- **GIVEN** a cashier enters a valid identifier
- **WHEN** the lookup action runs
- **THEN** the UI shows customer identity, card status, customer balance, expiring credit, and relevant policy context
- **AND** the workflow can proceed directly into earn, redeem, or customer detail

#### Scenario: Lookup failure stays recoverable

- **GIVEN** the identifier cannot be resolved
- **WHEN** the lookup action fails
- **THEN** the cashier sees a recoverable error state
- **AND** the previously entered draft context is not lost silently

### Requirement: Earn is a reviewed, confirmable workflow

The cashier workflow SHALL require a review step before earn submission.

#### Scenario: Earn preview shows expected credit and outcome

- **GIVEN** the cashier has selected a customer and entered a purchase amount
- **WHEN** the draft is complete
- **THEN** the UI shows the expected credit, new balance, expiry context, and any approval or SMS status the backend may return
- **AND** the cashier must confirm before submission

#### Scenario: Earn success shows rich transaction detail

- **WHEN** an earn request succeeds
- **THEN** the result view shows customer, card, transaction identifier, purchase amount, credited amount, balance effect, and status
- **AND** the user can navigate to customer detail or start a new transaction

#### Scenario: Earn failure can become offline capture

- **GIVEN** the network or transport path is unavailable
- **WHEN** an earn request fails and the workflow is eligible for offline capture
- **THEN** the same logical draft and idempotency key are persisted locally
- **AND** the record can later appear in the offline queue

### Requirement: Redeem is a reviewed, confirmable workflow

The cashier workflow SHALL require a review step before redeem submission.

#### Scenario: Redeem preview shows allowed amount and consequence

- **GIVEN** the cashier has selected a customer and entered a basket amount
- **WHEN** the draft is complete
- **THEN** the UI shows available balance, calculated maximum redemption, minimum redemption context, and resulting balance
- **AND** the cashier must confirm before submission

#### Scenario: Redeem does not copy available balance into basket amount

- **GIVEN** the lookup reveals the customer's available balance
- **WHEN** the redeem draft is prefilled
- **THEN** available balance is shown as context only
- **AND** basket amount remains user-entered

#### Scenario: Redeem blocks over-limit submission

- **GIVEN** the requested redemption exceeds the calculated maximum
- **WHEN** the cashier reaches confirmation
- **THEN** the UI prevents submission before the backend call
- **AND** the user sees why the request cannot proceed

#### Scenario: Redeem success shows rich transaction detail

- **WHEN** a redeem request succeeds
- **THEN** the result view shows customer, card, transaction identifier, redeemed amount, balance effect, and status
- **AND** the user can navigate to customer detail or start a new transaction

### Requirement: Draft state and idempotency survive retry and refresh

The cashier workflow SHALL preserve the logical transaction draft long enough for a safe retry.

#### Scenario: Retry reuses the same logical draft

- **GIVEN** a cashier has already prepared an earn or redeem draft
- **WHEN** the page refreshes or the request is retried after a transient failure
- **THEN** the workflow restores the same logical draft context
- **AND** the backend does not receive a new accidental transaction identity for the same user intent

### Requirement: Customer detail is reachable from cashier outcomes

The cashier workflow SHALL let the user move from a transaction result into the related customer record.

#### Scenario: Result links into customer detail

- **GIVEN** an earn or redeem has completed
- **WHEN** the user selects the customer link
- **THEN** the customer detail view opens with balance and recent transaction context

### Requirement: Customer and card management are split by role

The frontend SHALL expose read-only customer/card review to cashiers and mutation workflows to supervisor or admin roles only.

#### Scenario: Cashier sees read-only customer detail

- **GIVEN** a cashier opens a customer detail path
- **WHEN** the screen renders
- **THEN** the cashier can view identity, balance, linked cards, and history
- **AND** mutation affordances are not shown

#### Scenario: Supervisor and admin can mutate customer and card state

- **GIVEN** a supervisor or admin opens customer or card management
- **WHEN** the screen renders
- **THEN** assignment, replacement, block/unblock, create, edit, and status-change workflows are available where supported

#### Scenario: Card replacement uses the generated request shape

- **GIVEN** an operator submits a card replacement
- **WHEN** the request payload is assembled
- **THEN** the generated DTO shape is used
- **AND** the request is not suppressed behind `as any`

### Requirement: Offline sync is a device-authenticated reconciliation flow

The frontend SHALL present offline sync as a reconciliation workflow with per-record evidence and authenticated device context.

#### Scenario: Device context comes from the authenticated device/session

- **GIVEN** the user is signed in on a registered device
- **WHEN** the sync queue is prepared for submission
- **THEN** the device context is derived from authenticated session/device state
- **AND** the user is not asked to manually invent or re-enter the device identity

#### Scenario: Queue items show authoritative record states

- **GIVEN** the local offline queue contains pending or previously attempted records
- **WHEN** the sync queue renders
- **THEN** each record shows its authoritative state, outcome, and rejection reason when available

#### Scenario: Retry preserves evidence

- **GIVEN** a batch partially succeeds or fails
- **WHEN** the operator retries eligible records
- **THEN** the original local evidence remains available
- **AND** only the retryable subset is resubmitted

### Requirement: Supervisor decision and reporting surfaces are truthful

The frontend SHALL make approvals, fraud, reports, pilot health, pilot operations summary, export, and reversal honest and contract-aligned.

#### Scenario: Approvals and fraud require explicit operator reasons

- **GIVEN** a supervisor approves, rejects, or marks fraud
- **WHEN** the decision is submitted
- **THEN** the entered reason or controlled value is sent
- **AND** the UI does not silently substitute a generic reason

#### Scenario: Fraud and approval queues are filterable and paginated

- **GIVEN** a supervisor opens fraud or approval queues
- **WHEN** the list renders
- **THEN** the supported filters and pagination controls are available
- **AND** the user can narrow the queue before deciding

#### Scenario: Pilot health and reports read the exact backend contract

- **GIVEN** a pilot health or report summary loads
- **WHEN** the data is mapped into the UI
- **THEN** the UI uses the published backend field names and states
- **AND** it does not infer success from missing or renamed properties

#### Scenario: Pilot operations summary uses a dedicated shape

- **GIVEN** the pilot operations summary loads
- **WHEN** the panel renders
- **THEN** the UI uses the dedicated summary contract shape or adapter
- **AND** it does not pretend the summary is a generic report collection

#### Scenario: Export produces a downloadable file

- **GIVEN** a report export is supported by the backend
- **WHEN** the user clicks export
- **THEN** the browser initiates an actual download or save action
- **AND** the user receives the exported file, not only a status message

#### Scenario: Transaction reversal previews the correct amount

- **GIVEN** a supervisor opens a reversible transaction
- **WHEN** the reversal preview renders
- **THEN** the canonical amount for that transaction type is shown
- **AND** the user sees the consequence preview before confirming

### Requirement: Admin operations are live and consequence-aware

The frontend SHALL make admin actions preview consequences and respect backend configuration.

#### Scenario: Adjustment preview shows balance impact

- **GIVEN** an admin opens a manual adjustment form
- **WHEN** the draft is updated
- **THEN** the customer context and balance impact are visible before confirmation

#### Scenario: Branch defaults respect receipt-week-start configuration

- **GIVEN** an admin creates or updates a branch
- **WHEN** the branch form renders or submits
- **THEN** the configured receipt-week-start value is respected

#### Scenario: Users, devices, audit, and pilot ops are live-data surfaces

- **GIVEN** an admin opens users, devices, audit, or pilot operations
- **WHEN** the workspace renders
- **THEN** it uses live backend data
- **AND** it does not show demo metrics or placeholder summaries

#### Scenario: Pilot summary and pilot health are not demo panels

- **GIVEN** an admin opens pilot operations views
- **WHEN** the panels render
- **THEN** the UI shows the live operational data returned by the backend
- **AND** the user can tell when the panel is stale or unhealthy

### Requirement: UI affordances and quality gates remain truthful

The frontend SHALL not render controls that look actionable but do nothing, and the change SHALL be covered by workflow regression tests.

#### Scenario: Nonfunctional controls are hidden or disabled

- **GIVEN** a button, card, or link has no real action
- **WHEN** the workspace renders
- **THEN** the control is hidden, disabled, or replaced with truthful copy

#### Scenario: Empty and error states are actionable

- **GIVEN** a workspace has no data or an error occurs
- **WHEN** the state is shown
- **THEN** the UI explains the next real action the user can take
- **AND** the state is not decorative

#### Scenario: Regression coverage accompanies the workflow change

- **GIVEN** the frontend workflow closure is implemented
- **WHEN** the change is reviewed
- **THEN** route, accessibility, visual-regression, and e2e coverage exist for the affected persona workflows
