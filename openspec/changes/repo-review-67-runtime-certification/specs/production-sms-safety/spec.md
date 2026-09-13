## ADDED Requirements

### Requirement: Production cannot enable fake SMS delivery

Production deployment configuration MUST use the real SMS provider and MUST NOT enable deterministic or fake SMS delivery.

#### Scenario: Safe production configuration

- **GIVEN** a production API or worker environment
- **WHEN** configuration is validated and the SMS provider is created
- **THEN** `SMS_PROVIDER_MODE` is `real`
- **AND** `ALLOW_FAKE_SMS_IN_PRODUCTION` is false or unset
- **AND** required real-provider credentials are validated

#### Scenario: Unsafe production configuration

- **GIVEN** production configuration requests deterministic, sandbox, or explicitly fake SMS behavior
- **WHEN** startup validation runs
- **THEN** startup fails closed with an actionable configuration error
- **AND** no fake provider is started
