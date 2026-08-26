## ADDED Requirements

### Requirement: Production SMS bootstrap is guarded

The worker SHALL construct the SMS provider from validated environment before opening Prisma or Redis connections.
The worker SHALL reject deterministic SMS mode when `NODE_ENV=production`.

#### Scenario: Production startup rejects deterministic mode

- **WHEN** the worker starts with `NODE_ENV=production` and `SMS_PROVIDER_MODE=deterministic`
- **THEN** startup fails before worker connections are opened
- **AND** the worker does not begin processing outbox jobs

#### Scenario: Non-production startup allows deterministic mode

- **WHEN** the worker starts with `NODE_ENV=test` and `SMS_PROVIDER_MODE=deterministic`
- **THEN** the provider is created successfully
- **AND** the worker can continue startup

### Requirement: SMS provider modes are validated

The environment contract SHALL accept `SMS_PROVIDER_MODE` values `deterministic`, `sandbox`, and `real`.
When `SMS_PROVIDER_MODE=real`, the environment SHALL require `SMS_PROVIDER_URL` and SHALL accept `SMS_PROVIDER_TOKEN` as an optional credential.

#### Scenario: Real mode requires a provider URL

- **WHEN** the worker starts with `SMS_PROVIDER_MODE=real` and no `SMS_PROVIDER_URL`
- **THEN** startup fails with a configuration error

#### Scenario: Sandbox mode does not require provider credentials

- **WHEN** the worker starts with `SMS_PROVIDER_MODE=sandbox`
- **THEN** the environment validates successfully without provider credentials

### Requirement: Terminal SMS rows stop replay retries

The worker SHALL treat `deadLetteredAt` and the persisted retry budget as the source of truth for send eligibility.
The worker SHALL NOT call the provider when the SMS row is already dead-lettered or has exhausted `OUTBOX_RETRY_ATTEMPTS`.
After a message becomes terminal, the worker SHALL stop remaining BullMQ retries for that job.

#### Scenario: Dead-lettered SMS is not resent

- **WHEN** a replayed job loads an SMS row with `deadLetteredAt` already set
- **THEN** the worker does not call the provider
- **AND** the job is treated as terminal

#### Scenario: Exhausted retry budget is not exceeded

- **WHEN** a job loads an SMS row whose persisted attempts already meet `OUTBOX_RETRY_ATTEMPTS`
- **THEN** the worker does not call the provider
- **AND** the job does not continue retrying
