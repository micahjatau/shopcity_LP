## MODIFIED Requirements

### Requirement: Production-safe SMS provider selection

The system MUST select an SMS provider from validated configuration and MUST refuse to start in production when the configured provider is deterministic or test-only. If the provider vendor is not specified, the system MUST preserve the existing eBulkSMS selection. Arkesel sandbox requests MUST be explicitly enabled and MUST NOT run in production.

#### Scenario: Production startup rejects deterministic mode

- **WHEN** the worker starts in production with deterministic SMS mode
- **THEN** startup fails before any SMS job is processed

#### Scenario: Production startup rejects Arkesel sandbox mode

- **WHEN** the worker starts in production with Arkesel selected and `ARKESEL_SANDBOX=true`
- **THEN** startup fails before any SMS job is processed

#### Scenario: Non-production can use deterministic mode

- **WHEN** the worker starts in non-production with deterministic SMS mode
- **THEN** the worker starts and uses the configured test provider

#### Scenario: Non-production can use Arkesel sandbox

- **GIVEN** the Arkesel API key and sender ID are configured
- **WHEN** a non-production worker sends with Arkesel sandbox enabled
- **THEN** the request uses Arkesel V2 sandbox mode
- **AND** Arkesel does not forward the message to a mobile network or bill SMS balance

#### Scenario: Existing eBulkSMS configuration remains compatible

- **GIVEN** no SMS provider vendor is specified
- **WHEN** the worker starts with the existing eBulkSMS configuration
- **THEN** the worker continues to select eBulkSMS without requiring Arkesel settings
