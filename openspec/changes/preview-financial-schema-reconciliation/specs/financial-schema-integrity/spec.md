## ADDED Requirements

### Requirement: Financial evidence constraints are reconciled without changing historical rows

The database MUST enforce positive financial amounts and valid approval, redemption, and audit-actor state for new and existing records. A schema reconciliation MUST validate existing rows and MUST NOT repair, delete, or rewrite ledger, lot, allocation, restoration, receipt, approval, adjustment, expiry, or audit records.

#### Scenario: Existing row violates a required check

- **WHEN** a reconciliation migration finds an existing financial row that violates a required amount, state, or audit-actor check
- **THEN** the migration MUST fail without changing any financial row or silently skipping validation

#### Scenario: Invalid financial amount or state is written

- **WHEN** a write attempts a nonpositive financial amount or an invalid approval/redemption state transition representation
- **THEN** the database MUST reject the write

### Requirement: Tenant-scoped financial evidence remains isolated

The database MUST preserve tenant-scoped foreign-key relationships for financial and audit evidence. A reconciliation MUST retain existing composite tenant foreign keys and MUST NOT replace them with weaker single-column references.

#### Scenario: Cross-tenant evidence is written

- **WHEN** a financial or audit row references a source record from another tenant
- **THEN** the database MUST reject the write

#### Scenario: Existing stronger composite foreign key is present

- **WHEN** the repository migration defines a differently named or weaker foreign key than the deployed tenant-composite relationship
- **THEN** the reconciliation MUST preserve the deployed composite relationship and MUST NOT add a duplicate or weaker replacement

### Requirement: Financial history remains immutable and auditable

Confirmed ledger entries, expiry evidence, receipt evidence, allocation/restoration evidence, and adjustment evidence MUST remain append-only or immutable according to their database guards. Any rejected transaction MUST roll back all of its financial and audit writes.

#### Scenario: Confirmed financial evidence is mutated

- **WHEN** a write attempts to edit or delete confirmed ledger, expiry, receipt, allocation, restoration, or adjustment evidence
- **THEN** the database MUST reject the mutation

#### Scenario: Financial transaction fails a deferred invariant

- **WHEN** a ledger/evidence/lot transaction fails a deferred financial invariant at commit
- **THEN** all financial and audit writes in that transaction MUST roll back
