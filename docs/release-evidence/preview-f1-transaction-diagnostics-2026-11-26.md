# Preview F1 Transaction Diagnosis — 2026-11-26

## Status

**Root cause identified; repair prepared, not applied. Preview processing remains NO-GO.** No second Preview F1 request, Preview migration, deployment, Cron change, SMS send/replay, PR merge, or Production operation occurred during this diagnosis.

## Root cause

The failed run was `8333e294-92f4-4fed-8b39-770673bf5ee0`, on the Preview API request previously recorded as HTTP 500. Read-only catalog inspection on Supabase project `nmuedccamqacgszvosvm` found:

- `public.derive_credit_lot_expires_at(timestamp without time zone)` is absent; no function with that name exists in any schema, and `to_regprocedure` resolves to `NULL` under the active Preview search path.
- Both `CreditLot` lifecycle triggers, `validate_credit_lot_lifecycle_insert` and `validate_credit_lot_lifecycle_update`, are enabled. They invoke `validate_credit_lot_lifecycle()`, whose body calls the missing helper.
- Preview migration history records `20260725_sprint_2_financial_integrity_lifecycle_closure` as finished and not rolled back, although that migration defines the helper. The already-applied `20261126120000_preview_financial_schema_reconciliation` is also finished and not rolled back; its replacement lifecycle function retains the helper call. Neither applied migration was edited or reapplied.

Consequently, updating a due lot invokes the lifecycle trigger and raises PostgreSQL SQLSTATE `42883` (`undefined_function`) for `derive_credit_lot_expires_at`. In the service transaction, this occurs at `creditLot.updateMany`, after tentative actor, expiry-ledger, and expiry-evidence writes; PostgreSQL rolls the whole transaction back.

## Preview evidence captured read-only

- A guarded, schema-only dump of Preview `public` contained 45 tables, 24 functions, 25 triggers (including constraint triggers), and 138 constraints; it contained no table rows, `COPY`, or `INSERT` statements. File used only in `/tmp`: `/tmp/shopcity-preview-public-schema-2026-11-26.sql`. SHA-256: `56597943da4030227e5bb0d8c824f5169842acb8f7c6cc7e77afe7738b91be12`.
- PostgreSQL version: 17.6. Direct Preview session was SSL through Supavisor, database role `postgres`, `rolsuper=false`, `rolbypassrls=true`; the relevant public tables are owned by `postgres` and that role has the required table/function privileges. Effective `search_path` was `"$user", public, extensions`; transaction isolation `read committed`; statement timeout `2min`; lock and idle-in-transaction timeouts `0`.
- `User` has role `SYSTEM`, the expected tenant and composite tenant/branch foreign keys and unique indexes, and no table triggers. No user rows were read.
- Vercel branch environment pull confirmed Preview mode and `SMS_PROVIDER_MODE=disabled`. Its `DATABASE_URL` resolved only to an opaque, non-URL 11-character value; therefore the deployed function’s exact DSN, role, and pool mode are not asserted to match the direct Preview session.
- Cron inventory remained job 2 `shopcity-preview-credit-expiry` inactive (`0 23 * * *`, GMT), jobs 1 and 3–7 active, zero running Cron/app jobs. SMS remained disabled with 28 pending events, no provider IDs, and no sent/delivery timestamps.

## Disposable PostgreSQL 17.6 reproduction

A separate, ephemeral PostgreSQL 17.6 database was restored from the schema-only dump. No Preview rows or credentials were copied. Its local non-superuser role was configured with the observed role attributes/grants and effective `search_path`, isolation, and timeout settings. Synthetic tenant/customer/receipt/earn-ledger/lot data only was used.

Because the synthetic due lot represents an existing Preview row, its insert lifecycle trigger was disabled only while creating that one local fixture lot, then re-enabled before invoking the service. The update trigger remained enabled. Under the matching local role, the instrumented service reproduced:

```text
stage=lot_balance_decrement
phase=callback
errorClass=PrismaClientUnknownRequestError
sqlState=42883
routine=derive_credit_lot_expires_at
reason=undefined_function
```

