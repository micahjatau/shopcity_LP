# ADR 010: Supabase Cron owns scheduled background processing

- **Status:** Proposed; Preview validation and Production approval pending
- **Date:** 2026-11-15

## Context

The Nest API currently has a long-lived worker that starts BullMQ/Redis outbox execution and several in-process sweeps for approvals, credit expiry/reminders, report materialization, and pilot operations history. A separate Vercel Cron route also exists for report materialization. These multiple scheduler owners complicate a workerless/serverless deployment. Redis is independently required for authentication throttling and remains in the architecture.

## Decision

After staged, per-flow cutover, Supabase `pg_cron` will be the sole scheduler for background flows F0–F10, including report materialization. Cron will dispatch protected, environment-scoped POST requests through `pg_net` to the Nest API. Nest remains the owner of business rules, transactional financial writes, audit records, transactional outbox, SMS safety, report materialization, retries, and domain idempotency. PostgreSQL row locks and durable cursor leases provide bounded claims/progress; `pg_net` transport status is not completion evidence.

The existing worker, Redis, and Vercel Cron remain unchanged until a separate approved cutover. No two owners may run the same flow concurrently. The API must not require Redis for scheduled job claims, but Redis-backed auth throttling must remain available and unchanged.

## Consequences

- Each flow needs one documented schedule, environment, owner, batch cap, alert, and rollback procedure.
- Additive scheduler-run and cursor tables are needed for idempotency/completion evidence and fair report/history processing; both tables enable RLS and have no user-facing policies.
- HTTP dispatch may be retried or time out after a handler commits; run evidence and domain idempotency are mandatory.
- Existing SMS provider adapters may not make ambiguous submission timeouts at-most-once; this blocks SMS cutover until provider reconciliation/idempotency is proven.
- Report materialization is limited to one tenant per scheduled request until Preview measurements establish a safe runtime budget. The linked Vercel team is currently Hobby; verify commercial eligibility and Fluid Compute/runtime limits before deploying the API.
- The current repository change is implementation/test/documentation only. It does not configure remote Supabase Cron/Vault, modify Production, activate live SMS, replay historical SMS, remove Vercel schedules, or retire the legacy worker.

## Rollout gate

Preview validation must establish migration/restore safety, endpoint environment isolation, all-flow idempotency/recovery, SMS non-sending behavior, report cursor fairness/freshness, runtime limits, schedule inventory, and rollback. Production cutover requires separate explicit approval and complete evidence. See `docs/architecture/supabase-cron-workerless-processing.md` and `docs/runbooks/supabase-cron-workerless-processing.md`.
