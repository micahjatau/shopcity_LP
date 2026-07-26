## ADDED Requirements

### Requirement: FIFO debit allocation is deterministic
The system SHALL allocate debit amounts from eligible credit lots in ascending `expiresAt`, then `earnedAt`, then lot ID order.

#### Scenario: Multiple eligible lots fund one debit
- **WHEN** a customer has multiple positive unexpired credit lots and a redemption or debit adjustment is confirmed
- **THEN** the system persists allocations in deterministic FIFO order until the debit amount is fully funded

#### Scenario: Equal expiry lots are ordered deterministically
- **WHEN** eligible lots share the same expiry timestamp
- **THEN** the system uses earned timestamp and then lot ID as tie-breakers

### Requirement: Debit allocation uses transaction-level locking
The system SHALL allocate credit lots inside the same serializable database transaction as the debit ledger entry and SHALL lock eligible lots before decrementing balances.

#### Scenario: Concurrent redemptions target same balance
- **WHEN** two debit commands concurrently attempt to consume overlapping lots
- **THEN** committed allocations never reduce any lot below zero and total confirmed debit never exceeds active balance

### Requirement: Allocation rows are immutable evidence
The system SHALL persist immutable allocation rows for every lot consumed by a confirmed debit ledger entry.

#### Scenario: Allocation is written for a debit
- **WHEN** a redemption or debit adjustment confirms a debit ledger entry
- **THEN** allocation rows identify the tenant, debit ledger entry, source credit lots, positive amounts, and allocation order

#### Scenario: Allocation mutation is rejected
- **WHEN** a database update or delete attempts to alter an allocation row
- **THEN** the database rejects the mutation and preserves the original allocation evidence

### Requirement: Allocation invariants are database-enforced
The system SHALL reject debit allocation states where allocation totals, tenant/customer ownership, or lot balances do not reconcile with the confirmed debit ledger entry.

#### Scenario: Allocation total does not equal debit
- **WHEN** a transaction attempts to commit allocations whose total differs from the debit ledger amount
- **THEN** the database rejects the transaction

#### Scenario: Cross-tenant allocation is attempted
- **WHEN** an allocation references a lot or debit ledger entry outside the allocation tenant/customer scope
- **THEN** the database rejects the transaction
