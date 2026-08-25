## ADDED Requirements

### Requirement: Closed Sprint 2 issue state is internally consistent

Closed Sprint 2 release evidence SHALL keep issue body checkboxes, final evidence comments, and migration-tracker records consistent with the closed state.

#### Scenario: Sprint 2 issue is closed as complete

- **WHEN** Issue #1 is closed after CI evidence is posted
- **THEN** the issue body no longer contains an unchecked final exit-gate checkbox that contradicts the closed state

#### Scenario: Final evidence links render cleanly

- **WHEN** Sprint 2 final evidence is posted to GitHub or recorded in repository documentation
- **THEN** workflow links and job references render as readable Markdown rather than escaped newline text
