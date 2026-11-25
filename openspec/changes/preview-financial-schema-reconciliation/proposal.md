## Why

Preview's completed F1 credit-expiry request fails at deferred ledger commit with `unsupported ledger type/direction combination`. A disposable PostgreSQL 17.6 reproduction using the exact Preview ledger-validator definition reproduced the `PrismaClientUnknownRequestError` and proved transaction rollback. The fresh 61-migration Prisma chain contains the required EXPIRY branch and expiry safeguards, but Preview's corresponding validator/lot-balance functions and expiry triggers are stale or missing. The comparison also found additional missing financial constraints and mutation/invariant triggers.

## What Changes

- Add a forward-only, idempotent Prisma reconciliation migration for missing financial database safeguards, with the EXPIRY ledger branch and credit-lot balance equation as the F1-critical parts.
- Restore missing CHECK constraints and triggers/functions for ledger, lot, expiry, receipt, approval, redemption, allocation/restoration, adjustment, and audit evidence without changing financial rows.
- Preserve Preview's existing tenant-composite foreign keys, additional indexes, row-level-security state, and all current data; do not modify RLS policies or add duplicate/redundant foreign keys.
- Add disposable PostgreSQL regression coverage for F1 expiry, financial invariants, duplicate invocation, and migration reapplication.
- Document Preview-only apply gates. This change does not apply a migration to Preview or Production, activate F1, change Cron, send SMS, or authorize Production work.

## Capabilities

### New Capabilities

- `financial-schema-integrity`: Database-enforced financial evidence, amount/state, balance, immutability, and tenant-isolation invariants.

### Modified Capabilities

- `credit-lot-lifecycle-integrity`: Expiry evidence, ledger direction, lot-balance reconciliation, and immutable expiry are enforced at commit.
- `migration-safety`: Financial schema reconciliation is forward-only, fail-closed on incompatible data, and verified against both clean and drifted disposable databases.

## Impact

- Database: one additive Prisma migration; no Prisma model, enum, column, index, foreign-key, or RLS change is planned.
- Runtime: no service/worker behavior change; F1 starts succeeding only after the reviewed schema migration is separately authorized and applied to Preview.
- Evidence: current read-only Preview inventory and invariant checks, PostgreSQL 17.6 reproduction, migration regression tests, and a Preview-only remediation plan.
- Migration registries: Preview records both Prisma migrations and four Supabase migration-history entries. The Supabase SQL set overlaps the Prisma schema and is not a clean, composable second migration chain; use the Prisma migration path for this correction and do not run `supabase db push` as part of it.
