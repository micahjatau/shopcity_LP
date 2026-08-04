## ADDED Requirements

### Requirement: Public earn contract

The system MUST expose a transaction-oriented earn API that supports confirmed and approval-required outcomes.

#### Scenario: Confirmed earn returns success

- **WHEN** a valid earn request is submitted and does not require approval
- **THEN** the system MUST return a confirmed success response
- **AND THEN** the response MUST include the resulting transaction state

#### Scenario: Approval-required earn returns pending approval

- **WHEN** a valid earn request exceeds the approval threshold
- **THEN** the system MUST return a pending approval response
- **AND THEN** the response MUST include the approval reference

### Requirement: Immutable ledger persistence

The system MUST persist confirmed earns as immutable ledger entries with associated credit lots.

#### Scenario: Confirmed earn creates ledger and lot

- **WHEN** an earn request is confirmed
- **THEN** the system MUST create exactly one ledger entry for the receipt
- **AND THEN** the system MUST create exactly one credit lot linked to that ledger entry

#### Scenario: Ledger entries remain append-only

- **WHEN** a ledger entry has been confirmed
- **THEN** the system MUST NOT edit or delete that entry

### Requirement: Atomic earn transaction

The system MUST commit receipt evidence, ledger data, audit history, and outbox intent in one database transaction for confirmed earns.

#### Scenario: All confirmed earn side effects commit together

- **WHEN** a confirmed earn is processed
- **THEN** receipt evidence, ledger entry, credit lot, audit history, and outbox row MUST be committed together

#### Scenario: Partial financial writes are prevented

- **WHEN** a confirmed earn fails before commit
- **THEN** no ledger entry, credit lot, or outbox row MUST remain persisted

### Requirement: Approval execution is one-time and revalidated

The system MUST keep approval decision and financial execution separate, and it MUST revalidate current eligibility before executing an approval.

#### Scenario: Approval requires a distinct decision

- **WHEN** a purchase requires approval
- **THEN** the system MUST create an approval record without creating a ledger entry or credit lot

#### Scenario: Approval executes exactly once

- **WHEN** an approved transaction is executed
- **THEN** the system MUST create the ledger entry, credit lot, and outbox row exactly once
- **AND THEN** concurrent execution attempts MUST not create duplicates

#### Scenario: Approval revalidation blocks stale eligibility

- **WHEN** the card, customer, device, receipt, or threshold state changes before approval execution
- **THEN** the system MUST revalidate current eligibility and MUST fail closed if the approval is no longer valid

### Requirement: Outbox-backed SMS delivery

The system MUST store notification intent in PostgreSQL before queue publication and process SMS asynchronously.

#### Scenario: SMS intent survives request completion

- **WHEN** a confirmed earn commits
- **THEN** the system MUST persist an outbox row before any queue publication occurs

#### Scenario: SMS delivery failure does not break finance

- **WHEN** SMS delivery or queue processing fails after commit
- **THEN** the financial earn MUST remain committed

### Requirement: Earn concurrency and idempotency

The system MUST prevent duplicate financial effects for the same receipt and MUST replay idempotent requests safely.

#### Scenario: Simultaneous earn requests conflict safely

- **WHEN** two earn requests for the same receipt are processed concurrently
- **THEN** exactly one request MUST succeed
- **AND THEN** the other request MUST fail with a duplicate conflict

#### Scenario: Idempotent replay returns the same result

- **WHEN** the same earn request is retried with the same idempotency key and payload
- **THEN** the system MUST return the original result without creating new financial records

#### Scenario: Reused idempotency key with a changed payload fails

- **WHEN** the same idempotency key is reused with a different payload
- **THEN** the system MUST reject the request with an idempotency conflict
