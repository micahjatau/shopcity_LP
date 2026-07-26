# earn-endpoint-error-contract Specification

## Purpose
TBD - created by archiving change sprint-2-credit-lot-lifecycle-closure. Update Purpose after archive.
## Requirements
### Requirement: Earn endpoint stable error examples
The system SHALL expose endpoint-specific stable error examples for `POST /transactions/earn` in generated OpenAPI.

#### Scenario: Bad request errors documented
- **WHEN** OpenAPI is generated for `POST /transactions/earn`
- **THEN** the operation MUST document 400 examples including `SESSION_DEVICE_REQUIRED`, `DEVICE_NOT_ACTIVE`, and validation errors where applicable

#### Scenario: Not found errors documented
- **WHEN** OpenAPI is generated for `POST /transactions/earn`
- **THEN** the operation MUST document the 404 `CARD_NOT_FOUND` stable error code

#### Scenario: Conflict errors documented
- **WHEN** OpenAPI is generated for `POST /transactions/earn`
- **THEN** the operation MUST document 409 examples for `RECEIPT_ALREADY_USED` and `IDEMPOTENCY_CONFLICT`

#### Scenario: Policy and approval errors documented
- **WHEN** OpenAPI is generated for `POST /transactions/earn`
- **THEN** the operation MUST document 422 examples for policy and approval errors returned by the earn workflow

#### Scenario: Temporary failure errors documented
- **WHEN** OpenAPI is generated for `POST /transactions/earn`
- **THEN** the operation MUST document 503 examples for `EARN_TRANSACTION_CONFLICT` and `DEPENDENCY_UNAVAILABLE`

### Requirement: Earn endpoint error contract verification
The system SHALL verify the generated OpenAPI contract includes the earn endpoint's stable error examples.

#### Scenario: OpenAPI artifact regenerated and checked
- **WHEN** earn endpoint error documentation changes
- **THEN** `docs/api/openapi.json` MUST be regenerated and OpenAPI lint/diff checks MUST pass

#### Scenario: Generated clients can discover error codes
- **WHEN** a frontend client generator reads the OpenAPI operation for `POST /transactions/earn`
- **THEN** the operation MUST contain response examples or schemas that identify the endpoint-specific stable codes

