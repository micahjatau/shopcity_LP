## Why

Phase 1 is runnable, but the foundation still has gaps in session correctness, tenant-safe identity resolution, card invariants, bootstrap usability, and config source-of-truth. Those gaps are acceptable for demos, but not for the pre-ledger baseline the repo is targeting.

## What Changes

- Make session rotation atomic and remove the unused refresh-token contract from the backend session model.
- Reject authenticated operations when the tenant or branch is no longer eligible for use.
- Resolve local login identities only through the Supabase-linked account, not username fallback.
- Enforce one active card per customer at the database level and make card replacement transitions safe under concurrency.
- Provide a usable first administrator path for a fresh install that can actually authenticate through the real flow.
- Read branch-facing public configuration from PostgreSQL so runtime config matches admin-edited branch settings.

## Capabilities

### New Capabilities
- `foundation-integrity-hardening`: session lifecycle correctness, tenant/branch availability checks, tenant-safe identity resolution, card invariants, bootstrap usability, and configuration consistency before ledger work begins.

### Modified Capabilities
- None.

## Impact

- `src/modules/auth/`, `src/common/auth/`, and session-related API contracts.
- `src/modules/users/`, `src/modules/cards/`, and the associated Prisma schema and migrations.
- `src/modules/configuration/`, `src/modules/branches/`, seed data, and bootstrap documentation.
- `prisma/schema.prisma`, `prisma/seed.ts`, `README.md`, `docs/database/migration-tracker.md`, and integration coverage in `test/`.
