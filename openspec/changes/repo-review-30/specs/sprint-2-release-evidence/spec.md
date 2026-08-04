## MODIFIED Requirements

### Requirement: Migration tracker reflects remote verification status

The migration tracker SHALL distinguish local migration verification from CI or remote verification and SHALL only mark evidence-backed completion when the required workflow, restore proof, or database-object inventory exists.

#### Scenario: Latest migrations are verified in CI

- **WHEN** the CI workflow verifies the latest migrations
- **THEN** the migration tracker records the workflow evidence and no longer describes those migrations as awaiting visible CI evidence

#### Scenario: Tracker completion lacks evidence

- **WHEN** a repo-review item or migration claim has no linked workflow run, restore proof, or database-object inventory
- **THEN** the tracker MUST leave the item open or flagged as unproven rather than complete
