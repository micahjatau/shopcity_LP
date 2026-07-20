## Why

The latest review still flags two P0 blockers before ledger work can start: physical POS receipts are not enforced as the real uniqueness boundary, and Redis-backed safeguards are not fully self-contained or recoverable in CI and runtime. This change closes those gaps so receipt capture can be trusted as a pre-ledger gate.

## What Changes

- **BREAKING** Require a physical POS receipt number for receipt capture, remove the generated business `receiptNumber`, and make the normalized weekly receipt identity the database uniqueness boundary.
- Enforce active device attribution and derive cashier branch context from authenticated tenant data instead of trusting arbitrary branch submission.
- Bound transaction timestamps so future or stale captures cannot move receipts across weeks without an explicit audited override.
- Consolidate receipt actor and ownership fields so the database enforces tenant-safe persistence with one authoritative actor reference.
- Add self-contained Redis provisioning for tests/CI and bounded reconnect plus observable recovery handling for Redis-backed controls.

## Capabilities

### New Capabilities
- `receipt-integrity-gate`: required POS receipt identity, removal of the generated business receipt number, device/branch attribution, timestamp bounds, and tenant-safe receipt persistence.
- `redis-operability-hardening`: self-contained Redis test provisioning, reconnect recovery, and observable failure handling.

### Modified Capabilities
- None.

## Impact

- `src/modules/receipts/`, `src/modules/auth/`, and related DTO/guard/service code for receipt capture and authorization context.
- `prisma/schema.prisma` and migration files for receipt uniqueness, tenant-composite relations, and actor field consolidation.
- Integration tests covering duplicate receipts, branch/device validation, timestamp bounds, and override handling.
- Redis client setup, CI/test environment wiring, and operational logging around reconnect/fail-closed behavior.
- OpenAPI/docs that describe the receipt capture contract and operator expectations.
