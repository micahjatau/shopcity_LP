## ADDED Requirements

### Requirement: Pending redemption responses return HTTP 202 at runtime

The system MUST return HTTP 202 for redemption requests that are accepted for pending approval and HTTP 201 for redemptions that confirm immediately.

#### Scenario: Redemption requires approval

- **WHEN** a valid redemption is accepted for later approval
- **THEN** the runtime response status is 202

#### Scenario: Redemption confirms immediately

- **WHEN** a valid redemption is confirmed without approval
- **THEN** the runtime response status is 201

### Requirement: Transaction reads expose redemption outcomes truthfully

The system MUST return transaction reads that reflect the real financial aggregate and any approval linkage, rather than collapsing redemption execution into earn-shaped data.

#### Scenario: Approved redemption transaction is read

- **WHEN** a transaction created through redemption approval execution is fetched
- **THEN** the response identifies the redemption and approval outcome and does not present it as an earn credit

#### Scenario: Pending redemption remains pending

- **WHEN** a pending redemption is read
- **THEN** the response preserves the pending-approval state and does not imply a completed ledger effect

### Requirement: Reversal success is not advertised before reversal execution exists

The system MUST not advertise a successful public reversal response until reversal execution can actually complete.

#### Scenario: Reversal route remains unavailable

- **WHEN** reversal execution is not implemented
- **THEN** public API documentation and runtime behavior expose only an unavailable or review-required boundary
