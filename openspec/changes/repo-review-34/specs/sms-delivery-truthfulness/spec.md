## ADDED Requirements

### Requirement: Production SMS configuration proves real-provider usage

The system SHALL require production deployment evidence showing `NODE_ENV=production`, `SMS_PROVIDER_MODE=real`, configured provider URL, username, API key, sender ID, and no enabled fake-provider production override.

#### Scenario: Fake provider override is enabled in production

- **WHEN** production deployment policy detects `ALLOW_FAKE_SMS_IN_PRODUCTION` as enabled
- **THEN** the deployment check MUST fail unless an explicitly documented emergency exception is approved outside the production gate.

### Requirement: Production SMS smoke evidence is recorded

The system SHALL send a controlled production smoke-test SMS and record delivery evidence before production SMS readiness is accepted.

#### Scenario: Smoke SMS is sent

- **WHEN** the production SMS smoke test runs
- **THEN** evidence MUST include provider configuration source, outbox ID, provider request/response classification, and delivery result without exposing secrets.

### Requirement: SMS provider idempotency and outage handling are verified

The system SHALL confirm provider requests use outbox ID as idempotency key, retryable and terminal provider responses are classified correctly, and financial transactions remain committed when the provider is unavailable.

#### Scenario: Provider outage occurs after financial commit

- **WHEN** the SMS provider is unavailable after a financial transaction commits
- **THEN** the financial transaction MUST remain committed and SMS delivery MUST follow outbox retry or terminal classification rules.

### Requirement: SMS operations runbooks are current

The system SHALL document provider outage handling and credential rotation procedures for production operations.

#### Scenario: Credential rotation is required

- **WHEN** SMS credentials must be rotated
- **THEN** operators MUST have a documented procedure that preserves production real-provider enforcement.
