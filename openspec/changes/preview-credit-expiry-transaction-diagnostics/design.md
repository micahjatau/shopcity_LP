## Context

See `proposal.md` for the failure and scope. `CreditExpiryService.expireDueCredit` wraps due-lot locking, system-actor resolution, ledger/evidence writes, lot decrement, and audit recording in a serializable Prisma transaction, then delegates retry behavior to the existing bounded retry helper. Deferred database constraints may fail after the transaction callback has returned. Current scheduled-job persistence intentionally stores only the exception class. The already-applied Preview reconciliation migration is immutable for this task and must not be changed or reapplied.

## Goals / Non-Goals

**Goals:**

- Attribute each failed transaction attempt to its last known domain stage and callback/commit phase.
- Emit allowlisted, sanitized error metadata and transaction duration without changing transaction behavior.
- Compare the full current Preview public schema and effective database role context with the disposable fixture used to reproduce the failure.
- Reproduce the missing expiry-derivation helper failure with synthetic data, prove rollback, and verify a forward-only restoration migration in the fixture.

**Non-Goals:**

- Another Preview F1 request, direct Preview financial transaction, or Cron state change.
- Applying the new migration to Preview, changing permissions/grants, an SMS action, Production access, hosting change, or release deployment.
- Changing expiry posting rules, retry counts, batch size, idempotency, or result contract without a reproduced code defect.

## Decisions

1. **Track stage locally within each transaction attempt.** Set a bounded stage label immediately before each existing database operation. Capture a monotonic start time and mark the callback as returned immediately before it returns. An exception before callback return is classified as `callback`; an exception after callback return is classified as `commit`. Record one diagnostic for the failed attempt, then rethrow the original error unchanged so the existing bounded retry helper retains control.

2. **Use an allowlist, not generic error serialization.** Extract only the exception class, recognized Prisma code, five-character PostgreSQL SQLSTATE, identifier-shaped constraint/trigger/table names, and a short sanitized reason. Never serialize `error`, `error.message`, stack, arbitrary `meta`, SQL, parameters, request context, or record identifiers. Prefer safe structured fields exposed by Prisma; derive a reason from a known-safe bounded phrase only when its format is recognized, otherwise log a generic reason. Add tests with UUIDs, emails, phone-like values, SQL fragments, credentials, and bound values to prove exclusion.

3. **Keep instrumentation outside transaction semantics.** Stage tracking and error reporting are observability-only. Do not catch and replace the error passed to the retry wrapper, add database writes to the failure path, or alter serializable options, constraints, or retry delays. Test both callback and simulated commit failures.

4. **Build the reproduction from a schema-only Preview capture.** Use a guarded read-only connection and schema-only PostgreSQL dump for the complete relevant `public` schema, not only the ten reconciled financial tables. Separately capture non-secret role attributes, schema/table/function privileges, `search_path`, isolation, timeout and pool/session settings. Do not export rows, passwords, connection strings, environment secrets, or application payloads. Restore the schema into an ephemeral PostgreSQL 17.6 instance, create a synthetic tenant/customer/lot/system actor, and exercise the existing transaction path under a local role matching the Preview role attributes and grants.

5. **Evaluate deferred constraints only in the disposable fixture.** If the application-path reproduction does not expose the commit failure, a local diagnostic transaction may execute `SET CONSTRAINTS ALL IMMEDIATE` after the synthetic writes and then explicitly roll back. No rollback-only diagnostic transaction is run against Preview.

6. **Restore only the proven missing dependency.** Preview catalog inspection shows that `derive_credit_lot_expires_at(timestamp without time zone)` is absent from every schema although the canonical defining migration is recorded as applied; enabled insert/update lifecycle triggers call it. The exact-schema fixture reproduces SQLSTATE `42883`. Add a new forward-only Prisma migration containing the unchanged helper body from `20260725_sprint_2_financial_integrity_lifecycle_closure`; do not edit/reapply applied migrations, alter expiry rules, change roles, or apply the repair to Preview in this task.

## Risks / Trade-offs

- **[Risk] Error objects can carry SQL literals or personal data in nested metadata.** → Use allowlisted extraction and adversarial redaction tests; never log the raw object or message.
- **[Risk] A schema-only dump can omit global role state or runtime pooler configuration.** → Capture role flags, grants and connection settings separately; record any unobservable Vercel runtime values as unknown rather than assuming they match.
- **[Risk] A forward migration could drift from the canonical helper formula.** → Copy the exact implementation from the existing applied migration and add disposable PostgreSQL tests for month-end/leap-year behavior and the F1 transaction.
- **[Risk] Restoring all public objects can require Supabase-owned schemas/extensions.** → Restore only into a disposable local PostgreSQL instance, add clearly isolated stubs only where required, and report any remaining difference; do not use Preview as a test fixture.
- **[Risk] Deferred constraints can obscure the failing callback stage.** → Record callback-return state and explicitly force deferred checks in the local rollback-only fixture when needed.
- **[Risk] Diagnostic code may affect retry flow if it throws.** → Make log construction fail-safe, swallow only logger/serialization failures, and rethrow the original transaction error unchanged.

## Migration Plan

1. Complete the guarded Preview catalog/role inspection and capture schema-only DDL without data or secrets.
2. Add stage instrumentation and unit tests for callback failures, commit failures, SQLSTATE/constraint extraction, redaction, and logger failure.
3. Restore the captured schema in a disposable PostgreSQL 17.6 fixture and reproduce the service transaction with synthetic records and a matching local database role.
4. Verify the instrumented service fails at the lot-decrement stage on the missing-helper fixture and rolls back all writes; then apply the new forward migration only to a disposable clone and verify the same synthetic transaction succeeds.
5. Run focused Jest and database tests for diagnostics, rollback, and canonical date semantics; then run lint, typecheck/build, Semgrep, OpenSpec validation, GitNexus change-scope analysis, and relevant GitHub CI/security workflows.
6. Commit and push the diagnostic plus forward-migration preparation for CI only. Do not apply the migration to Preview, deploy, or invoke F1; leave Cron job 2 inactive and preserve the other six schedules, SMS-disabled state, queued historical events, and Production boundary.