The failure completed in 88 ms. Rollback checks confirmed the due lot remained at 10,000 kobo and zero expiry evidence, expiry debit, system actor, or audit row persisted. This matches the unchanged Preview post-failure state and is consistent with the previously observed ~188 ms request duration.

## Minimal correction tested locally

Added `prisma/migrations/20261126130000_restore_credit_lot_expiry_derivation_helper/migration.sql`. It uses `CREATE OR REPLACE FUNCTION` and copies the existing canonical helper body from `20260725_sprint_2_financial_integrity_lifecycle_closure` unchanged. It restores the twelve-month month-clamp formula; it does not edit or reapply migration history or change financial posting logic.

Applied only to the disposable schema clone, the function restored as immutable. The expiry transaction then succeeded once for the synthetic 10,000-kobo lot, producing one expiry debit, one expiry record, one system actor, and one audit record; the lot remainder became zero. A repeat sweep examined/expired zero lots and emitted no failure diagnostic. The helper returned `2025-02-28 08:09:10.789` for the synthetic leap-day input, preserving month-clamp behavior.

The first post-repair harness reached its assertions but encountered a `BigInt` JSON serialization error while formatting its final report; a separate read-only post-check passed for resulting state, repeat idempotency, and leap-day behavior. The repository PostgreSQL 17.6 integration test also passed, including removal of the helper to simulate drift, failure-stage/rollback verification, applying the new migration twice, and successful F1 processing afterward.

## Code and release boundaries

- Added failure-only per-attempt transaction-stage, callback/commit phase, monotonic duration, and allowlisted Prisma/PostgreSQL error metadata diagnostics. The original exception is rethrown unchanged; success and retry semantics are preserved.
- Focused unit tests cover every callback stage, commit failure, SQLSTATE/routine extraction, sensitive-value exclusion, logger failure, no success logs, and unchanged retry behavior.
- GitNexus reports `CreditExpiryService.expireDueCredit` as MEDIUM risk (14 impacted symbols, six direct callers, two affected processes). It cannot index SQL functions: the helper impact result is **UNKNOWN/Target not found**, not zero. The SQL dependencies were manually traced in Preview catalogs and migration source.
- The forward-only migration is prepared for review/CI only. It is **not applied to Preview or Production**. Do not retry F1 or activate Cron job 2 until the migration is separately authorized, applied, and verified; Preview remains NO-GO.

## Local verification (2026-11-26)

- `npx jest src/modules/credit-expiry/credit-expiry.service.spec.ts --runInBand` — passed.
- `npx jest test/financial-schema-reconciliation.int-spec.ts --runInBand --config test/jest-int.json` — passed against disposable PostgreSQL 17.6.
- `npm run verify:fast` — passed, including repository formatting check, lint, typecheck, Nest build, and production entrypoint checks.
- `npm run prisma:validate` and `npm run openspec:validate` — passed.
- `semgrep scan --config p/security-audit --error` over the credit-expiry service/spec, reconciliation integration spec, and forward-only helper migration — 22 rules, zero findings.
- GitNexus symbol impact for `CreditExpiryService.expireDueCredit` is MEDIUM (14 symbols, two processes); the staged CLI `detect-changes --scope staged` check reported HIGH (12 files, 18 symbols, six affected flows). Manual review confirmed the code delta is failure-only instrumentation around existing operations, with no financial-write or retry changes. Some Markdown tracker symbols (including a login-throttle heading) are indexing noise. The SQL helper remains UNKNOWN/unindexed, not zero. This is CLI evidence, not an MCP pass.
- `git diff --cached --check` passed. Commit `1237f9ab3bc19d497f772c34aac5e78a48670c2e` was pushed to the existing draft PR #54 branch; the PR remains open and unmerged.
- For that exact SHA, CI push run `45778451145` and PR run `45778458357` passed, including Static Checks, Frontend Checks, Integration Tests, Docker Build Verification, End-to-End Tests, and GitNexus. Security run `45778458375` passed Gitleaks, CodeQL, and Trivy. ZAP Baseline and Supabase Preview deployment checks were skipped. No Preview deployment or migration occurred.
- No F1 request, Cron change, SMS action/replay, PR merge, or Production operation occurred during verification.
