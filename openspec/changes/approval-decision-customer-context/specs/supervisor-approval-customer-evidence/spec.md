## Purpose

Provide Supervisors with readable, authoritative customer financial context while reviewing an approval, without exposing internal approval identifiers or changing decision authority.

## ADDED Requirements

### Requirement: Supervisor decision evidence omits internal approval identifiers

The Supervisor approval decision panel SHALL present readable transaction and customer evidence without displaying the approval UUID or other internal approval identifiers. User-facing decision confirmation SHALL not expose the approval UUID.

#### Scenario: Review a selected approval

- **WHEN** a Supervisor selects an approval
- **THEN** the decision panel shows the customer name and available transaction evidence
- **AND** the panel does not show the request/approval UUID

#### Scenario: Decision is successfully recorded

- **WHEN** a Supervisor submits a valid approval decision and the server confirms success
- **THEN** the confirmation reports that the decision was submitted without including the internal approval UUID

### Requirement: Customer metrics come from authoritative customer reads

The Supervisor decision panel SHALL show wallet balance from the authorized customer detail response and lifetime earned from the authorized customer profile projection for the selected customer. It SHALL NOT infer either metric from approval data or bounded activity/ledger lists. Each metric SHALL be formatted as NGN and SHALL display a zero value as ₦0.00.

#### Scenario: Customer metrics are available

- **WHEN** the selected approval identifies a real customer and both customer reads return the matching customer’s metrics
- **THEN** Wallet Balance and Lifetime Earned show those values in NGN
- **AND** a metric value of zero is shown as ₦0.00

#### Scenario: Customer metric reads are pending

- **WHEN** customer metric reads for the selected approval are still pending
- **THEN** each metric shows a loading state rather than a stale value from a previously selected customer

#### Scenario: One customer metric is unavailable

- **WHEN** one customer metric read fails or omits its authoritative value while the other succeeds
- **THEN** the failed metric displays “Unavailable”
- **AND** the successful metric remains visible

#### Scenario: The approval has no real customer identity

- **WHEN** the selected approval does not provide a real customer identity
- **THEN** customer metric requests are not made using the approval UUID
- **AND** each metric displays “Not provided”

#### Scenario: Selection changes before metric reads finish

- **WHEN** a Supervisor selects another approval before the previous customer reads complete
- **THEN** the previous customer’s late responses do not replace the newly selected customer’s metrics

### Requirement: Approval decision authority is unchanged

Showing customer evidence SHALL NOT change approval policy, role authorization, decision submission, CSRF or idempotency behavior, or financial effects.

#### Scenario: Supervisor decides an approval

- **WHEN** an authorized Supervisor submits a valid decision reason
- **THEN** the existing audited approval decision flow remains in force
- **AND** the customer evidence is display-only
