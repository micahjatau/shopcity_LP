# Design: Review 67 runtime certification closure

## 1. Duplicate receipt transaction boundary

The earn flow should separate the financial transaction from the expected duplicate outcome:

1. Enter the existing earn transaction and perform all reads needed to identify the receipt conflict.
2. If the receipt is already used, exit the financial transaction with a typed duplicate result rather than calling an independent transaction from inside it.
3. Outside the rolled-back financial transaction, persist the duplicate-attempt audit row and `fraud.evaluate` outbox event in one transaction.
4. Convert the typed result to the existing `409 RECEIPT_ALREADY_USED` response.

The evidence transaction must be idempotent or safely retryable because the request is a security/fraud signal. It must not create ledger, balance, lot, or receipt mutations. The normal earn path remains inside its existing transaction and does not pay the duplicate-evidence cost.

The regression should exercise the real service boundary with a Prisma client constrained to one connection, not merely mock the nested call. It should assert both HTTP/domain behavior and durable evidence.

## 2. k6 fixture validation

`K6_REPORT_BRANCH_ID` becomes a required test input for report isolation. During `setup()`, perform an authenticated branch-existence check using the configured session and fail with a clear infrastructure/configuration error before scenarios begin when the branch is missing. Do not substitute a UUID that may not exist.

The fixture identifier remains environment-specific and is never committed as a production data dependency. The performance evidence records the branch ID in redacted/non-secret run metadata so operators can reproduce the setup without exposing credentials.

## 3. Worker deployment contract

The API and worker are separate runtime artifacts but one release unit:

- both are built from the same immutable candidate SHA;
- the worker starts the actual `dist/src/worker.js` entrypoint;
- startup emits `SHOPCITY_WORKER_READY` only after dependencies and worker loops are initialized;
- the deployment workflow records worker deployment ID and runtime SHA;
- certification fails before mutating fixtures if API and worker provenance differ.

The worker smoke should use a dedicated tenant/device and a deterministic test provider only in non-production environments. Production certification must use the real provider and an approved test destination or provider-recognized terminal state. Evidence must contain status, IDs, timestamps, and SHAs, never provider credentials or message content containing secrets.

## 4. Production SMS configuration

Checked-in Vercel configuration must not set deterministic SMS or `ALLOW_FAKE_SMS_IN_PRODUCTION=true`. Environment validation and provider-factory tests should enforce that production cannot start with a fake provider. The deployment checklist should require `SMS_PROVIDER_MODE=real` and `ALLOW_FAKE_SMS_IN_PRODUCTION=false` or unset, plus the required real-provider credentials in the secret store.

## 5. SMS delivery-report polling

The provider submission path remains separate from the asynchronous delivery-report lookup: submission success is `SENT`, not handset delivery. DLR polling runs on an independent, validated worker timer so a slow provider lookup cannot block outbox publication. Each `SENT` message stores a nullable `nextDeliveryReportPollAt`; null means it has not yet been polled. The worker selects unpolled/due rows first, in stable due-time/sent-time/ID order, then compare-and-set claims each row by advancing its next poll time before the provider request. This also prevents duplicate polls when more than one worker instance is running. No-report and provider-error outcomes retain that scheduled next poll time. The default interval is five minutes and the default batch is ten, both bounded by environment validation.

A provider report can change state only while the row is still `SENT`, and only when any returned provider message ID matches the stored ID. Unknown/mismatched reports leave the row `SENT` and schedule another poll. The worker persists only normalized outcome and timestamps; raw XML/JSON is never logged or stored. Shutdown clears the dedicated timer and awaits an active DLR batch.

The additive schema migration introduces no backfill or financial-data mutation. Existing `SENT` messages with no next-poll timestamp are immediately eligible after deployment. The migration must be applied only through the normal reviewed migration path and recorded in the migration tracker.

## 6. Failure and rollback behavior

- If duplicate evidence persistence fails after a duplicate was detected, return a non-success error and emit an operationally visible failure; never report a successful earn.
- If the worker is absent, not ready, or SHA-mismatched, release certification stops and no SMS/outbox claim is made.
- If the k6 fixture is invalid, the performance run is configuration-failed rather than reported as a latency regression.
- Rollback restores the previous API/worker pair and removes only the new certification gate/configuration; it must not delete append-only audit or outbox evidence.
