## Context

Review-35 leaves several release blockers across runtime correctness, audit truthfulness, and restore verification. The change is intentionally cross-cutting, but the implementation can still be organized into a small set of isolated workstreams.

## Goals / Non-Goals

**Goals:**
- Prevent approval execution from using stale eligibility data.
- Make deadline-driven expiry ownership auditable and truthful.
- Terminally fail malformed persisted SMS work on the first attempt.
- Make quarantine batch selection explicit and source-row locking deterministic.
- Remove reversal as a claimed release capability.
- Upgrade restore verification to compare real migration ledger state and historical data integrity.

**Non-Goals:**
- Implementing the deferred reversal review-request workflow.
- Reworking approval, SMS, or quarantine schemas beyond what is required for the gate.
- Changing product UX beyond hiding the reversal route from operator-facing surfaces.

## Decisions

- Use one deterministic lock order for approval execution so concurrent updates cannot slip between validation and financial execution. Read the aggregate only after all required locks are acquired.
- Treat deadline-driven expiry as system-owned state. The requesting supervisor or worker may be recorded as the detector, but not as the decision owner.
- Classify malformed persisted SMS payloads as terminal poison work, not retryable delivery failures.
- Require an explicit quarantine batch ID and enforce conditional state transitions with affected-row-count checks.
- Ship reversal as unavailable for this release instead of exposing a review request that does not exist.
- Expand restore verification to inspect the full `_prisma_migrations` ledger and the key historical business and schema objects the release depends on.

## Risks / Trade-offs

- [Broader lock coverage can increase contention] -> Mitigate by keeping the lock set deterministic and scoped to the execution aggregate.
- [Terminal SMS classification may surface new data issues] -> Mitigate by logging a stable invalid-payload category and adding a regression test with a persisted malformed row.
- [Explicit batch IDs change operator workflow] -> Mitigate by rejecting implicit selection rather than guessing the intended batch.
- [Restore checks may fail on historical gaps] -> Mitigate by making the report machine-readable and including the missing object or row.

## Migration Plan

1. Update approval execution to lock the complete mutable eligibility set before re-reading the aggregate.
2. Fix expiry attribution so deadline-driven transitions are system-owned.
3. Separate terminal malformed SMS handling from retryable delivery errors.
4. Tighten quarantine batch selection and source-row locking, then cover the concurrent-execution cases.
5. Disable reversal for the release and remove it from operator-facing claims.
6. Extend restore verification to compare the full migration ledger and historical object/data inventory.
7. Run the targeted regression tests for concurrency, terminal failure, and restore validation.
