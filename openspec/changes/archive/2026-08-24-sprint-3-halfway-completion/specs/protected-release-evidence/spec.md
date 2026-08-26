# protected-release-evidence Specification

## ADDED Requirements

### Requirement: Protected release evidence runs against one exact SHA

The system MUST execute the protected restore workflow against a caller-supplied immutable release SHA and MUST verify the checked-out commit matches that SHA.

#### Scenario: Workflow is started for a release candidate

- **WHEN** the workflow is dispatched with a release SHA
- **THEN** the job fails if the repository checkout is not exactly that commit

### Requirement: Shared-backup proof cannot silently skip

The system MUST require real schema and data dump inputs before running protected restore verification.

#### Scenario: Backup artifact is missing

- **WHEN** the protected workflow starts without a required backup dump path
- **THEN** the job fails instead of skipping the restore test

### Requirement: Protected evidence is uploaded for review

The system MUST upload restore reconciliation, checksums, probe output, and workflow metadata as downloadable evidence.

#### Scenario: Protected restore completes

- **WHEN** the exact-head restore verification finishes successfully
- **THEN** the workflow publishes the evidence artifacts for later review
