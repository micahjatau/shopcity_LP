## 1. Specification and impact

- [x] 1.1 Record the hourly snapshot, tenant-scope, 30-day retention, empty-history, RLS, and chart requirements before implementation.
- [x] 1.2 Run and record GitNexus impact for the ReportsService, ReportsController, worker bootstrap, and Operations health-panel change surface.

## 2. Backend history

- [x] 2.1 Add the tenant-scoped `PilotOperationsSnapshot` Prisma model and additive migration with unique tenant/hour, retention index, and RLS.
- [x] 2.2 Refactor pilot metric calculation so the current summary and history collector share the same server-side counts and thresholds without changing the existing response.
- [x] 2.3 Add an hourly, bounded tenant snapshot worker to the existing worker entry point; make repeated same-hour runs idempotent and prune rows older than 30 days.
- [x] 2.4 Add the Admin-only tenant-scoped history endpoint with validated `24h`, `7d`, and `30d` windows; export OpenAPI and regenerate the client.
- [x] 2.5 Add service, worker, controller, tenant-isolation, migration, and API contract tests.
- [x] 2.6 Update `docs/database/migration-tracker.md` with local/CI/shared/restore verification states; do not apply to shared/remote databases.

## 3. Operations Overview chart

- [x] 3.1 Add the Operations-only historical trend chart with one selected metric, `24h`/`7d`/`30d` windows, and one deduplicated history request per active selection.
- [x] 3.2 Preserve gaps for missing samples, provide empty/loading/error states, and expose an accessible data table; do not change ReportsWorkspace or other PilotHealthPanel callers.
- [x] 3.3 Add focused web tests for window selection, metric selection, history gaps, no-history, loading, and errors.

## 4. Verification

- [x] 4.1 Validate/generate Prisma client and verify the full migration chain on a disposable local database, including RLS and constraints; never deploy the migration remotely.
- [ ] 4.2 Run focused backend/web tests, typechecks, targeted lint, formatting, OpenAPI checks, client regeneration, and OpenSpec validation; resolve or document unrelated lint baseline findings.
- [x] 4.3 Run browser checks at desktop and narrow viewport if local preview/resources permit; report any blocked verification.

### Verification note

The focused source ESLint command reports two `no-unsafe-assignment` findings in unchanged `ReportsService` cashier-activity code (around the branch-day window). The targeted web ESLint check passes with the isolated compatibility config. The OpenAPI breaking diff has zero errors; its 14 warnings concern existing optional health-response fields absent from the checked-in base contract, not the added history path.
