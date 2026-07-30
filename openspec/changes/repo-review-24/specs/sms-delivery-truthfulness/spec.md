## ADDED Requirements

### Requirement: Redemption-confirmed SMS payloads are complete and typed
The system MUST construct redemption-confirmed SMS payloads with all required transaction, redemption, receipt, and balance fields before the worker chooses a provider.

#### Scenario: Immediate redemption queues SMS
- **WHEN** an immediate redemption commits and creates a redemption-confirmed notification
- **THEN** the payload includes `redemptionId`, `transactionId`, `receiptId`, `redeemedKobo`, and `remainingBalanceKobo`

#### Scenario: Approval execution queues SMS
- **WHEN** redemption approval execution commits and creates a redemption-confirmed notification
- **THEN** the payload includes the same required fields and reflects the approved transaction outcome

### Requirement: SMS payload validation runs before provider selection
The system MUST validate SMS template payloads before dispatching them to any provider mode.

#### Scenario: Payload is incomplete
- **WHEN** a redemption-confirmed payload is missing required fields
- **THEN** the system categorizes it as terminally invalid before provider selection

#### Scenario: Provider mode changes
- **WHEN** deterministic, sandbox, or real provider mode is selected
- **THEN** the validation rules remain the same
