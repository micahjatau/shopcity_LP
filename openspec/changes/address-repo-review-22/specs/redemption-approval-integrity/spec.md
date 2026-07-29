## ADDED Requirements

### Requirement: Redeem approvals target redemption only
The system SHALL persist approvals for high-value redemption requests with `targetType` of `REDEEM`, a non-null `redemptionId`, and no approval-level `receiptId`.

#### Scenario: Pending high-value redemption is created
- **WHEN** a valid redemption request exceeds the approval threshold
- **THEN** the approval record targets the redemption and satisfies the database target constraint

#### Scenario: Approval response includes receipt evidence
- **WHEN** a pending redemption approval is listed or fetched
- **THEN** receipt details are loaded through the redemption's receipt relation rather than an approval receipt field

### Requirement: High-value redemption validation precedes approval queueing
The system SHALL validate active balance, minimum redemption amount, basket cap, maximum allowed redemption, and requested amount before creating pending redemption approval work.

#### Scenario: High-value request exceeds basket cap
- **WHEN** a redemption request exceeds the allowed basket percentage
- **THEN** the system rejects the request without creating a receipt, redemption, or approval

#### Scenario: High-value request has insufficient balance
- **WHEN** a redemption request exceeds the customer's active balance
- **THEN** the system rejects the request without reserving the physical receipt identity

### Requirement: Pending redemption receipt audit remains unapproved
The system SHALL NOT record the requesting cashier as the approver of receipt evidence for a redemption that is still pending financial approval.

#### Scenario: Pending approval receipt evidence is captured
- **WHEN** a high-value redemption request enters pending approval
- **THEN** the receipt audit state reflects captured or pending evidence rather than approved financial execution by the requester

### Requirement: High-value approval persistence is proven against PostgreSQL
The system SHALL include PostgreSQL-backed tests proving that a high-value redemption approval can be created, listed, and executed without violating database constraints.

#### Scenario: Real approval lifecycle succeeds
- **WHEN** a valid high-value redemption is submitted and then approved in a Testcontainers PostgreSQL database
- **THEN** the pending approval persists, execution creates the debit ledger effect, and no target constraint violation occurs
