## ADDED Requirements

### Requirement: Receipt quarantine is batch-scoped
The system SHALL represent each quarantine operation as a durable batch and scope report, approval, staging, execution, and status changes to that batch ID.

#### Scenario: Execution ignores other batches
- **WHEN** a quarantine batch is executed
- **THEN** only staged rows belonging to that batch may be revalidated, quarantined, or deleted.

#### Scenario: Abandoned or executed batch cannot run again destructively
- **WHEN** a batch is abandoned, cancelled, or already executed
- **THEN** execution MUST be rejected or idempotent without deleting additional receipts.

### Requirement: Quarantine approval and execution are actor-attributed
The system SHALL store incident/reference ID, created by/at, approved by/at, approval reason, executed by/at, status, and notes for each batch.

#### Scenario: Approved batch preserves reviewed report
- **WHEN** an operator approves a quarantine batch
- **THEN** the exact reviewed duplicate report and approval reason MUST be preserved with the batch.

### Requirement: Quarantine execution is revalidated and count-checked
The system SHALL lock staged Receipt rows, revalidate duplicate status, verify dependency reconciliation, write or update quarantine snapshots, and require expected write/delete counts before commit.

#### Scenario: Existing quarantine row cannot cause silent deletion
- **WHEN** a quarantine snapshot already exists for a staged Receipt
- **THEN** execution MUST update or verify the snapshot and MUST NOT delete the Receipt unless the quarantine write count matches the staged-row count.

#### Scenario: Partial write or delete rolls back
- **WHEN** snapshot writes or Receipt deletions affect fewer rows than expected
- **THEN** the entire batch execution MUST roll back.

#### Scenario: Financial dependency requires reconciliation plan
- **WHEN** a staged Receipt has ledger entries, redemptions, approvals, SMS records, or other financial dependencies
- **THEN** execution MUST reject the row unless an approved reconciliation plan is attached.

### Requirement: Quarantined receipts are recoverable
The system SHALL define and document a restoration procedure for accidentally quarantined receipts using preserved snapshots and related-record references.

#### Scenario: Recovery evidence exists
- **WHEN** a Receipt is quarantined
- **THEN** the quarantine record MUST preserve enough snapshot and dependency information to support reviewed restoration.
