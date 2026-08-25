## ADDED Requirements

### Requirement: Redemption validation precedes approval branching

The system MUST validate session, device, branch, card, customer, idempotency, receipt identity, active balance, minimum amount, basket cap, and sufficient balance before deciding whether a redemption is confirmed immediately or placed into pending approval.

#### Scenario: High-value request violates policy before approval threshold

- **WHEN** a redemption request requires approval but also violates minimum, basket cap, or balance policy
- **THEN** the system rejects it with the stable policy error and creates no receipt, redemption, approval, ledger entry, allocation, outbox event, SMS row, success audit event, or completed idempotency response

#### Scenario: Valid request exceeds approval threshold

- **WHEN** a redemption request passes all validation and exceeds the approval threshold
- **THEN** the system creates a pending approval workflow without confirmed ledger or allocation effects

### Requirement: Redemption requests are online-only

The system MUST reject cashier redemption requests whose submitted timestamp is stale or beyond allowed future clock skew.

#### Scenario: Stale cashier redemption request arrives

- **WHEN** a cashier submits a redemption request outside the allowed stale timestamp window
- **THEN** the system rejects it with `OFFLINE_REDEMPTION_NOT_ALLOWED`

#### Scenario: Future redemption request arrives

- **WHEN** a redemption request timestamp exceeds the allowed future clock skew
- **THEN** the system rejects it with a stable timestamp or offline-redemption domain error

### Requirement: Redemption uniqueness conflicts map to domain outcomes

The system MUST convert redemption-related unique conflicts into stable domain outcomes instead of leaking Prisma errors or returning generic server errors.

#### Scenario: Idempotency key is reused with same request hash

- **WHEN** a duplicate redemption request uses the same idempotency key and same request hash
- **THEN** the system replays the completed response when it is safe to do so

#### Scenario: Idempotency key is reused with different request hash

- **WHEN** a duplicate redemption request uses the same idempotency key and different request hash
- **THEN** the system returns `IDEMPOTENCY_CONFLICT`

#### Scenario: Receipt identity is already used

- **WHEN** redemption receipt uniqueness is violated
- **THEN** the system returns `RECEIPT_ALREADY_USED` or another documented same-purchase domain outcome

### Requirement: Pending redemption receipt evidence is truthful

The system MUST not mark receipt evidence reviewed or approved by the cashier while the associated financial redemption remains pending approval.

#### Scenario: Pending redemption is created

- **WHEN** a valid redemption request is placed into pending approval
- **THEN** receipt evidence remains pending review with no reviewer, approver, review time, or approval time recorded

#### Scenario: Pending redemption is executed

- **WHEN** the approval execution confirms the redemption
- **THEN** receipt evidence transitions to the approved state consistently with the financial approval decision

### Requirement: Approval execution locks financial state

The system MUST lock the approval, target redemption, receipt evidence when changed, and allocation inputs inside the same transaction before executing a redemption approval.

#### Scenario: Two supervisors execute the same approval concurrently

- **WHEN** two distinct supervisors attempt to execute the same pending redemption approval concurrently
- **THEN** exactly one execution succeeds and the loser receives exactly `APPROVAL_ALREADY_DECIDED`

#### Scenario: Approval execution commits

- **WHEN** a redemption approval execution commits
- **THEN** exactly one debit ledger entry, one allocation set, one outbox event, one SMS row, and one execution audit event are created

### Requirement: Pending approvals expire automatically

The system MUST automatically expire pending approvals whose expiry time has passed without requiring a user decision attempt.

#### Scenario: Approval expiry worker runs

- **WHEN** the expiry process finds pending approvals with `expiresAt` at or before the current time
- **THEN** it atomically marks the approval and target redemption expired, records an audit event, and creates no ledger, allocation, outbox, or SMS effect

#### Scenario: Expired approval appears in list response

- **WHEN** an approval is expired by time but not yet processed by the worker
- **THEN** the list endpoint does not present it as an actionable pending approval

### Requirement: Financial transaction reads are discriminated

The system MUST return transaction read responses with explicit type, direction, amount, customer, effective time, aggregate details, and SMS state where operationally useful.

#### Scenario: Confirmed redemption transaction is read

- **WHEN** a confirmed redemption transaction is fetched by ID
- **THEN** the response identifies it as `REDEEM` and `DEBIT` with redemption details and does not expose the amount as an earn credit

#### Scenario: Customer ledger is read

- **WHEN** customer ledger entries are listed
- **THEN** each entry includes financial type and direction plus relevant redemption, adjustment, reversal, allocation, restoration, and role-safe reason details when present

### Requirement: Public API contracts are truthful

The system MUST document actual redemption success bodies, stable domain errors, and reversal availability accurately in OpenAPI.

#### Scenario: Immediate redemption succeeds

- **WHEN** a redemption is confirmed immediately
- **THEN** OpenAPI documents the 201 confirmed redemption response body

#### Scenario: Pending redemption succeeds

- **WHEN** a redemption is accepted for approval
- **THEN** OpenAPI documents the 202 pending approval response body

#### Scenario: Reversal execution is unavailable

- **WHEN** real reversal execution is not implemented
- **THEN** public OpenAPI does not advertise a 201 reversal success response
