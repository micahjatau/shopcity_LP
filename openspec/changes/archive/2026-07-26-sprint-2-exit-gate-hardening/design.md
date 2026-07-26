## Context

Sprint 2 already moved SMS publication out of the financial transaction and introduced a worker/runtime split, but the current design still has unsafe production defaults and recovery gaps. The worker defaults to a deterministic SMS provider, historical outbox rows can be stranded when no `SmsMessage` exists, legacy approval handling can bypass financial execution, and the Prisma schema/migration pair is not fully aligned.

This change hardens the release boundary rather than changing the core product model. The main stakeholders are the worker runtime, loyalty/approval flows, Prisma migrations, and the integration test suite that proves upgrade and recovery behavior.

## Goals / Non-Goals

**Goals:**
- Make SMS delivery truthful in production.
- Recover historical and Redis-lost outbox work without manual database repair.
- Remove receipt-only approval bypasses and expose a real transaction identifier.
- Make migration and upgrade behavior verifiable against the deployed SQL, not only `prisma db push`.
- Keep the changes small enough to ship as a single hardening release.

**Non-Goals:**
- Selecting or integrating a new third-party SMS vendor in this change.
- Redesigning the full receipt or ledger domain model.
- Changing the outbox event contract beyond what is required for SMS recovery.
- Introducing new frontend flows or UI changes.

## Decisions

### 1. Introduce a worker SMS provider factory

The worker entrypoint will stop instantiating `DeterministicSmsProvider` directly. Instead, a small factory will resolve the provider from validated environment and runtime mode.

The factory will support three modes:
- `real` for production-like delivery using provider credentials.
- `sandbox` for non-production testing that can report `SENT` or `SUPPRESSED` but never fake delivery.
- `deterministic` for unit/integration tests only.

In production, the factory will reject `deterministic` and fail startup before the worker processes messages.

Alternatives considered:
- Injecting provider instances directly from `worker.ts`. Rejected because it scatters the production safety check.
- Keeping deterministic mode in production and changing the status mapping. Rejected because the review explicitly calls out false delivery evidence as a P0 issue.

### 2. Make the outbox worker self-heal missing SMS rows

The worker runtime will own recovery for both new and historical rows. When a recoverable outbox event is claimed, the runtime will verify the associated `SmsMessage` row exists. If it does not, the worker will recreate it from the persisted outbox payload before attempting send.

Recovery will also consider `PUBLISHED` outbox rows when the linked SMS row is still non-terminal and `publishedAt` is older than the recovery threshold. This closes the Redis-loss hole without changing the outbox job ID strategy.

Alternatives considered:
- One-time data migration only. Rejected because it leaves future restore/replay paths dependent on perfect migration completion.
- Treating missing SMS rows as terminal failures. Rejected because it strands recoverable historical work.

### 3. Remove the legacy receipt-only approval path

The legacy approval fallback will not remain a runtime path. Approval decisions will either execute through the current financial workflow or fail with a documented, stable error until the missing data is backfilled.

The preferred rollout is:
- backfill any legacy approval state into modern approval records before cutover,
- then remove the review-only fallback from `ApprovalsService`.

This preserves auditability and prevents receipt review state from becoming a silent substitute for ledger/outbox/SMS execution.

Alternatives considered:
- Keep the fallback and patch only the side effects. Rejected because it still mixes legacy review semantics with current financial execution.
- Leave the fallback in place indefinitely. Rejected because it conflicts with the verified exit-gate goal.

### 4. Make transaction identity explicit

`transactionId` will be treated as the canonical financial lookup identifier and will map to the ledger entry identity for confirmed earn flows. Responses can continue to include receipt fields, but the API contract will expose `transactionId` so callers do not have to infer the transaction from receipt identity.

Alternatives considered:
- Reusing `receiptId` as the canonical lookup key. Rejected because it keeps the domain model ambiguous.
- Introducing a brand-new synthetic transaction table. Rejected because it adds schema and migration cost without solving a current ambiguity.

### 5. Clamp expiry instead of using UTC month rollover

The expiry helper will clamp to the last valid day of the target month when a source date does not exist in the target month. That makes February 29 behavior deterministic and testable.

Alternatives considered:
- Keeping `setUTCMonth` rollover semantics. Rejected because it is not obvious to operators and produces surprising leap-day results.

### 6. Normalize error reporting for the financial workflow

The loyalty and approval services will return stable machine-readable codes for common rejection classes while keeping human-readable messages. A shared domain error helper will map known cases such as idempotency conflict, inactive card, receipt conflict, ineligible customer, and approval policy mismatch.

Alternatives considered:
- Leaving all existing `BadRequestException` and `ConflictException` messages as-is. Rejected because the review shows the frontend cannot safely distinguish classes of failure.

### 7. Align Prisma schema and migration output

The SMS model will use one consistent uniqueness strategy. The design will keep the tenant-scoped uniqueness on `tenantId + outboxEventId` and remove the redundant single-column `@unique` expectation so the Prisma schema matches the deployed migration SQL.

This is the smallest safe fix because the worker always resolves SMS rows through tenant-scoped keys.

Alternatives considered:
- Add a new single-column unique index to the migration. Rejected because it creates an extra rule that is not needed for current lookups.

## Risks / Trade-offs

- [Risk] Production starts may fail if provider mode is misconfigured. → Mitigation: validate early, add startup tests, and keep the failure explicit.
- [Risk] Backfilling legacy SMS rows may expose malformed historical payloads. → Mitigation: fail the specific row loudly and report the bad record instead of silently dropping it.
- [Risk] Removing legacy approval fallback may block old receipts if backfill misses data. → Mitigation: backfill first, cut over second, and keep the release sequence explicit.
- [Risk] Schema alignment changes can invalidate assumptions in old tests. → Mitigation: use deploy-style migration tests and upgrade-path fixtures rather than `db push` shortcuts.
- [Risk] Transaction identity changes may affect API consumers. → Mitigation: expose `transactionId` alongside existing receipt data during the transition.

## Migration Plan

1. Add the SMS provider factory, truthful status mapping, and worker-side SMS backfill logic.
2. Add recovery for stale `PUBLISHED` rows and keep the existing job-id deduplication.
3. Backfill any legacy approval records needed to remove the receipt-only fallback safely.
4. Update Prisma schema and migration verification so deployed SQL and schema agree on SMS uniqueness.
5. Add upgrade-path tests for old outbox rows, Redis interruption, and same-key concurrency.
6. Remove the obsolete worker bootstrap once the runtime path is covered by tests.

Rollback strategy:
- Revert the application image if provider or recovery behavior regresses; the database changes are additive and the worker can continue to read existing rows.
- If the approval backfill is incomplete, keep the legacy compatibility path disabled only after the backfill passes.

## Open Questions

- Which real SMS provider configuration keys should the `real` adapter read?
- Should `transactionId` be surfaced as a new top-level field only, or also added to any OpenAPI examples that currently describe receipt identity?
- Are there any legacy approval rows that require a one-time backfill before the runtime fallback can be deleted?
