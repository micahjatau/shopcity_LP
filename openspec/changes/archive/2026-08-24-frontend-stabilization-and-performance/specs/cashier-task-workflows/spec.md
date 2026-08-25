## ADDED Requirements

### Requirement: Cashier overview is a task launch surface

The cashier overview SHALL present current branch/device/connection context, sync status, recent operational activity, and the three primary actions Earn, Redeem, and Find customer without embedding the full transaction forms.

#### Scenario: Cashier opens the overview

- **WHEN** an authenticated cashier opens `/cashier`
- **THEN** the page shows the current operational context and sync state
- **AND** it presents Earn, Redeem, and Find customer as the primary actions
- **AND** it does not render the full lookup, earn, or redeem form bodies

### Requirement: Lookup is a focused identification workflow

The Lookup route SHALL support scan/type entry, loading, empty, error, resolved customer/card context, and explicit next actions for Earn, Redeem, and Customer.

#### Scenario: Card lookup resolves

- **WHEN** a cashier submits a valid card serial
- **THEN** the route shows the customer identity, card status, available balance, and permitted next actions
- **AND** the page does not expose unrelated policy tables or diagnostic identifiers

#### Scenario: Card lookup fails

- **WHEN** lookup returns an error or no matching card
- **THEN** the route shows an inline actionable error or empty state
- **AND** the cashier can retry without losing the input value

### Requirement: Earn is a contextual transaction workflow

The Earn route SHALL show only the selected customer/card context, purchase amount entry, contextual earn calculation, review, submission, and authoritative result states.

#### Scenario: Cashier reviews Earn

- **WHEN** a valid customer/card context and purchase amount are present
- **THEN** the page shows the expected credit using backend-provided policy context
- **AND** the cashier can review before submission
- **AND** the UI does not claim ledger success before the backend confirms it

### Requirement: Redeem is a contextual transaction workflow

The Redeem route SHALL show only the selected customer/card context, available credit, basket amount, applicable redemption maximum, review, submission, and authoritative result states.

#### Scenario: Cashier reviews Redeem

- **WHEN** a valid customer/card context and basket amount are present
- **THEN** the page shows the applicable maximum redemption
- **AND** the cashier can review before submission
- **AND** the UI prevents submission when the requested amount is not eligible

### Requirement: Cashier workflows expose complete interaction states

Each cashier route SHALL provide accessible loading, empty, error, disabled, success, offline, and sync-pending states that preserve the user's context and explain the next action.

#### Scenario: Workflow is offline

- **WHEN** the cashier loses connectivity during an eligible Offline Earn operation
- **THEN** the UI clearly identifies the offline mode and device readiness
- **AND** it reports durable local persistence only after the storage write succeeds
- **AND** it provides the queue/sync state without falsely claiming server confirmation

### Requirement: Cashier workflow surfaces meet the operational accessibility baseline

Cashier workflow routes SHALL use semantic headings and labels, visible focus states, keyboard-completable controls, minimum touch targets, contrast-compliant status colors, and reduced-motion-safe transitions.

#### Scenario: Keyboard cashier completes a workflow

- **WHEN** a cashier uses keyboard navigation through lookup or transaction controls
- **THEN** focus order follows the task order
- **AND** every control has an accessible name
- **AND** focus remains visible
