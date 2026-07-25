## ADDED Requirements

### Requirement: Expired approval persistence
The system SHALL durably persist an expired approval before returning an approval-expired domain error from the decision endpoint.

#### Scenario: Decision attempted after expiry
- **WHEN** a supervisor attempts to approve or reject a pending approval whose `expiresAt` is in the past
- **THEN** the approval MUST be persisted with status `EXPIRED`, non-null `decidedAt`, decision actor metadata, and an expiry reason before the API returns `APPROVAL_EXPIRED`

#### Scenario: Expiry has no financial side effects
- **WHEN** an approval expires during decision processing
- **THEN** the system MUST NOT create a ledger entry, credit lot, or SMS outbox event for that approval

#### Scenario: Expired approval is reloaded
- **WHEN** the failed decision request completes
- **THEN** a subsequent read of the approval MUST show `EXPIRED` rather than `PENDING`

### Requirement: Stale policy rejection
The system SHALL reject pending approvals when the active approval policy no longer matches the policy captured when approval was requested.

#### Scenario: Policy version changed
- **WHEN** a supervisor attempts to approve a pending approval and the current approval policy version differs from the approval's stored policy version
- **THEN** the decision MUST fail with a policy-change domain error and MUST NOT create a ledger entry, credit lot, or SMS outbox event

#### Scenario: Approval context became invalid
- **WHEN** a supervisor attempts to approve a pending approval and the branch, device, card, customer, purchase ceiling, or approval threshold no longer permits execution
- **THEN** the decision MUST fail with a domain error and MUST NOT execute loyalty credit

### Requirement: Approval decision API contract
The system SHALL document actual approval decision success and failure shapes in OpenAPI.

#### Scenario: Approval decision returns reason
- **WHEN** the approval decision endpoint returns a successful decision response
- **THEN** the OpenAPI response schema MUST include the decision reason field with the correct nullability

#### Scenario: Approval decision returns validation domain error
- **WHEN** approval expiry or stale-policy validation returns HTTP 422
- **THEN** the OpenAPI contract MUST document the 422 error envelope for the approval decision endpoint

### Requirement: Approval regression coverage
The system SHALL include integration tests for persisted expiry and stale-policy rejection before the approval workflow is considered verified.

#### Scenario: Expiry regression test
- **WHEN** the integration suite exercises a decision request for an expired approval
- **THEN** the test MUST assert persisted `EXPIRED` status, non-null `decidedAt`, and absence of ledger, credit lot, and outbox side effects

#### Scenario: Stale-policy regression test
- **WHEN** the integration suite exercises a decision request after the approval policy changes
- **THEN** the test MUST assert rejection with no loyalty-credit financial side effects
