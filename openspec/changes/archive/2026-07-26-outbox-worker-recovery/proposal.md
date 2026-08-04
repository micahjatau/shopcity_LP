## Why

The current earning flow still publishes queue work from inside the financial transaction and does not actually deliver SMS notifications or recover aged outbox rows. That leaves a gap between committed financial writes and operational messaging, which can produce orphan jobs, missed messages, or permanently pending work after a Redis outage.

## What Changes

- Move outbox publication out of the financial transaction and into a committed-row publisher loop.
- Add a launchable worker process for outbox publication, retry, and SMS delivery.
- Introduce a delivery record and state transitions for queued, sent, delivered, failed, and suppressed SMS outcomes.
- Add recovery behavior for aged pending or failed outbox rows.
- Add graceful startup and shutdown handling for worker and Prisma resources.

## Capabilities

### New Capabilities

- `outbox-worker-recovery`: committed outbox publication, asynchronous SMS delivery, retry/recovery, and operational delivery-state tracking.

### Modified Capabilities

-

## Impact

Affected areas include the earn/approval workflows, outbox persistence, SMS delivery pipeline, worker startup scripts, Redis queue usage, Prisma models/migrations, and integration tests covering rollback, retry, and recovery behavior.
