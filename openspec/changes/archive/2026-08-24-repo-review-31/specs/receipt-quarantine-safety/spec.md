## ADDED Requirements

### Requirement: Duplicate receipt remediation uses an approved-ID staging flow

The system MUST generate a read-only duplicate report and only quarantine or delete receipt rows that appear in an explicitly reviewed approved-ID list.

#### Scenario: Duplicate report is generated

- **WHEN** duplicate receipt identities are detected
- **THEN** the system produces a report without deleting any rows

#### Scenario: Approved IDs are staged

- **WHEN** an operator stages an approved-ID list for duplicate remediation
- **THEN** only those IDs can proceed to quarantine or delete actions

### Requirement: Duplicate receipts are not deleted automatically

The system MUST not delete duplicate receipts solely because they rank after the earliest record in a duplicate group.

#### Scenario: Unreviewed duplicate group exists

- **WHEN** a duplicate group has not been approved for deletion
- **THEN** no receipt row is deleted

#### Scenario: Separate delete action is approved

- **WHEN** a reviewed approved-ID list is submitted for deletion
- **THEN** only the approved receipt rows are deleted and the action is auditable
