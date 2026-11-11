## Context

`ReportMaterializerService` and `runReportMaterializationSweep` already implement the authoritative derived-read-model refresh. The API is served by a Vercel Node function (`api/index.ts`), but Vercel Cron is not configured on either ShopCity project. The persistent worker entrypoint also owns unrelated Redis/outbox and expiry loops and must not be started as a serverless request handler.

Production inspection found 3 tenants and report materialization states/latest report rows last completed on 2026-10-21. The ShopCity API Vercel project currently has no Cron jobs. Vercel's scheduled functions can invoke an HTTP route, so a narrow cron endpoint can run the existing bounded report sweep without pretending to host a continuously running worker.

## Goals / Non-Goals

**Goals:**

- Run the existing materialization sweep every five minutes through cron-job.org; retain the daily Vercel Cron as a fallback and support immediate invocation.
- Authenticate the trigger with Vercel's `CRON_SECRET` bearer header; missing secret fails closed.
- Return non-2xx on sweep failures and avoid returning tenant IDs or financial details.
- Keep Vercel cron work scoped to report materialization only.

**Non-Goals:**

- Move the outbox/SMS, BullMQ, expiry, or other persistent worker loops into serverless functions.
- Change report calculations, financial records, API read authorization, or database schema.
- Repair or rotate database credentials without diagnosing the production connection string.

## Decisions

1. Add a versioned internal API route under `/api/v1/cron/report-materialization`. Mark only this route public to session/CSRF guards, then require an exact `Authorization: Bearer <CRON_SECRET>` match inside the route. Use constant-time comparison after equal-length validation; do not log the header or secret.
2. The endpoint will invoke the existing `runReportMaterializationSweep` with the injected Prisma service and report materializer. The result body will contain only safe aggregate run metadata (tenant count and elapsed time), not IDs, report values, or exception details.
3. Keep the Vercel `0 0 * * *` Cron schedule as a fallback. It sends the configured production `CRON_SECRET` as a Bearer authorization header.
4. Configure cron-job.org to call the endpoint every five minutes, offset by two minutes from the hour, with `Authorization: Bearer <CRON_SECRET>`. Disable response-body saving. The cron-job.org API key is used only to create/verify the schedule and is not stored in Vercel or the repository.
5. Rotate `CRON_SECRET` in Vercel when configuring the external job, redeploy production, and configure the same new secret as the external job's target Authorization header.
6. Verify an actual cron-job.org execution returns HTTP 200, then query Supabase materialization state/report dates and inspect function logs.
7. Do not start the complete `src/worker.ts` process inside a Vercel function. Vercel function invocations are bounded and do not provide persistent worker semantics.

## Risks / Trade-offs

- Both Vercel Cron and cron-job.org can deliver repeated or delayed requests; the database advisory lock and idempotent derived-row upserts in the existing materializer make repeats safe. The daily Vercel schedule is only a fallback; the external five-minute schedule is the primary refresh cadence.
- Cron request execution uses the API's production database configuration. If `DATABASE_URL` is invalid or connectivity fails, Vercel will record a failed invocation; the cron must not hide that error.
- The current production tenant count (3) is within the existing sweep batch size (10). If tenant count exceeds the configured batch size, the cron sweep must be updated to page through tenants safely rather than repeatedly process only the first page.
- Function duration is bounded. Keep this endpoint limited to report materialization and fail visibly if work exceeds the configured maximum duration.
- The linked Vercel account is on Hobby, which permits daily Cron schedules only. cron-job.org supplies the five-minute cadence; the Vercel daily Cron remains as a fallback.
- cron-job.org holds the endpoint bearer secret and can invoke only the report-materialization trigger. Protect the cron-job.org account/API key and rotate the shared endpoint secret if that account is compromised.

## Rollout / Verification

1. Add the secret-protected endpoint and focused tests.
2. Configure the production-only sensitive `CRON_SECRET` without exposing its value and deploy to `shopcity-api` production.
3. Configure cron-job.org at five-minute intervals with the matching bearer header; retain Vercel's daily Cron as backup.
4. Verify the external job is enabled and an actual execution returns HTTP 200.
5. Verify materialization state and daily summary `materializedAt` advance to current time/date.
6. Recheck the supervisor overview and confirm it receives a row for the branch's current business date.

## Rollback

Remove the cron schedule and redeploy to stop scheduled invocations. The endpoint can remain inert with its secret unset (it fails closed). Existing report tables remain readable; no source financial data or schema is rolled back.
