# durable-offline-persistence Specification

## Purpose

TBD - created by archiving change frontend-critical-path-hardening. Update Purpose after archive.

## Requirements

### Requirement: Offline saves only succeed after durable browser persistence

The system MUST report offline save success only when local browser storage has actually committed the record.

#### Scenario: IndexedDB write fails

- **WHEN** the offline persistence layer fails to write a record
- **THEN** the caller receives a failure outcome and the UI does not claim the transaction was saved offline

#### Scenario: IndexedDB write succeeds

- **WHEN** the offline persistence layer writes a record successfully
- **THEN** the UI may claim the record is saved locally and queued for reconciliation

### Requirement: Offline records preserve reconciliation context

The system MUST retain the idempotency and context fields needed to reconcile an offline Earn record later.

#### Scenario: Offline record is queued

- **WHEN** an Earn transaction is stored offline
- **THEN** the record contains local identity, idempotency key, branch/device context and sync state
