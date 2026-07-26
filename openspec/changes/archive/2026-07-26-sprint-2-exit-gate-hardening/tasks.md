## 1. SMS Provider Hardening

- [x] 1.1 Add a provider factory that resolves `real`, `sandbox`, or `deterministic` SMS modes from validated env config.
- [x] 1.2 Replace the worker runtime default provider with the factory result and fail startup in production when deterministic mode is selected.
- [x] 1.3 Update SMS provider tests to prove truthful status mapping and outbox-event idempotency behavior.

## 2. Outbox Recovery

- [x] 2.1 Add worker-side reconstruction of missing `SmsMessage` rows from persisted outbox payloads before dispatch.
- [x] 2.2 Extend recovery to re-enqueue stale `PUBLISHED` outbox rows when the linked SMS record is still non-terminal.
- [x] 2.3 Add integration coverage for Redis outage/restart, Redis loss after publication, and multi-worker `SKIP LOCKED` recovery.

## 3. Financial Workflow Contracts

- [x] 3.1 Remove the legacy receipt-only approval fallback and route all approval decisions through the modern financial workflow or a documented error.
- [x] 3.2 Expose `transactionId` in earn and transaction responses and switch transaction lookup to the explicit transaction identifier.
- [x] 3.3 Add stable financial error codes for the common rejection classes and update controller/service tests to assert them.
- [x] 3.4 Clamp month-based expiry calculation so leap-day grants have a deterministic expiry date and add a regression test.
- [x] 3.5 Tighten same-idempotency-key concurrency handling so concurrent replays return the original successful response.

## 4. Schema and Migration Safety

- [x] 4.1 Align the Prisma schema with the deployed SMS uniqueness rule so schema and migration SQL match.
- [x] 4.2 Add deploy-style migration tests that use `prisma migrate deploy` and inspect the resulting indexes, constraints, and enum values.
- [x] 4.3 Add an upgrade-path fixture for legacy outbox rows and verify they can be recovered after the migration.
- [x] 4.4 Update `docs/database/migration-tracker.md` with the new migration and verification status.

## 5. Cleanup and Verification

- [x] 5.1 Remove or reduce the obsolete `src/jobs/worker.ts` bootstrap path so the runtime entrypoint is the only supported worker path.
- [x] 5.2 Run the targeted worker, ledger, receipt, and migration test suites and fix any regressions before marking the change ready.
