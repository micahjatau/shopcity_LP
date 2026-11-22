# Runbook: Supabase Cron workerless processing

## Status and hard stop

This runbook applies to Preview validation only. No Production migration, secret, Cron schedule, worker retirement, Vercel schedule removal, live SMS activation, or historical SMS replay is authorized by the current change. The Preview validation report is `docs/release-evidence/workerless-preview-validation-report.md`. Do not proceed while it is marked BLOCKED.

## Before Preview

- Restore Supabase access and independently confirm the Preview project reference and deployment environment. Local link metadata alone is not proof. The linked Vercel team is currently Hobby; do not deploy until the owner confirms Hobby eligibility for this project or upgrades the plan. Vercel Terms restrict Hobby to personal/non-commercial use. Verify whether Fluid Compute is enabled: current documented Function duration limits are 60 seconds without it and 300 seconds with it; the F7 transaction can run for 30 seconds. Vercel Cron is distinct from Supabase Cron and Hobby Vercel Cron runs at most daily.
- Confirm the migration is additive and reviewed; take a Preview database backup/restore point before applying it.
- Confirm all F0–F10 handlers have isolated and Testcontainers coverage, the API can run without Redis for job claims, and Redis remains configured for authentication throttling.
- Verify the legacy owner for each flow and exact schedule cadence. Do not enable a Cron flow while the matching worker/Vercel/third-party owner remains active.
- Configure a unique Preview-only `SCHEDULER_SECRET` (32+ characters) and `SCHEDULER_ENVIRONMENT=preview` in the Preview API. Store the secret in Supabase Vault. Do not log, paste, or commit the secret.
- Set Preview `SMS_PROVIDER_MODE=disabled` before any scheduled invocation. It records terminal no-send outcomes without calling a provider; use only synthetic SMS intents when testing that path.
- Keep `SCHEDULED_SMS_NOT_BEFORE` unset while validating non-SMS flows; F3/F10 fail closed without it. When separately approved for Preview, set it to the activation timestamp so older outbox intents cannot be selected.
- Prove that the Preview request path cannot submit an SMS while `SMS_PROVIDER_MODE=disabled` before enabling any schedule that can process `sms.send`.
- Verify `pg_cron`, `pg_net`, Vault permissions, network reachability, request/response retention, and function execution limits on the actual Preview project.

## Validating one flow

1. Create the Preview schedule only after recording flow ID, cron expression/timezone, endpoint, owner, secret reference, and rollback action.
2. Confirm the API returns 401 for missing/invalid bearer credentials and wrong environment without creating a run record.
3. Invoke the flow with a fresh idempotency key; verify the response and `ScheduledJobRun` result/counters.
4. Repeat the same invocation key. A completed run must be returned without repeating domain work; an active run returns conflict; a recorded failure returns an error response.
5. Trigger a concurrent invocation and verify database row locks/cursor leases prevent duplicate claims. Inspect domain records for expected idempotency.
6. Check logs and evidence for secret/phone/body redaction. Treat `pg_net` status as dispatch evidence only; confirm Nest completion and resulting domain state.
7. For F7/F8, verify the persisted cursor progresses, wraps only at end, does not advance on materialization failure, and does not starve tenants. Measure per-tenant rebuild duration against the API runtime limit.
8. For F3/F6/F10, verify no send occurred in the non-sending environment; F6 must be read-only, and ambiguous SMS provider outcomes must remain dead-lettered for reconciliation rather than auto-replayed.

## Monitoring

Review each flow's most recent `ScheduledJobRun`, failed run count, age since success, result counters, and safe failure category. Also inspect:

- Oldest eligible outbox age and retry/dead-letter counts.
- SMS `QUEUED`, `SENT`, `FAILED`, `DELIVERED`, and next poll age; never replay an ambiguous provider submission without reconciliation.
- Report cursor/watermark progression, per-tenant materialization state, and report freshness.
- Pilot snapshot capture counts/failures and bounded retention prune count.
- Supabase Cron invocation and `pg_net` transport status separately from API completion records.

Alert thresholds and cadence are intentionally unset until the operations owner approves them from Preview measurements.

## Rollback

1. Disable only the Preview schedule being tested and confirm there are no active invocations.
2. Preserve `ScheduledJobRun`, cursor, outbox, SMS, audit, and financial records for diagnosis.
3. Keep the additive schema in place; do not drop scheduler evidence or outbox records as a rollback shortcut.
4. Restore the legacy owner only after proving the Preview Cron owner is disabled; maintain exactly one owner per flow.
5. Do not replay historical SMS. Resolve ambiguous provider results through provider history/reconciliation.

## Production cutover

Stop. Production cutover requires a separate explicit approval, a complete Preview evidence package, owner-reviewed schedule inventory, backup/restore proof, legacy-worker drain plan, secret rotation, Vercel plan/runtime confirmation, monitoring thresholds, and SMS provider idempotency/reconciliation evidence. No Production changes are part of this runbook's current execution.
