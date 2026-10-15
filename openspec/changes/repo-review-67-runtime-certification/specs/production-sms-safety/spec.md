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

### Requirement: Standalone SMS smoke is operator-gated and narrowly configured

A standalone real-provider SMS smoke MUST require explicit approval, real-provider mode, and an exact destination allowlist match. It MUST validate only the provider-specific configuration it uses and MUST NOT require unrelated application secrets or database configuration. Invalid provider endpoints MUST be rejected before any provider request.

#### Scenario: Approved provider smoke with minimal SMS configuration

- **GIVEN** real eBulkSMS credentials and an approved, allowlisted test destination are configured
- **AND** unrelated application configuration is absent
- **WHEN** the standalone smoke runner initializes its provider
- **THEN** it validates the eBulkSMS endpoint and required SMS settings without loading the application-wide configuration schema
- **AND** it may send only to the exact allowlisted destination

### Requirement: Delivery-report polling is paced and fair

When the selected provider supports delivery reports, the worker MUST poll on a dedicated schedule rather than on every outbox recovery tick. The worker MUST persist each message's next eligible poll time and select unpolled/due messages before deferred messages, so a provider response that remains `SENT`, is unavailable, or contains no report cannot monopolize the batch. Poll batch size and interval MUST be bounded by validated configuration. Before contacting the provider, the worker MUST claim a due row with a compare-and-set update so multiple worker instances do not poll the same message concurrently. A report that includes a provider message ID MUST match the ID stored for that SMS before it can change status. Only an authorized report may move a message from `SENT` to `DELIVERED` or `FAILED`; missing/unknown reports MUST leave it `SENT`.

#### Scenario: Provider has no terminal report yet

- **GIVEN** a sent SMS has no report, or the provider still reports `SENT`
- **WHEN** its report is polled
- **THEN** its delivery status remains `SENT`
- **AND** its next poll is scheduled no earlier than the configured interval
- **AND** other unpolled/due SMS messages remain eligible ahead of it

#### Scenario: Provider report lookup fails

- **GIVEN** a DLR request times out, fails, or returns no recognized status
- **WHEN** the worker handles the result
- **THEN** it retains `SENT`, records no raw provider response, and schedules a later poll
- **AND** the outbox recovery loop continues independently

#### Scenario: Multiple workers encounter the same due message

- **GIVEN** two worker instances select the same due `SENT` message
- **WHEN** both attempt to claim its poll schedule
- **THEN** only one worker calls the provider
- **AND** the other worker skips the message

#### Scenario: Provider report ID does not match

- **GIVEN** a DLR response includes a provider message ID different from the stored ID
- **WHEN** the response is handled
- **THEN** the response MUST NOT update delivery status or timestamps
- **AND** the message remains eligible for a later poll
