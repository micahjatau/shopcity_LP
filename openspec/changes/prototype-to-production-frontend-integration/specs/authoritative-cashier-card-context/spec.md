## ADDED Requirements

### Requirement: Financial cashier workflows require verified card context

Earn and Redeem MUST resolve card context through the authoritative card lookup contract before enabling submission.

#### Scenario: Cashier starts a financial workflow

- **WHEN** a cashier scans or enters a card serial
- **THEN** the frontend calls the authoritative card lookup endpoint
- **AND** it renders server-provided customer, masked phone, status, eligibility, and balance context
- **AND** directory search or a URL customer ID alone cannot unlock the financial form

#### Scenario: Earn or Redeem is submitted

- **WHEN** a cashier submits a verified financial workflow
- **THEN** the request contains the verified card serial, integer-kobo values, CSRF protection, and an idempotency key
- **AND** the client does not derive card identity, balance, role, eligibility, or approval from browser state

### Requirement: Cashier login supplies device context for offline work

Normal cashier authentication MUST provide the device, branch, actor, and session context required to create and reconcile Offline Earn records.

#### Scenario: Cashier opens Offline Earn after login

- **WHEN** an authenticated cashier opens Offline Earn
- **THEN** the queue record uses authenticated context
- **AND** the production UI does not require manually typed device, cashier, or branch identifiers

### Requirement: Financial workflow outcomes remain explicit

The frontend MUST distinguish confirmed, pending approval, duplicate, inactive-card, insufficient-balance, offline, retry, and session-expired outcomes.

#### Scenario: Financial submission is rejected or deferred

- **WHEN** the backend returns a typed rejection or pending result
- **THEN** the UI renders the corresponding state and stable error code/message
- **AND** it does not show a generic success card
