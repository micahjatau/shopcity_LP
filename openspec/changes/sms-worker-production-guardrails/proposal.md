## Why

The current SMS worker path still leaves production safety gaps: startup can bypass the validated provider factory, and a replayed BullMQ job can keep sending after the database has already marked the message dead-lettered. This change closes those gaps so SMS delivery obeys the persisted retry budget and production mode cannot start in a fake configuration.

## What Changes

- Route worker startup through the SMS provider factory before any database or Redis work begins.
- Expand SMS provider environment validation so `deterministic`, `sandbox`, and `real` are valid modes.
- Require real-provider connection settings when `SMS_PROVIDER_MODE=real`.
- Stop provider calls when the persisted SMS record is already dead-lettered or has exhausted its retry budget.
- Discard remaining BullMQ retry attempts after a message becomes terminal.
- Add regression coverage for production bootstrap, environment validation, and replayed retry exhaustion.

## Capabilities

### New Capabilities

- `sms-worker-production-guardrails`: production-safe SMS provider bootstrap and persisted retry-budget enforcement.

### Modified Capabilities

- None.

## Impact

`src/worker.ts`, `src/config/env.validation.ts`, `src/jobs/sms.provider.factory.ts`, `src/jobs/outbox-worker.runtime.ts`, related worker tests, and the SMS environment example/docs.
