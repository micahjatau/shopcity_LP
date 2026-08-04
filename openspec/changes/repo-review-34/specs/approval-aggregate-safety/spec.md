## ADDED Requirements

### Requirement: Approval decisions use post-lock aggregate state

The system SHALL acquire required locks, re-read the complete aggregate after locking, and execute approval decisions using only post-lock values.

#### Scenario: State changes before lock acquisition

- **WHEN** receipt, card, customer, device, policy, redemption, ledger, allocation, or approval state changes between request receipt and lock acquisition
- **THEN** the decision MUST re-run eligibility checks against the post-lock state and MUST NOT use stale pre-lock values.

#### Scenario: Conditional updates remain defensive

- **WHEN** post-lock eligibility passes and a decision is executed
- **THEN** conditional update counts MUST still be checked to detect unexpected concurrent state changes.

### Requirement: Approval expiry transitions related records atomically

The system SHALL update the Approval and each expected related Receipt or Redemption with source-state predicates inside one transaction.

#### Scenario: Missing related receipt rolls back expiry

- **WHEN** expiry expects a Receipt transition but the Receipt row is missing or no longer in the expected source state
- **THEN** the transaction MUST roll back and MUST NOT commit an expired Approval or audit record.

#### Scenario: Redemption already transitioned rolls back expiry

- **WHEN** expiry expects a Redemption transition but the Redemption has already moved to another state
- **THEN** the transaction MUST roll back or return a stable conflict without partial aggregate changes.

### Requirement: Deadline-driven expiry has system attribution

The system SHALL attribute automatic deadline expiry to SYSTEM or a null system actor and store the detecting user or worker separately in metadata.

#### Scenario: Supervisor triggers overdue expiry detection

- **WHEN** a supervisor request detects an overdue approval and triggers expiry
- **THEN** the decision-maker MUST NOT be recorded as that supervisor unless the supervisor explicitly made the decision.

#### Scenario: Concurrent decision and expiry converge

- **WHEN** a decision and expiry race for the same Approval
- **THEN** exactly one valid final outcome MUST commit.
