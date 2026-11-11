## 1. Secure invocation endpoint

- [x] 1.1 Add a versioned, public-to-session-guards report-materialization trigger that requires `CRON_SECRET` bearer authentication and fails closed when missing/invalid.
- [x] 1.2 Invoke the existing bounded sweep and return only aggregate counts/duration; propagate failures as non-2xx without leaking secrets or tenant details.
- [x] 1.3 Add focused tests for valid/invalid/missing secret, successful bounded sweep, and sweep failure; confirm unauthorized requests never invoke the materializer.

## 2. Vercel schedule and rollout

- [x] 2.1 Add a once-daily production Cron schedule in `vercel.json` for the trigger route.
- [x] 2.2 Verify the endpoint route and Vercel project configuration locally; run focused tests, lint/typecheck/build, and strict OpenSpec validation.
- [x] 2.3 Configure a generated `CRON_SECRET` as a production-only sensitive Vercel environment variable without displaying it.
- [x] 2.4 Deploy the API project to production and confirm the Cron job is registered.
- [x] 2.5 Trigger one immediate Cron invocation and verify Supabase materialization state and latest branch report date/materializedAt advance to current time.
- [x] 2.6 Verify the production report state and latest branch report date advance to the current business date; the overview's snapshot API returns today's row.

## 3. External schedule

- [x] 3.1 Rotate the production `CRON_SECRET` and redeploy the API without exposing the value.
- [x] 3.2 Create the cron-job.org five-minute schedule with the matching bearer header and response saving disabled; do not retain its API key in app configuration.
- [x] 3.3 Verify the external schedule is enabled, its execution returns HTTP 200, and Supabase materialization state advances.
