## 1. Provider safety

- [ ] 1.1 Harden SMS provider selection so deterministic mode fails in production.
- [ ] 1.2 Keep real-provider configuration validation strict for required URL/token settings.
- [ ] 1.3 Add unit coverage for production rejection and mode-specific config errors.

## 2. Bounded recovery model

- [ ] 2.1 Add the delivery metadata needed for dead-letter and retry tracking.
- [ ] 2.2 Update the worker recovery path to stop automatic republishing after the retry budget is exhausted.
- [ ] 2.3 Preserve provider idempotency for replayed outbox sends.

## 3. BullMQ replay safety

- [ ] 3.1 Make retried outbox work executable even if BullMQ retains a prior completed or failed job.
- [ ] 3.2 Update job naming or job replacement logic so replay does not depend on queue retention behavior.
- [ ] 3.3 Add regression coverage for retrying a previously retained job.

## 4. Verification and tracking

- [ ] 4.1 Add integration tests for bounded retries, dead-lettering, and replay-safe recovery.
- [ ] 4.2 Update `docs/database/migration-tracker.md` for the schema change and verification status.
- [ ] 4.3 Run the relevant worker and migration test suite to confirm the change is stable.
