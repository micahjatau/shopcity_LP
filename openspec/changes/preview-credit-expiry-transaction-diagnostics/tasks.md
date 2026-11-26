## 1. Inspect the Preview transaction context

- [x] 1.1 Trace system-actor creation and inspect Prisma `User` fields, constraints, indexes, and triggers; record the path and schema evidence without reading user rows.
- [x] 1.2 Run guarded read-only Preview catalog queries for current role flags/memberships, privileges, search path, transaction isolation, timeouts, and available connection/pool settings; verify job 2 remains inactive, the other six schedules remain active, and SMS safety is unchanged.
- [x] 1.3 Capture current Preview `public` schema-only DDL with a read-only connection, no data/credentials, and a checksum; record unobservable runtime settings as unknown and verify the lifecycle helper referenced by active triggers.

## 2. Add safe transaction diagnostics

- [x] 2.1 Add failure-only per-attempt stage tracking, callback-versus-commit classification, and monotonic transaction duration to credit expiry; verify existing retry/result semantics remain unchanged.
- [x] 2.2 Add allowlisted Prisma/PostgreSQL metadata extraction and bounded reason sanitization; verify unknown error fields are omitted and the original exception is rethrown unchanged.
- [x] 2.3 Add focused tests for each callback stage, commit-time failure, Prisma/SQLSTATE/constraint/routine extraction, malicious/sensitive strings, logger failure, no success logs, and unchanged retry behavior.

## 3. Reproduce on the exact disposable Preview schema

- [x] 3.1 Restore the captured schema into an ephemeral PostgreSQL 17.6 fixture, recreate matching role attributes/grants/settings, and compare `User`/system-actor constraints with Preview; verify no Preview rows or secrets were copied.
- [x] 3.2 Seed synthetic tenant/customer/lot data and execute the instrumented credit-expiry path under the matching local role; verify the failing stage, SQLSTATE, constraint/trigger, sanitized reason, and callback/commit phase where available.
- [x] 3.3 Verify the failed transaction explicitly rolled back all synthetic financial and actor writes; no Preview transaction or row was used.
- [x] 3.4 Apply the canonical helper-restoration migration only to the disposable clone; verify the same instrumented expiry transaction succeeds and preserves financial invariants.
- [x] 3.5 Verify the restored function matches canonical month-end/leap-year behavior, then dispose of the local fixture and synthetic data.

## 4. Verify and release the diagnostic change

- [x] 4.1 Run focused credit-expiry unit/integration tests, lint/typecheck/build, Semgrep, and OpenSpec validation; verify diagnostic output contains no credentials, request bodies, SQL parameters, customer data, or raw stacks. Focused tests, `npm run verify:fast`, Prisma validation, OpenSpec validation, and targeted `p/security-audit` scan passed.
- [x] 4.2 Refresh GitNexus impact/change-scope analysis; record SQL-helper impact as unavailable/unknown, not zero, and manually review the complete diff. Symbol impact for `expireDueCredit` is MEDIUM; staged CLI `detect-changes` reported HIGH (12 files, 18 symbols, six affected flows). Review confirmed failure-only instrumentation and no change to financial writes or retry semantics; Markdown tracker hits are indexing noise. SQL helper impact remains UNKNOWN, not zero.
- [ ] 4.3 Commit and push only the diagnostics, forward-only helper migration, focused tests, and spec evidence; obtain CI/security results. Verify no Preview migration application/deployment or live F1 request occurred and Cron/SMS/Production constraints remain intact.
