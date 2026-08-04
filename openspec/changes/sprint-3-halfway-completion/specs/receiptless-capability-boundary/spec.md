# receiptless-capability-boundary Specification

## ADDED Requirements

### Requirement: Receiptless financial execution remains unavailable in the halfway release
The system MUST keep receiptless transaction execution and receiptless manual adjustments out of the halfway release surface.

#### Scenario: User requests receiptless execution
- **WHEN** a client attempts a receiptless transaction workflow
- **THEN** the system returns an unsupported or unavailable response and does not create placeholder financial rows

### Requirement: Receiptless read models remain intentionally unavailable
The system MUST continue to reject receiptless transaction-detail and customer-ledger reads in the halfway release.

#### Scenario: Branch user opens a receiptless transaction detail
- **WHEN** a branch user requests a receiptless transaction detail
- **THEN** the system returns the documented unsupported-transaction response instead of synthesizing a record

### Requirement: OpenAPI and generated clients do not promise deferred workflows
The system MUST not document receiptless execution or receiptless read models as available successful workflows in OpenAPI or generated client surfaces.

#### Scenario: Contract artifacts are generated
- **WHEN** OpenAPI and client artifacts are regenerated
- **THEN** they do not expose supported success responses for deferred receiptless workflows
