## ADDED Requirements

### Requirement: Customer registration is role-safe and contract-accurate

Customer registration MUST be available only to roles authorized by the backend and MUST submit only fields represented by the persistence contract.

#### Scenario: Cashier views customer actions

- **WHEN** a Cashier opens customer-facing navigation
- **THEN** registration is hidden or explicitly rejected according to backend RBAC
- **AND** the UI does not imply that Cashier can create customers

#### Scenario: Registration succeeds

- **WHEN** an authorized Supervisor or Admin creates a customer
- **THEN** the success state describes only persisted results
- **AND** it does not claim a card was issued unless card assignment was completed and confirmed

### Requirement: Customer creation and initial card issuance are atomic

Supervisor/Admin customer registration MUST create the customer and initial card in one authorized, idempotent, auditable backend transaction.

#### Scenario: Atomic registration succeeds

- **WHEN** an authorized Supervisor or Admin submits valid customer and initial-card data
- **THEN** customer and card creation commit together
- **AND** the success state identifies both persisted resources

#### Scenario: Atomic registration fails

- **WHEN** validation, authorization, conflict, or persistence fails
- **THEN** neither customer nor initial card is presented as created
- **AND** the response identifies the actionable failure without leaving a partial onboarding state

### Requirement: Card lifecycle actions remain explicit

Card replacement, blocking, and reactivation MUST use their own authorized, auditable workflows after initial onboarding.

#### Scenario: Existing card lifecycle action is requested

- **WHEN** an authorized Supervisor or Admin replaces, blocks, or reactivates a card
- **THEN** the action uses its dedicated backend contract and idempotency rules
- **AND** the UI renders the authoritative resulting card status and any SMS/audit outcome

### Requirement: MVP registration fields match the approved TRD and API contract

The MVP registration frontend MUST submit full name, normalized phone, initial card barcode, required loyalty-service consent, and an independent optional marketing choice. Consent and privacy-notice versions, actor, and timestamp MUST be server-owned and persisted. Birthday remains excluded. Consent copy/version changes require a reviewed contract and migration where data semantics change.

#### Scenario: Registration form renders

- **WHEN** an authorized Supervisor or Admin opens registration
- **THEN** the form contains approved identity/card fields and a separate required loyalty-consent choice plus optional marketing choice
- **AND** the server persists consent evidence atomically with the customer and initial card

#### Scenario: A future field is requested

- **WHEN** a birthday or further consent field is proposed
- **THEN** implementation waits for an approved TRD/API/schema change
- **AND** no browser-only field is added to the production form
