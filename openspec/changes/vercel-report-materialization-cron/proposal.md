## Why

ShopCity's report tables are precomputed and the latest production materialization is stale (October 21, 2026). The API is deployed on Vercel, but neither ShopCity Vercel project has a Cron job, so the existing long-running worker's report sweep is not being invoked in production.

## What Changes

- Add a secret-protected, narrowly scoped API endpoint that runs the existing bounded report-materialization sweep.
- Keep the daily Vercel Cron as a fallback and add cron-job.org scheduling every five minutes to refresh reports throughout the day.
- Fail closed if the cron secret is absent or invalid; return a failure status if materialization fails so Vercel records the failed invocation.
- Keep other persistent worker responsibilities (outbox, SMS, queue consumers, expiry loops) out of the Vercel function.

## Capabilities

### New Capabilities

- `report-materialization-scheduling`: securely invoke periodic report materialization on the Vercel-hosted API and expose truthful run outcomes.

### Modified Capabilities

## Impact

- `src/modules/reports/` cron controller/module registration.
- `src/jobs/report-materialization.worker.ts` sweep API if needed for bounded invocation.
- `vercel.json` production cron schedule.
- Vercel API production environment: a generated `CRON_SECRET` shared only with the authorized cron-job.org job.
- cron-job.org schedule configuration; its API key is not stored in application config.
- Vercel production deployment and Supabase read-model tables; no financial source rows or schema migrations are changed.
