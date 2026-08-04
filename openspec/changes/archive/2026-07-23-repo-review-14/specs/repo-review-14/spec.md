## ADDED Requirements

### Requirement: Production SMS delivery uses the configured provider factory

The system MUST construct the production SMS provider through the environment-aware factory rather than hard-coding the deterministic provider.

#### Scenario: production worker boots

- **WHEN** the production worker starts
- **THEN** it MUST obtain the SMS provider from the configured factory
- **AND THEN** it MUST not bypass provider validation by constructing the deterministic provider directly

### Requirement: SMS provider modes are validated consistently

The system MUST accept the supported SMS provider modes in environment validation and MUST require the mode-specific settings needed by each provider.

#### Scenario: real mode is configured

- **WHEN** `SMS_PROVIDER_MODE=real`
- **THEN** environment validation MUST accept the mode
- **AND THEN** the worker MUST require the real-provider endpoint and token settings

#### Scenario: sandbox mode is configured

- **WHEN** `SMS_PROVIDER_MODE=sandbox`
- **THEN** environment validation MUST accept the mode

#### Scenario: deterministic mode is configured

- **WHEN** `SMS_PROVIDER_MODE=deterministic`
- **THEN** environment validation MUST accept the mode only in non-production deployments

### Requirement: Dead-lettered SMS messages do not send again

The system MUST stop SMS delivery attempts when a message has already been dead-lettered or its retry budget has been exhausted.

#### Scenario: a message is dead-lettered

- **WHEN** a worker sees an SMS record with a non-null dead-letter timestamp
- **THEN** it MUST not call the provider again

#### Scenario: the retry budget is exhausted

- **WHEN** a worker sees an SMS record whose retry budget has been exhausted
- **THEN** it MUST not call the provider again

### Requirement: SMS retries are replay-safe

The system MUST preserve replay-safe provider behavior so duplicate BullMQ retries do not cause duplicate provider side effects.

#### Scenario: the same queued job is retried

- **WHEN** BullMQ replays the same SMS job more than once
- **THEN** the provider interaction MUST remain idempotent or otherwise safely deduplicated
- **AND THEN** the worker MUST not create duplicate external delivery side effects
