## ADDED Requirements

### Requirement: Configure Termii as an explicit transactional SMS provider

The system SHALL allow Termii only when `SMS_PROVIDER_VENDOR=termii` and real SMS mode are explicitly selected, and SHALL preserve eBulkSMS as the default provider. Termii real mode MUST require a server-side API key, a 3–11 character alphanumeric sender ID, and a valid HTTPS send endpoint. Every existing outbox SMS MUST use Termii's `dnd` route for transactional delivery; the system MUST NOT silently fall back to the promotional `generic` route or expose WhatsApp, voice, or bulk routes through this SMS provider. Production operation requires the Termii account's DND route to be activated and the sender ID registered. Credentials and raw request/response content MUST NOT be logged or persisted.

#### Scenario: Select Termii with valid configuration

- **GIVEN** Termii credentials and a registered sender ID are configured
- **WHEN** a worker starts with `SMS_PROVIDER_MODE=real` and `SMS_PROVIDER_VENDOR=termii`
- **THEN** the worker selects Termii for the existing single-recipient transactional outbox
- **AND** existing provider defaults and business templates remain unchanged

#### Scenario: Reject incomplete or insecure Termii configuration

- **WHEN** Termii real mode is selected without an API key or valid sender ID, or with a non-HTTPS endpoint
- **THEN** environment validation fails before any SMS job is processed

#### Scenario: Route transactional messages through DND

- **WHEN** the worker submits an existing ShopCity business notification through Termii
- **THEN** it uses the `dnd` channel and one international-format recipient without the leading plus sign
- **AND** it does not use the promotional `generic` route or any non-SMS channel

#### Scenario: Termii DND or sender registration is not enabled

- **GIVEN** the Termii account has not activated DND routing or registered the configured sender ID
- **WHEN** an operator prepares the provider for production
- **THEN** the operations guidance requires those provider-side prerequisites to be completed before live use
- **AND** the application does not substitute the generic promotional route
