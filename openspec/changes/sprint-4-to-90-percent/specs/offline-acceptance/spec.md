## ADDED Requirements

### Requirement: Offline earn batches reuse the canonical earn path

The system SHALL process offline earn records by converging into the same canonical earn execution used by online earn requests before any financial write occurs.

#### Scenario: Offline record is accepted

- **WHEN** a valid offline earn record is submitted in a batch
- **THEN** the system executes the same earn calculation, ledger creation, credit lot creation, approval handling, audit logging, and outbox behavior used for an online earn

### Requirement: Offline replay is idempotent and conflict-safe

The system SHALL preserve the original response for a replayed offline record when the record identity and canonical request are unchanged.

#### Scenario: Identical offline replay arrives

- **WHEN** the same local record is replayed with the same idempotency key and canonical payload
- **THEN** the system returns the original result without duplicating financial effects

### Requirement: Offline record conflicts use stable outcomes

The system SHALL map offline sync conflicts to stable error outcomes for duplicate local IDs, idempotency conflicts, receipt reuse, card state failures, actor mismatch, device mismatch, branch mismatch, week mismatch, request expiry, and retryable transaction conflicts.

#### Scenario: Same local ID with different payload arrives

- **WHEN** the same local ID is replayed with a different canonical payload
- **THEN** the system rejects the record with a sync-record conflict outcome

#### Scenario: Same idempotency key with changed canonical request arrives

- **WHEN** the same idempotency key is reused with a changed canonical request
- **THEN** the system rejects the record with an idempotency conflict outcome

### Requirement: Offline sync attempts are persisted as evidence

The system SHALL persist each processed offline sync attempt as evidence with its canonical identifiers, derived status, and durable error or transaction references.

#### Scenario: Attempt is confirmed

- **WHEN** an offline record completes successfully
- **THEN** the system persists a confirmed sync attempt linked to the resulting transaction identifier

### Requirement: Offline earns remain earn-only

The system SHALL reject offline attempts to execute redemption, approval, card replacement, or manual adjustment behavior.

#### Scenario: Offline record requests a blocked flow

- **WHEN** an offline request attempts any non-earn financial action
- **THEN** the system rejects the request without creating a ledger mutation
