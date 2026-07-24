## ADDED Requirements

### Requirement: Approval execution rechecks current policy
Approval execution MUST re-evaluate the current purchase ceiling, approval threshold, and policy version before applying any financial effect.

#### Scenario: stale approvals are rejected
- **WHEN** an approval was captured under an older policy and the current policy no longer permits it
- **THEN** execution MUST fail instead of applying the financial effect

#### Scenario: policy changes are visible at execution time
- **WHEN** the current policy differs from the captured approval snapshot
- **THEN** the system MUST apply the documented execution rule for that difference before completing the approval

### Requirement: Approval expiry is enforced
The system MUST refuse to execute an approval after its expiry window has passed.

#### Scenario: expired approval cannot execute
- **WHEN** an approval reaches its expiry time before execution
- **THEN** the system MUST reject execution and leave the receipt unapproved
