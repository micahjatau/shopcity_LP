# sms-operations Specification

## Purpose

TBD - created by archiving change repo-review-68-reports-cards-sms-correctness. Update Purpose after archive.

## Requirements

### Requirement: Report operational states accurately

The system SHALL count `queued` as currently queued work and SHALL expose separately documented total/submitted, sent, delivered, failed, suppressed, retry, and dead-letter counts.

#### Scenario: No queued work

- **GIVEN** 90 messages are delivered, 5 sent, and 5 failed, with none queued
- **WHEN** SMS operations are summarized
- **THEN** queued count is zero and the other state counts remain accurate

### Requirement: Inspect transaction notifications

The system SHALL provide `GET /notifications/sms/{transactionId}` to authorized Supervisor/Admin users with transaction/template, masked destination, status, attempts, retry timing, provider reference, failure category, redacted error, and lifecycle timestamps.

#### Scenario: Cross-branch inspection

- **GIVEN** a Supervisor belongs to branch A
- **WHEN** the Supervisor requests a transaction from branch B
- **THEN** the request is denied or not-found without revealing notification data

### Requirement: Support operational drilldown

The system SHALL provide a bounded, scoped view of failed, dead-lettered, retry-scheduled, invalid-recipient, and provider-rejected messages without exposing secrets, raw provider payloads, or unmasked PII.

#### Scenario: Failed-message drilldown

- **GIVEN** a branch has failed and retry-scheduled messages
- **WHEN** an authorized Supervisor opens the operations view
- **THEN** the messages are listed with redacted failure details, masked destinations, and retry metadata within the requested scope

### Requirement: Truthful delivery state

The system SHALL transition to `DELIVERED` only from authenticated provider delivery evidence. If provider delivery receipts are unavailable, the system SHALL document and present `SENT` as submission acceptance rather than phone delivery.

#### Scenario: Duplicate delivery callback

- **GIVEN** an authenticated callback for an already delivered message is replayed
- **WHEN** it is processed
- **THEN** no duplicate audit/effect is created and the terminal state remains delivered

### Requirement: Template-aware recovery

The worker SHALL reconstruct financial SMS intents only with transaction context and expiry reminders only with customer/expiry context; insufficient source data SHALL produce an observable invalid/dead-letter outcome.

#### Scenario: Expiry reminder recovery

- **GIVEN** an expiry-reminder outbox event has no transaction ID but has customer and expiry context
- **WHEN** the worker reconstructs its SMS intent
- **THEN** reconstruction succeeds using the customer context

### Requirement: Retry and cost evidence

The system SHALL expose retry attempts and provider cost or an explicit unavailable value using integer minor units or another documented decimal-safe representation.

#### Scenario: Provider cost unavailable

- **GIVEN** the provider accepts a message without returning cost metadata
- **WHEN** SMS operations are summarized
- **THEN** cost is explicitly unavailable and is not represented as zero or an invented estimate
