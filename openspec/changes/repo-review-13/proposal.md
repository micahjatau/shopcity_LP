## Why

The current outbox/SMS path still allows a fake provider mode to look production-safe, and the review shows recovery can either resend a SENT message or get stuck behind retained BullMQ jobs. This change closes those gaps so delivery state matches real provider behavior and recovery is bounded before Sprint 2 can be closed.

## What Changes

- Add hard startup validation that refuses deterministic SMS mode in production and requires real-provider settings when real mode is selected.
- Separate queued, sent, delivered, failed, and dead-letter SMS states so automatic recovery does not republish indefinitely.
- Make outbox requeueing safe when BullMQ retains old jobs by preserving provider idempotency across retries.
- Add regression coverage for production-mode rejection, retry exhaustion, and replay-safe recovery.

## Capabilities

### New Capabilities

- `sms-delivery-reliability`: production SMS mode safety, replay-safe outbox retries, and bounded failure handling.

### Modified Capabilities

- None.

## Impact

`src/jobs/sms.provider.factory.ts`, `src/jobs/outbox-worker.runtime.ts`, `src/jobs/outbox.publisher.ts`, `src/jobs/sms.provider.ts`, `prisma/schema.prisma`, worker integration tests, and `docs/database/migration-tracker.md`.
