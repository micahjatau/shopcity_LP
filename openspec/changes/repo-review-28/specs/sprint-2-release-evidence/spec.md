## ADDED Requirements

### Requirement: Release evidence reflects the verified current head
The system MUST keep release evidence and tracker records aligned with the current verified head commit and the actual verified migration state.

#### Scenario: A new verified head is recorded
- **WHEN** the repository head changes and the new head is verified by CI or migration evidence
- **THEN** the release evidence records the new commit SHA and the corresponding verification result

### Requirement: Migration tracker distinguishes local and shared verification
The system MUST distinguish local migration validation from shared-environment reconciliation in the tracker.

#### Scenario: Shared migration state is verified
- **WHEN** the actual shared database has been backed up, restored, and compared against committed migrations
- **THEN** the tracker records that shared verification separately from local migration checks
