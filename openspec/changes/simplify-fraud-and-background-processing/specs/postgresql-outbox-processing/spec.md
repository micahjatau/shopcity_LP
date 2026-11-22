# PostgreSQL outbox processing

## ADDED Requirements

### Requirement: Protected bounded fraud outbox trigger

The system MUST expose a server-side cron endpoint that requires a valid bearer `CRON_SECRET`, fails closed when the secret is missing, and processes only a bounded batch of supported fraud evaluation events.

#### Scenario: Unauthorized invocation

- **WHEN** the cron secret is absent or the supplied bearer secret does not match
- **THEN** the request is rejected without claiming or mutating outbox events

#### Scenario: Bounded invocation

- **WHEN** an authorized invocation runs
- **THEN** it claims at most the configured batch size of eligible `fraud.evaluate` events and reports truthful processed, deferred/retried, and dead-letter counts

### Requirement: Atomic durable event claiming

Eligible events MUST be claimed in a short PostgreSQL transaction using row-level locks that skip rows claimed by concurrent invocations. The processor MUST recover eligible stale claims and persist retry/dead-letter outcomes; it MUST NOT discard failed events or hold claim locks during network I/O.

#### Scenario: Concurrent schedules

- **WHEN** two authorized invocations claim overlapping eligible rows
- **THEN** each event is claimed by at most one invocation in that claim cycle

#### Scenario: Recoverable failure

- **WHEN** fraud evaluation fails
- **THEN** the event remains durable with a bounded retry time or reaches an observable terminal dead-letter state after the retry budget

### Requirement: Idempotent fraud event completion

Fraud evidence upserts and terminal completion of one outbox event MUST be atomic and guarded by the event row's current state. Re-delivery of an already completed event MUST NOT increment finding occurrence counts again.

#### Scenario: Duplicate delivery

- **WHEN** the same fraud outbox event is delivered by BullMQ and the scheduled processor, or retried after completion
- **THEN** only the first successful transaction writes the event's findings and completion; later processing performs no duplicate evidence update

### Requirement: Preserve unsupported event owners

The scheduled processor MUST process only supported `fraud.evaluate` events in this change. It MUST NOT send SMS, complete or mutate `sms.send` records, or take ownership of report, approval-expiry, credit-expiry, or maintenance events.

#### Scenario: SMS remains pending

- **WHEN** `sms.send` events exist during a scheduled fraud pass
- **THEN** the processor does not call an SMS provider and does not change those events or their `SmsMessage` records
