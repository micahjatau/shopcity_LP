## Purpose

Provide enough safe, stage-specific evidence to diagnose credit-expiry transaction failures without exposing customer data or changing financial posting behavior.

## ADDED Requirements

### Requirement: Credit-expiry failures emit structured transaction diagnostics

When a credit-expiry database transaction attempt fails, the system SHALL emit one structured diagnostic record for that attempt. Where available, the record SHALL identify the operation stage, whether the failure occurred in the transaction callback or while committing, transaction duration, Prisma error class and code, PostgreSQL SQLSTATE, constraint or trigger, and a sanitized database reason.

#### Scenario: Callback operation fails

- **WHEN** a database operation during due-lot selection, system-actor handling, ledger insertion, expiry evidence insertion, lot update, or audit insertion fails
- **THEN** the diagnostic identifies that operation stage, records the failure as occurring in the transaction callback, and includes the available safe error metadata and elapsed duration

#### Scenario: Deferred constraint fails during commit

- **WHEN** the callback completes but a deferred PostgreSQL constraint rejects the transaction at commit
- **THEN** the diagnostic identifies the commit phase, records the last known operation stage and transaction duration, and includes the available SQLSTATE and constraint or trigger metadata

### Requirement: Transaction diagnostics exclude sensitive data

Diagnostic records SHALL NOT contain credentials, raw SQL, bound query parameters, customer or tenant identifiers, request bodies, arbitrary Prisma metadata, or raw error stacks. Any database reason SHALL be bounded and sanitized before logging; fields that cannot be safely extracted SHALL be omitted or replaced with a generic reason.

#### Scenario: Database reason contains values or SQL context

- **WHEN** an underlying database error includes row values, identifiers, SQL text, or other untrusted context
- **THEN** the emitted diagnostic omits or redacts those values and does not include the raw message, query, parameters, or stack

#### Scenario: Error lacks safe metadata

- **WHEN** a Prisma or PostgreSQL error does not expose a recognized SQLSTATE, identifier, or safe reason
- **THEN** the diagnostic records only the recognized error class and safe transaction context, without serializing the raw error object

### Requirement: Diagnostics preserve financial transaction semantics

Adding diagnostic reporting SHALL NOT change credit-expiry transaction contents, retry policy, commit behavior, rollback behavior, external side effects, or successful result values.

#### Scenario: Failed attempt is retried or rolled back

- **WHEN** the existing bounded retry policy handles a transaction failure
- **THEN** diagnostics do not add financial writes or alter whether the attempt is retried, committed, or rolled back

#### Scenario: Successful expiry completes

- **WHEN** a credit-expiry transaction succeeds
- **THEN** it returns the existing expiry result and performs the existing financial writes without emitting a failure diagnostic
