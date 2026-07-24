## ADDED Requirements

### Requirement: Production SMS requests are runtime-safe
The real SMS provider MUST enforce a request timeout, MUST validate the runtime response shape, and MUST classify unexpected outcomes as failures instead of assuming success.

#### Scenario: a slow provider call times out
- **WHEN** the real provider does not respond within the configured timeout
- **THEN** the SMS send MUST fail as a provider error

#### Scenario: invalid runtime status is rejected
- **WHEN** the provider returns a status outside the supported allowlist
- **THEN** the system MUST treat the response as invalid and MUST NOT record the send as successful

#### Scenario: response failures are classified for retry handling
- **WHEN** the provider returns a transient HTTP failure
- **THEN** the system MUST classify it as retryable
- **AND WHEN** the provider returns a permanent HTTP failure
- **THEN** the system MUST classify it as terminal or non-retryable according to the provider policy

### Requirement: Production provider configuration is explicit
The real SMS provider MUST require the operational settings needed for production use, and the documented environment contract MUST include those settings.

#### Scenario: missing production credentials fail startup
- **WHEN** the real provider is selected without the required authentication or endpoint settings
- **THEN** startup MUST fail before delivery work begins

#### Scenario: environment documentation stays complete
- **WHEN** the production provider is configured
- **THEN** the documented environment variables MUST cover the provider URL, authentication, and worker recovery settings needed to operate it
