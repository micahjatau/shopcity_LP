# outbox-worker-recovery Specification

## Purpose
TBD - created by archiving change outbox-worker-recovery. Update Purpose after archive.
## Requirements
### Requirement: Committed outbox publication
The system MUST persist notification intent in the database during the financial transaction and MUST publish queue work only after the transaction commits.

#### Scenario: Rolled back transaction publishes nothing
- **WHEN** an earn or approval transaction fails before commit
- **THEN** the system MUST NOT enqueue a job for that transaction
- **AND THEN** no delivery record for that failed transaction MUST be created as published

#### Scenario: Committed transaction becomes publishable
- **WHEN** an earn or approval transaction commits successfully
- **THEN** the system MUST leave a committed outbox row ready for asynchronous publication

### Requirement: Asynchronous SMS delivery pipeline
The system MUST process committed outbox rows asynchronously and MUST record SMS delivery state separately from financial state.

#### Scenario: New outbox work enters the delivery pipeline
- **WHEN** a committed outbox row is claimed for processing
- **THEN** the system MUST create or update a delivery record with a queued state
- **AND THEN** the system MUST continue delivery independently of the request transaction

#### Scenario: Provider success updates delivery state
- **WHEN** the SMS provider accepts a message for delivery
- **THEN** the system MUST record the message as sent or delivered according to provider feedback

#### Scenario: Provider failure does not roll back finance
- **WHEN** SMS delivery fails after the financial transaction has committed
- **THEN** the system MUST record the failure
- **AND THEN** the original financial result MUST remain committed

### Requirement: Outbox recovery from PostgreSQL
The system MUST be able to recover pending or failed outbox work from PostgreSQL after Redis or worker interruption.

#### Scenario: Aged pending outbox rows are retried
- **WHEN** a committed outbox row remains pending beyond the recovery threshold
- **THEN** the system MUST reprocess or requeue that row for delivery

#### Scenario: Unpublished work survives Redis outage
- **WHEN** Redis is unavailable while a transaction commits
- **THEN** the system MUST preserve the committed outbox row for later recovery
- **AND THEN** the row MUST be eligible for a later publisher pass

### Requirement: Launchable worker runtime
The system MUST provide a worker runtime that can start, stop, and drain delivery work without corrupting queued state.

#### Scenario: Worker starts independently of the API
- **WHEN** the worker process is launched
- **THEN** it MUST connect to the required persistence and queue dependencies without starting the HTTP API

#### Scenario: Graceful shutdown preserves pending work
- **WHEN** the worker receives a shutdown signal while processing work
- **THEN** it MUST release in-flight resources cleanly
- **AND THEN** it MUST avoid marking unfinished work as successfully delivered

