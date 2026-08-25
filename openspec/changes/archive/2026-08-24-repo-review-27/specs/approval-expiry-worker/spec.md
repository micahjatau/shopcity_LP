## ADDED Requirements

### Requirement: Approval expiry runs in a bounded scheduled worker

The system MUST process overdue approvals in a scheduled worker rather than during approval queue reads.

#### Scenario: Overdue approvals exist

- **WHEN** the worker scans for overdue approvals
- **THEN** it MUST select them in bounded batches ordered by expiry time and lock them so concurrent workers do not process the same row twice

#### Scenario: Approval queue is read

- **WHEN** a user opens the approval queue
- **THEN** the read path MUST not mutate approval state as a side effect

### Requirement: Approval expiry updates related records atomically

The system MUST atomically update the approval, redemption, receipt, and audit records for each expired approval.

#### Scenario: Approval expires

- **WHEN** the worker expires an approval
- **THEN** the approval state, related redemption state, receipt state, and expiry audit event MUST be written in one atomic workflow
