## 1. Approval execution hardening

- [x] 1.1 Expand approval execution locking to cover Customer, Card, Device, relevant CreditLots, and relevant allocation rows in a deterministic order.
- [x] 1.2 Re-read the approval aggregate only after all required locks are acquired and run eligibility checks against the post-lock state.
- [x] 1.3 Fix request-discovered expiry handling so deadline-driven transitions use system/null ownership and keep the requesting supervisor or worker as the detector only.
- [x] 1.4 Add concurrency regression coverage for status changes that occur while approval execution is waiting on locks.

## 2. SMS malformed payload terminalization

- [x] 2.1 Split malformed persisted SMS payload handling away from normal retryable delivery errors.
- [x] 2.2 Mark existing malformed SMS rows as failed and dead-lettered immediately, with a stable invalid-payload category and no provider call.
- [x] 2.3 Prevent the malformed existing-SMS path from rethrowing as a BullMQ retryable error.
- [x] 2.4 Add a regression test for an already-persisted malformed SMS record and verify it stays terminal after worker recovery.

## 3. Receipt quarantine safety

- [x] 3.1 Require an explicit batch ID for quarantine report, stage, and execute operations.
- [x] 3.2 Lock the actual source Receipt rows before duplicate revalidation and keep the locks through snapshot insertion and deletion.
- [x] 3.3 Reject quarantine execution when a source Receipt no longer matches the staged tenant, branch, week, or normalized identity.
- [x] 3.4 Enforce conditional state transitions for APPROVED -> STAGED and STAGED -> EXECUTED using affected-row-count checks.
- [x] 3.5 Add concurrency and re-execution tests covering concurrent updates, missing rows, and non-destructive reruns.

## 4. Reversal release gating

- [x] 4.1 Return a stable deferred or unavailable response from the reversal endpoint.
- [x] 4.2 Remove reversal from operator-facing workflow claims and keep it out of the UI surface for this release.
- [x] 4.3 Add a contract test that verifies the reversal route does not create a durable review request.

## 5. Restore verification expansion

- [x] 5.1 Compare the full `_prisma_migrations` history, including migration_name, checksum, finished_at, rolled_back_at, applied_steps_count, and failure state.
- [x] 5.2 Fail closed on rolled-back, incomplete, duplicate, or repository-missing migrations before any repair or resolve step runs.
- [x] 5.3 Expand restore verification to inventory the historical Receipts, EARN and REDEEM ledger entries, CreditLots, Redemptions, RedemptionAllocations, AllocationRestorations, and required supporting SQL/auth objects.
- [x] 5.4 Update the machine-readable restore report so it records missing rows or objects explicitly.
- [x] 5.5 Add regression coverage for missing historical data, broken relationships, and missing supporting objects.

## 6. Final validation

- [x] 6.1 Run the targeted approval, SMS, quarantine, reversal, and restore verification tests.
- [x] 6.2 Confirm the change artifacts remain aligned with the implemented scope before handing off for `/opsx-apply`.
