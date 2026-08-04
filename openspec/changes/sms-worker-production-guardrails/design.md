## Context

The SMS worker already has a provider factory and retry metadata in the domain model, but the review shows two production blockers remain: startup safety still depends on the bootstrap path actually using the factory, and a replayed BullMQ job can keep invoking the provider after the database has marked the message dead-lettered. The worker is the main stakeholder, along with env validation, the SMS provider factory, and the retry/recovery tests that prove the path is bounded.

## Goals / Non-Goals

**Goals:**

- Make worker startup fail fast when production is configured for deterministic SMS delivery.
- Ensure provider selection happens before the worker opens Prisma or Redis connections.
- Enforce the persisted SMS retry budget even when BullMQ replays a job.
- Keep the change small enough to ship without schema or API changes.

**Non-Goals:**

- Adding a new SMS vendor.
- Solving provider-side idempotency or atomic delivery leasing.
- Routing non-SMS outbox events.
- Changing the existing SMS data model.

## Decisions

### 1. Keep provider resolution in the worker bootstrap path

The production worker will construct the SMS provider through `createSmsProvider(process.env)` before any Prisma or Redis work begins. That keeps the production safety check in one place and makes the startup failure obvious when the mode is misconfigured.

Alternatives considered:

- Validating only in the shared env schema. Rejected because the schema cannot express the runtime production-only rule by itself.
- Duplicating the validation in both bootstrap and factory. Rejected because it spreads the same policy across two places.

### 2. Allow all documented provider modes, but gate deterministic mode at runtime in production

`SMS_PROVIDER_MODE` will continue to support `deterministic`, `sandbox`, and `real`. The shared environment schema should accept the same modes, while the factory enforces that `deterministic` cannot start in production.

This keeps test and sandbox behavior available without weakening the production guard.

Alternatives considered:

- Rejecting deterministic mode in the schema for every environment. Rejected because it blocks local and test usage.
- Requiring a separate production-only schema. Rejected because it adds complexity without improving the guard.

The real provider rollout also treats the provider token as required configuration, alongside the connection URL, so production cannot start with a half-configured HTTP provider.

### 3. Make persisted retry state the source of truth for send eligibility

The worker will check `deadLetteredAt` and `attempts` on the persisted SMS row before any provider call. If the record is terminal, the job will not call the provider and will stop further BullMQ retries.

After a message becomes dead-lettered, the runtime will call BullMQ `discard()` directly so remaining queue attempts cannot keep the same message alive beyond the persisted budget.

Alternatives considered:

- Trusting BullMQ's retry count alone. Rejected because recovered jobs can outlive the original queue budget.
- Requeueing terminal messages and relying on recovery to filter them out later. Rejected because it still burns provider calls.

### 4. Cover bootstrap and replay paths with focused tests

The test plan will prove three things:

- production startup rejects deterministic mode before the worker opens connections,
- real mode requires the expected environment settings,
- a replayed job stops once the persisted retry budget is exhausted.

Alternatives considered:

- Relying only on unit tests around the factory. Rejected because the review specifically calls out the production bootstrap path.

## Risks / Trade-offs

- [Risk] Misconfigured production envs will fail fast at startup. → Mitigation: keep the error explicit and document the required settings in the env example.
- [Risk] The retry guard may expose older rows with unexpected persisted attempts. → Mitigation: treat the row as terminal and surface the failure clearly instead of retrying blindly.
- [Risk] Using discard/unrecoverable semantics may change worker failure telemetry. → Mitigation: assert the terminal behavior in tests and keep logging on the dead-letter transition.

## Migration Plan

1. Update the worker bootstrap to instantiate the provider from validated env before Prisma/Redis connections.
2. Keep the env schema aligned with the supported provider modes and document the real-provider settings.
3. Add the persisted retry-budget guard and terminal job discard path.
4. Add tests for production startup, real-mode validation, and replayed dead-letter handling.
5. Deploy the worker image; no database migration is required for this change.

Rollback strategy:

- Revert the worker image if startup or retry handling regresses. The change is application-only and does not alter persisted schema.

## Open Questions

- None.
