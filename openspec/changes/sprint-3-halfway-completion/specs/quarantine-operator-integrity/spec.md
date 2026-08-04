# quarantine-operator-integrity Specification

## ADDED Requirements

### Requirement: Quarantine support rows are batch-scoped
The system MUST ensure approval, stage, and quarantine support rows belong to a valid quarantine batch.

#### Scenario: Row references a missing batch
- **WHEN** a support row is inserted without a matching batch reference
- **THEN** the database rejects the row

### Requirement: Quarantine actions require explicit operator identity
The system MUST record explicit approved-by, executed-by, incident reference, and approval-reason values for destructive quarantine actions.

#### Scenario: Placeholder identity is supplied
- **WHEN** a quarantine operation uses a placeholder operator value
- **THEN** the operation fails before execution

### Requirement: A receipt cannot participate in concurrent destructive batches
The system MUST prevent the same receipt from being staged or executed in more than one non-terminal batch at a time.

#### Scenario: Receipt is already active in another batch
- **WHEN** an operator tries to stage a receipt that is already part of another active batch
- **THEN** the system rejects the attempt and preserves the existing batch state
