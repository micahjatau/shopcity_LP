## ADDED Requirements

### Requirement: Redemption approval execution returns stable workflow outcomes
The system SHALL return documented stable machine-readable outcomes for redemption approval execution, including already-executed approvals, stale policy conflicts, insufficient balance, and concurrency conflicts.

#### Scenario: Two supervisors race to approve one redemption
- **WHEN** two authorized supervisors attempt to approve the same pending redemption at the same time
- **THEN** only one execution creates the debit financial effect and the other receives a stable already-executed or conflict response

### Requirement: Transaction lookup supports redemption debit effects
The system SHALL return redemption transaction details through transaction lookup without treating non-earn receipt models as unsupported.

#### Scenario: Redemption transaction is fetched
- **WHEN** a confirmed redemption transaction is requested by ID
- **THEN** the response includes the redemption, debit ledger entry, receipt evidence, and allocation summary
