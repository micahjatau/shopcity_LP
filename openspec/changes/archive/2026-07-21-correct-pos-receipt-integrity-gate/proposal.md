## Why

The latest review still blocks ledger work because receipt identity, timestamp handling, and migration behavior do not yet match the intended pre-ledger trust model. CI and docs are cleaner now, but the repository still needs a corrected receipt-integrity gate before immutable earning logic can safely start.

## What Changes

- **BREAKING** Require a physical POS receipt number for receipt capture and remove the generated business `receiptNumber` from the contract.
- Correct the receipt migration path so historical rows preserve the real POS reference instead of a previously generated UUID.
- Require active device attribution for cashier receipt capture and derive branch context from authenticated or bound device data rather than trusting arbitrary request input.
- Bound POS transaction timestamps and require an explicit audited override path for stale, future, or cross-week exceptions.
- Enforce tenant-safe receipt ownership with composite relations and a single authoritative actor reference.
- Add safe monetary bounds and contract-level validation for purchase amounts.
- Add self-contained Redis test/runtime recovery coverage so Redis-backed safeguards do not depend on ambient host services.

## Capabilities

### New Capabilities
- `receipt-integrity-gate`: required POS receipt identity, migration correction, device/branch attribution, timestamp bounds, tenant-safe persistence, and safe money limits.
- `redis-operability-hardening`: disposable Redis test provisioning, fail-closed coverage, and bounded reconnect/recovery handling.

### Modified Capabilities
- None.

## Impact

- `src/modules/receipts/`, `src/modules/auth/`, and related DTO, guard, and service code for receipt capture and authorization context.
- `prisma/schema.prisma` and migration files for receipt uniqueness, tenant-composite relations, actor field consolidation, and migration/backfill safety.
- Integration tests covering duplicate receipts, branch/device validation, timestamp bounds, override handling, and Redis recovery.
- Redis client setup, CI/test environment wiring, and operational logging around reconnect/fail-closed behavior.
- OpenAPI/docs that describe the receipt capture contract and operator expectations.
