# Design: Fraud consolidation and scheduled outbox slice

## Existing boundaries

- Nest API and the persistent worker are separate entrypoints. `src/worker.ts` remains authoritative for SMS and other background responsibilities during migration.
- PostgreSQL `OutboxEvent` already stores event status, attempts, retry time, completion, and dead-letter state. The existing worker claims with `FOR UPDATE SKIP LOCKED` and uses an `updatedAt` stale threshold.
- `ReportMaterializationCronController` already demonstrates the public-route + `CRON_SECRET` boundary. The new endpoint must use the same fail-closed and timing-safe bearer-secret validation pattern without coupling to report execution.
- `FraudService` already reads branch-specific flag/approval policy thresholds and upserts tenant-scoped dedupe keys. Worker logic separately evaluates receipt/redemption values and calls `FraudBehaviorRuntime`, creating duplicate implementations and potentially overlapping purchase flags.

## Decisions

1. Make `FraudService` the single entry point for both existing immediate rule evaluation and outbox-based fraud evaluation. Keep synchronous transaction validation/approval paths unchanged; asynchronous fraud evidence remains an outbox concern.
2. Keep old fraud rule codes and records readable. Stop generating the deferred low-confidence rules, but do not delete or rewrite existing flags or enum values.
3. For a purchase above the branch purchase approval threshold, emit one high-severity purchase finding. For a purchase above only the flag threshold, emit one medium-severity finding. Preserve existing stable high-value dedupe keys where possible so replay of pre-cutover events converges on the same records.
4. Add a small `OutboxProcessingModule` with a protected controller and a database-backed processor. The claim transaction only locks/selects rows and persists the claim; it never performs network I/O. Fraud data loading, finding upserts, and marking the event complete are committed atomically under the event row lock.
5. Process only `fraud.evaluate` in this first endpoint. This keeps provider/SMS, report, approval-expiry, credit-expiry, and maintenance semantics outside the initial cutover while allowing the old worker to continue handling them.
6. Use current persisted outbox state for lease/recovery and retry behavior; do not add schema or migration unless implementation proves the existing fields cannot provide a safe bounded lease. A failure must preserve the event and record a retry or dead-letter outcome; never silently mark it complete.
7. The scheduler remains inert until an external authorized schedule is configured. Do not change Vercel project settings or invoke the endpoint against remote environments in this code change.

## Risks and mitigations

- Old worker and new endpoint can overlap: atomically claim with `SKIP LOCKED`, then serialize per-event completion/evaluation under the event row lock and check `processedAt` before any writes.
- Historical outbox events can use old payload shapes: retain and test current duplicate-event payload decoding; unknown fraud payloads fail visibly and follow the existing bounded retry/dead-letter contract.
- Rule-code consolidation can change dashboard counts: retain historical rows, preserve stable dedupe keys, and test exactly-one new finding at both high-value thresholds.
- A future team may treat this additive endpoint as authorization to retire the worker: explicitly keep migration/cutover and runtime dependency removal out of scope pending staged reconciliation and acceptance evidence.

## Verification

Run focused fraud service/rules and outbox runtime/controller tests, API build/typecheck/lint, and Testcontainers integration tests for atomic claim, concurrent invocations, retry/dead-letter recovery, tenant scoping, and one-finding deduplication. Do not run against linked development or production Supabase; do not activate SMS or external scheduling.
