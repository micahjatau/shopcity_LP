# Preview F1 helper-repair recertification closeout — 2026-11-26

## Final status

**SCHEDULER CERTIFICATION: PREVIEW GO for the repaired workerless F1 credit-expiry flow.** The reviewed release is deployed through the original API branch; the sole authorized post-repair F1 request completed once; expiry ledger/evidence/audit and global balance reconciliation passed; exact-SHA Integration Tests passed; and Cron job 2 was restored at its existing `0 23 * * *` schedule. This is not a Production or full-pilot GO.

**CASHIER/POS APPLICATION ACCEPTANCE: OPEN — NOT PERFORMED.** The readiness check verified POS HMAC-key health without reading the key, but no signed cashier session, cashier transaction, or POS acceptance test was attempted. A bounded, non-mutating device-bound login/read-only card-lookup plan is recorded separately; it does not change customer balances and remains unexecuted.

## Release and runtime

- Original branch `release/preview-workerless-2026-11-24` was normally fast-forwarded from `944976546e67c71366091929859541c03950550b` to reviewed PR #54 head `a6b1a3ff1ffb5bd1162274e40991a06bf6bba879`. PR #54 remains open and unmerged; no merge occurred in this closeout. No force-push occurred.
- `shopcity-api` deployed the reviewed commit successfully. Its existing branch alias resolved to the new deployment; no manual alias retarget occurred. The four authorized non-target projects (`shopcity-lp`, `shopcity-staging-fix`, `web`, `shopcity-bb1951f`) were canceled by their persistent exact-branch Ignored Build Steps. Those exclusions remain in place; `master`/Production and other branches continue normally. See `vercel-preview-branch-isolation-2026-11-26.md`.
- `GET /health/ready` returned HTTP 200 with Postgres and Redis healthy. The ready check also executes `PosDeviceTokenKeyHealthIndicator`; its passing result verifies configured POS HMAC-key health without reading the key. No signed cashier transaction was attempted. An unauthenticated scheduler request returned 401 before F1; the successful authenticated F1 request below verifies scheduler authentication and the Preview environment binding.
- Only the original branch's `DATABASE_URL` was updated using the protected rotated candidate. The other 13 branch variables, including the existing POS HMAC key, scheduler secret, SMS mode/cutoff, and F7 budget, were not retrieved or changed. No secrets were emitted.

## Separate cashier/POS application acceptance

The scheduler GO above certifies the repaired F1 path and preserved schedule inventory only; it does not certify cashier/POS application behavior. No signed cashier transaction was attempted, and no cashier earn/redemption or other POS financial operation was performed as part of this closeout. See [`preview-cashier-pos-nonmutating-acceptance-plan-2026-11-26.md`](preview-cashier-pos-nonmutating-acceptance-plan-2026-11-26.md) for a bounded test of an already-authorized device-bound cashier login and read-only synthetic-card lookup. It is prepared, not executed. The plan makes no transaction request and requires no customer-balance change. Any future earn/redemption acceptance requires separate explicit authorization and a dedicated synthetic fixture.

## Single authorized F1 invocation

Cron job 2 was confirmed inactive at `0 23 * * *` before the call. Its stored SQL template was inspected without reading Vault values. Because that template derives a daily idempotency key and three historical F1 runs were already `FAILED`, the one-off request used a fresh unique key while retaining the template's Vault-backed URL/secret checks, Preview environment header, endpoint, and 60-second timeout.

- Invocation key: `preview:f1:repair:20261126:1e79ed78-583c-48fc-b296-368f8e9e9889`
- `pg_net` request ID: `3443`; HTTP response: `201`, not timed out.
- Application response: `success=true`, flow `F1`, status `COMPLETED`.
- `ScheduledJobRun`: `COMPLETED`, `failureCategory=null`, counters `{ examined: 1, expiredLots: 1, expiredAmountKobo: "10000" }`.
- This was the only post-repair F1 request. No retry was made. A first read-only raw follow-up query had an unquoted camel-case column issue; a corrected Prisma model read and `pg_net` response read confirmed completion. That inspection error did not affect the request.

## Financial, audit, SMS, and regression evidence

- Exactly one `CreditExpiry` row exists for 10,000 kobo; exactly one confirmed `EXPIRY` debit exists for 10,000 kobo; exactly one `credit.expire` audit row links to that lot and ledger entry with the matching actor. The expired lot's remaining balance is zero, and no due positive-balance lots remain.
- Global reconciliation passed: confirmed ledger credits `41,656,947` kobo, debits `35,315,517` kobo, net `6,341,430` kobo; all 608 credit lots total `6,341,430` kobo remaining. The net and remaining-lot totals match. The 10,000-kobo debit is the expected sole change from the pre-F1 baseline.
- All 28 pending historical `sms.send` events remain pending. None has a provider message ID, sent timestamp, or delivery timestamp. No new SMS provider submission or replay occurred; historical sent-message rows and all pending events were left unchanged. SMS-disabled configuration was preserved.
- GitHub `Integration Tests` passed for exact reviewed SHA `a6b1a3ff1ffb5bd1162274e40991a06bf6bba879` (run `45852975871`). That workflow runs the repository's full Testcontainers integration suite, including the credit-expiry invariants/race and earn/redemption regressions. A separate local two-spec Testcontainers rerun exceeded this shell's 20-minute command limit without a test summary; it touched only disposable containers, not Preview. The passing exact-SHA CI result is the regression evidence; the local timeout is not represented as a test pass.

