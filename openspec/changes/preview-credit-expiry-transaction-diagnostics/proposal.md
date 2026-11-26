## Why

The single post-reconciliation Preview F1 invocation failed with `PrismaClientUnknownRequestError`, but current scheduled-job records and runtime logs intentionally retain only the exception class. The actual database failure must be isolated on an exact, data-free Preview-schema fixture before any future F1 request is considered.

## What Changes

- Add failure-only structured diagnostics for credit-expiry transaction stages, including callback-versus-commit phase and elapsed transaction time.
- Extract only allowlisted Prisma/PostgreSQL error metadata and a bounded, sanitized reason; exclude raw messages, SQL, parameters, request bodies, credentials, and customer identifiers.
- Inspect the system-actor creation path, complete `User` constraints, active database role properties/privileges, and connection settings using guarded read-only Preview catalog queries.
- Reproduce the transaction against a disposable PostgreSQL fixture derived from the current Preview schema, including `User` and matching role characteristics, with synthetic data only.
- Restore the missing `derive_credit_lot_expires_at(timestamp)` dependency with a new forward-only Prisma migration containing the unchanged canonical implementation from the already-applied lifecycle migration. Do not edit or reapply either applied migration, change expiry semantics, or apply the new migration to Preview in this task.

## Capabilities

### New Capabilities

- `financial-transaction-diagnostics`: Sanitized stage, database-error, and transaction-phase diagnostics for credit-expiry failures.

### Modified Capabilities

- `credit-lot-lifecycle-integrity`: ensure the enabled lifecycle triggers retain their canonical expiry-derivation function dependency.

## Impact

- Runtime code: `src/modules/credit-expiry/credit-expiry.service.ts` and focused unit/integration tests.
- Database source: one new idempotent forward-only Prisma migration restoring the canonical helper; no Preview migration application, DML, permission change, or live F1 invocation.
- Local verification: disposable PostgreSQL 17.6 restored from schema-only Preview DDL and populated only with synthetic fixture records.
- Release: one minimal diagnostic commit on the existing release branch with relevant CI verification. No Preview deployment, Cron change, SMS replay, Production access, merge, or hosting change is included.
