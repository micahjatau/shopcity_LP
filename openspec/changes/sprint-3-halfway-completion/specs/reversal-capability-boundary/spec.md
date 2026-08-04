# reversal-capability-boundary Specification

## ADDED Requirements

### Requirement: Halfway release keeps reversal and adjustment execution unavailable
The system MUST treat executable transaction reversal and manual balance adjustment as unavailable capabilities in the halfway release.

#### Scenario: Client requests a reversal
- **WHEN** a client calls the reversal endpoint during the halfway release
- **THEN** the system returns a truthful unavailable response and does not queue reversal work or create durable reversal records

#### Scenario: Client requests a manual adjustment
- **WHEN** a client attempts to execute a manual balance adjustment
- **THEN** the system rejects the request as unavailable and does not create financial side effects

### Requirement: Unavailable reversal responses are explicit and stable
The system MUST document and emit a stable unavailable response for reversal attempts instead of a success envelope.

#### Scenario: Reversal response is inspected
- **WHEN** the reversal contract is generated or the endpoint is called
- **THEN** the response is documented as unavailable with a stable machine-readable code and no successful accepted-work envelope
