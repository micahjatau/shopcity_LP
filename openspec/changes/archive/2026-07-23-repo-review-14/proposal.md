## Why

The latest SMS reliability review still shows critical production gaps: the production worker does not use the configurable SMS provider factory, environment validation only accepts deterministic mode, and a dead-lettered job can still continue sending during BullMQ retries. This change updates the spec so the delivery path is production-safe and bounded.

## What Changes

- Require the production worker to construct its SMS provider through the environment-aware factory instead of hard-coding the deterministic provider.
- Expand the environment contract so real and sandbox SMS modes are accepted and validated with their required settings.
- Require the worker to stop sending once a message is dead-lettered or the retry budget is exhausted.
- Require replay-safe provider behavior so duplicate BullMQ retries do not re-trigger provider side effects.
- Add regression coverage for production provider wiring, environment validation, and bounded retries.

## Capabilities

### New Capabilities
- `sms-delivery-reliability`: production provider selection, bounded retries, and replay-safe SMS delivery.

### Modified Capabilities
- None.

## Impact

`src/jobs/sms.provider.factory.ts`, `src/jobs/outbox-worker.runtime.ts`, `src/jobs/sms.provider.ts`, worker configuration validation, BullMQ retry handling, related integration tests, and `docs/database/migration-tracker.md` if schema or verification status changes.
