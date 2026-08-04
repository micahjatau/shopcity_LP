# sms-delivery-truthfulness Specification

## Purpose

TBD - created by archiving change sprint-2-exit-gate-hardening. Update Purpose after archive.

## Requirements

### Requirement: Production-safe SMS provider selection

The system MUST select an SMS provider from validated configuration and MUST refuse to start in production when the configured provider is deterministic or test-only.

#### Scenario: Production startup rejects deterministic mode

- **WHEN** the worker starts in production with deterministic SMS mode
- **THEN** startup fails before any SMS job is processed

#### Scenario: Non-production can use deterministic mode

- **WHEN** the worker starts in non-production with deterministic SMS mode
- **THEN** the worker starts and uses the configured test provider

### Requirement: Truthful SMS delivery states

The system MUST persist only the delivery state reported by the provider and MUST NOT mark a message DELIVERED unless the provider supplies delivery evidence.

#### Scenario: Test provider does not fake delivery

- **WHEN** the provider cannot confirm delivery
- **THEN** the SMS record is stored as SENT, FAILED, or SUPPRESSED, not DELIVERED

#### Scenario: Delivery evidence persists

- **WHEN** the provider confirms delivery
- **THEN** the SMS record is stored as DELIVERED with provider metadata

### Requirement: SMS provider idempotency by outbox event

The system MUST treat the outbox event ID as the idempotency key for provider sends.

#### Scenario: Duplicate dispatch returns same provider identity

- **WHEN** the same outbox event is retried
- **THEN** the provider send resolves to one external delivery identity
