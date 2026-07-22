## Context

The review shows the worker is close, but not production-safe yet: `createSmsProvider()` allows multiple modes, recovery can republish historical work, and `SmsMessage`/`OutboxEvent` still lack a clear dead-letter path. BullMQ retention with a fixed job id also creates a replay hazard if a recoverable event is re-added later.

## Goals / Non-Goals

**Goals:**
- Prevent fake delivery claims in production.
- Make SMS recovery bounded and observable.
- Preserve provider idempotency across retries and replays.
- Keep retry behavior testable in integration coverage.

**Non-Goals:**
- Redesign the full SMS provider ecosystem.
- Add new frontend or operator UI flows.
- Replace BullMQ with a different queue.

## Decisions

- Keep the provider factory as the single entry point, but treat deterministic mode as dev/test only. Alternative: allow deterministic mode in production behind a flag. Rejected because the review already identifies false delivery records as a production blocker.
- Add explicit retry metadata instead of overloading `status` alone. `lastAttemptAt`, `nextAttemptAt`, `deadLetteredAt`, and `failureCategory` make permanent failure visible and let recovery stop cleanly. Alternative: status-only counters. Rejected because they do not distinguish retryable from terminal failure well enough.
- Preserve provider idempotency with `outboxEventId`, but make BullMQ replay safe by giving retries an executable path that is not blocked by a retained completed/failed job. Alternative: re-adding the same fixed job id. Rejected because BullMQ may resolve it to the existing retained record.
- Keep delivery state aligned to provider evidence. If a provider only acknowledges acceptance, the system should store that as SENT, not DELIVERED. Alternative: infer DELIVERED from request success. Rejected because it recreates the false-confidence problem called out in the review.

## Risks / Trade-offs

- [Schema changes ripple through recovery code] → Keep the migration additive and update integration tests before switching behavior.
- [Replay-safe retries can complicate tracing] → Include `outboxEventId` and attempt number in logs and provider metadata.
- [Dead-lettered messages may require manual operations] → Document the retry path and keep the state explicit in the schema.

## Migration Plan

1. Add the delivery-state fields and any retry metadata needed for dead-letter handling.
2. Update the provider factory to fail fast in production when deterministic mode is selected.
3. Update the worker recovery path so retries remain executable even if BullMQ retains the previous job.
4. Add integration tests for production-mode rejection, bounded retries, and replay-safe recovery.
5. Update `docs/database/migration-tracker.md` after the schema migration lands.

## Open Questions

- Should the dead-letter limit live in config, or be derived from BullMQ attempts plus a database cap?
- Do we want retries to replace retained BullMQ jobs or to use attempt-specific job ids?
