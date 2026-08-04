## ADDED Requirements

### Requirement: Concurrent same-key redemption requests replay successfully

The system SHALL return the original completed redemption response when concurrent requests use the same idempotency key and identical payload.

#### Scenario: Same key and payload race

- **WHEN** two redemption requests with the same idempotency key and identical payload run at the same time
- **THEN** one transaction commits and the other response replays the committed response without returning a receipt conflict

### Requirement: Concurrent idempotency conflicts return stable errors

The system SHALL return `IDEMPOTENCY_CONFLICT` when concurrent redemption requests use the same idempotency key with different payload hashes.

#### Scenario: Same key different payload race

- **WHEN** two redemption requests share an idempotency key but have different payloads
- **THEN** the conflicting request fails with the stable idempotency conflict code

### Requirement: Concurrent duplicate receipts return stable errors

The system SHALL return `RECEIPT_ALREADY_USED` when concurrent redemption requests attempt to use the same tenant, branch, receipt identity, and physical receipt uniqueness scope with different idempotency keys.

#### Scenario: Different keys same receipt race

- **WHEN** two redemption requests with different idempotency keys race for the same physical receipt
- **THEN** only one financial effect commits and the loser receives the stable duplicate receipt error

### Requirement: Redemption uniqueness races do not leak Prisma errors

The system SHALL classify Prisma unique-constraint conflicts from idempotency records, receipt identity, redemption receipt linkage, ledger receipt linkage, and approval target linkage into documented replay or domain error outcomes.

#### Scenario: Prisma P2002 occurs during redemption write

- **WHEN** a redemption transaction loses a database uniqueness race
- **THEN** the API response is a documented replay, duplicate receipt, idempotency conflict, or stable redemption transaction conflict response rather than a raw Prisma error

### Requirement: Real PostgreSQL concurrency tests cover redemption races

The system SHALL include integration tests that exercise overlapping redemption requests against PostgreSQL rather than only mocked Prisma failures.

#### Scenario: Balance cannot be overdrawn by concurrent redemptions

- **WHEN** two redemption requests race against the same available credit lots
- **THEN** committed debit allocation never exceeds active balance and the losing request receives a stable response
