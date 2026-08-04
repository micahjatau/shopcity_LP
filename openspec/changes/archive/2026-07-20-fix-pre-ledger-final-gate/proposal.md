## Why

The current backend is close, but the pre-ledger gate still has production blockers: throttling only works against an unsecured local Redis endpoint, the bootstrap password policy still accepts the documented placeholder, audit writes can fail for system actors, and the public card/receipt contract is still ambiguous. We need to close those contradictions before starting any ledger migration.

## What Changes

- Make request throttling production-safe with a real Redis client and secure connection support.
- Strengthen bootstrap password validation so documented placeholders and weak defaults are rejected in non-test environments.
- Allow system-generated audit events while preserving tenant-safe actor references.
- Finalize the public card identifier contract and align it with the chosen API terminology.
- Finalize the pre-ledger receipt record semantics so the ledger input is explicit and idempotent.

## Capabilities

### New Capabilities

- `redis-throttling-production-safe`: production-capable Redis-backed throttling with secure connection handling and stable request buckets.
- `bootstrap-password-hardening`: explicit bootstrap password policy that rejects repository placeholders and weak values.
- `audit-system-actor-safety`: audit writes that support both human actors and system-generated events without violating database constraints.
- `card-serial-contract`: a finalized public card identifier contract that removes ambiguity between internal storage and API terminology.
- `receipt-record-finalization`: a clear pre-ledger receipt record shape with idempotency and optional external receipt reference semantics.

### Modified Capabilities

- None.

## Impact

- `src/common/throttle/`: throttle service, guard, and keying logic.
- `src/modules/audit/`: audit write path and integration tests.
- `src/modules/cards/`: card lookup/assignment contract and OpenAPI surface.
- `prisma/schema.prisma` and `prisma/migrations/`: schema adjustments for actor/receipt/card alignment.
- `prisma/seed.ts`, `.env.example`, `README.md`, and `docs/development/local-setup.md`: bootstrap expectations and operator guidance.
- `supabase/`: local/remote SQL migrations for the current schema state.
