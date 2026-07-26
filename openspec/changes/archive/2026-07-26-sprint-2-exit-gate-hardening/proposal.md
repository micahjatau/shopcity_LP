## Why

The current Sprint 2 implementation still has release-blocking gaps: production can falsely record unsent SMS as delivered, older outbox rows can strand after upgrade, and the legacy approval path still bypasses the financial workflow. This change closes those exit gates so the outbox, SMS, approval, and migration paths are truthful, recoverable, and safe to deploy.

## What Changes

- Introduce production-safe SMS provider selection with validated configuration.
- Prevent deterministic SMS behavior from being used in production and stop claiming delivery without provider evidence.
- Add recovery for historical or Redis-lost outbox work, including missing SMS delivery records and stale published rows.
- Remove or retire legacy approval fallback paths that bypass ledger/outbox/SMS execution.
- Expose an explicit transaction identifier instead of overloading receipt identity.
- Revalidate current approval policy at execution time and tighten expiry/idempotency behavior.
- Align schema, migration, and upgrade-path verification for the SMS/outbox data model.
- Remove obsolete worker bootstrap paths once the new runtime is the only supported entrypoint.

## Capabilities

### New Capabilities
- `sms-delivery-truthfulness`: SMS dispatch must use a real provider contract in production and persist only truthful delivery states.
- `outbox-recovery-resilience`: The worker must recover historical, published, failed, and Redis-lost outbox work without stranding SMS delivery records.
- `financial-workflow-contracts`: Earn and approval flows must expose stable identifiers, revalidate policy at execution time, and stop relying on legacy bypass behavior.
- `migration-safety`: Schema, migration, and upgrade-path checks must keep outbox and SMS persistence aligned across deployed versions.

### Modified Capabilities

- None.

## Impact

- `src/jobs/outbox-worker.runtime.ts`, `src/jobs/outbox.worker.ts`, `src/jobs/sms.provider.ts`, and `src/worker.ts`.
- `src/modules/loyalty/loyalty.service.ts`, `src/modules/approvals/approvals.service.ts`, and receipt/transaction response shaping in the loyalty and receipts modules.
- Prisma models and migrations for `OutboxEvent` and `SmsMessage`, plus upgrade-path integration tests.
- CI and developer verification: worker tests, Redis outage/restart tests, migration deployment tests, and policy/idempotency regression tests.
- GitNexus blast radius: `ApprovalsService` impacts 7 symbols at low risk, `LoyaltyService` impacts 11 symbols at medium risk, and `createOutboxWorker` impacts 1 direct symbol at low risk.