## Restored Preview schedule and final checks

- Only Cron job 2 was reactivated via `cron.alter_job(job_id := 2, active := true)` after the F1, financial, SMS, and regression gates passed. Its certified schedule remains `0 23 * * *`; database timezone is UTC and `cron.timezone` is GMT.
- The first guarded activation statement returned Prisma `P2010` and left job 2 inactive. The guard had over-broadly checked every historical `SmsMessage`, rather than the 28 protected pending events. A read-only check confirmed job 2 was still inactive; the guard was narrowed to the pending-event preservation requirement, and the succeeding guarded statement activated job 2. No F1 request was repeated and no SMS state was changed.
- Final read-only inventory (queried in a `transaction_read_only=on` transaction; only metadata columns were selected, not job command bodies or Vault values):

  |  ID | Job                                       | Flow/ownership            | Schedule (Cron timezone GMT) | State                                   |
  | --: | ----------------------------------------- | ------------------------- | ---------------------------- | --------------------------------------- |
  |   1 | `shopcity-preview-approval-expiry`        | F0 approval expiry        | `* * * * *`                  | Active, unchanged                       |
  |   2 | `shopcity-preview-credit-expiry`          | F1 credit expiry          | `0 23 * * *`                 | Active, restored after gates            |
  |   3 | `shopcity-preview-expiry-reminders`       | F2 expiry reminders       | `0 7 * * *`                  | Active, unchanged                       |
  |   4 | `shopcity-preview-report-materialization` | F7 report materialization | `*/5 * * * *`                | Active, unchanged                       |
  |   5 | `shopcity-preview-operations-snapshot`    | F8 operations snapshot    | `0 * * * *`                  | Active, unchanged                       |
  |   6 | `shopcity-preview-history-retention`      | F9 history retention      | `17 * * * *`                 | Active, unchanged                       |
  |   7 | `shopcity-preview-outbox-dispatch`        | F10 composite outbox      | `* * * * *`                  | Active, unchanged; sole composite owner |

  The database session timezone is UTC and `cron.timezone` is GMT. F6 is absent; F3/F4/F5 have no independent schedules. The latest F1 history still shows the one new `COMPLETED` post-repair run and three historical `FAILED` rows; none was deleted or retried.

- No migration was applied to Preview during deployment or closeout; both previously applied Preview migrations remain unchanged. The incomplete local Testcontainers rerun applied migrations only to disposable containers. No `supabase db push`, Preview migration reapplication, legacy worker startup, Production operation, plan change, or unrelated active Vercel deployment occurred. The four authorized non-target build attempts were canceled by their Ignored Build Steps.

## Limitations, security backlog, and waived evidence

- Operations waived Preview backup, restore-rehearsal, and PITR gates for this remediation. None was run; no backup/restore/PITR evidence is claimed.
- Supabase Management API auth-log and network-restriction checks remain unavailable because the stored CLI token returned HTTP 401 / `Invalid access token`. No hosted auth-log or allowlist evidence is claimed. The successful authenticated pg_net-to-API request does demonstrate the runtime request path and Vault-backed scheduler credential worked.
- GitHub Static Checks, Frontend Checks, Integration Tests, Docker Build Verification, End-to-End Tests, and GitNexus passed for reviewed SHA `a6b1a3ff1ffb5bd1162274e40991a06bf6bba879` (Integration Tests run `45852975871`).
- The same reviewed SHA's GitHub security checks passed CodeQL, Gitleaks, and Trivy. ZAP Baseline was skipped under its approved-staging-only condition, and the Supabase Preview check was skipped; neither is claimed as passed here. No new Semgrep scan was run for this documentation-only closeout; the focused scan and the still-open full-cleanup item are distinguished in the residual-risk tracker.
- The separate repository residual-risk tracker, [`review-68-residual-risks.md`](review-68-residual-risks.md), remains open: production logging review and full Semgrep cleanup are pending; the Semgrep workflow findings require action-owner review and have not been suppressed. The scanner production-load exercise remains environment-gated. The tracker also retains real-tenant collision, fresh/upgrade/restore migration, and provider-invoice reconciliation items. Scheduler certification does not close these broader release/security items.
- The closeout evidence and completed OpenSpec update are being published on PR #54's existing branch for final review; the PR remains open and unmerged. No additional deployment, Production operation, Cron change, secret change, SMS replay, or worker startup is part of this documentation follow-up. The unrelated dirty changes in `/root/github-repos/micahjatau/shopcity_LP` were preserved.
