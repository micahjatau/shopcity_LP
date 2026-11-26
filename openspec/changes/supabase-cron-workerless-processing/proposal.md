# Supabase Cron as sole background scheduler

## Problem

The application currently runs operational background work from a long-lived Nest worker, with BullMQ/Redis used for outbox execution, separate in-process sweeps for approvals, credit expiry/reminders, report materialization, and pilot-history snapshots, plus independent report Cron configuration. This creates overlapping scheduler ownership and makes serverless deployment of the worker impossible. Redis must remain for authentication throttling; synchronous financial writes, the durable transactional outbox, SMS controls, and audit trails remain application-owned.

## Change

Move scheduler ownership for F0–F10 to Supabase Cron and invoke bounded, authenticated NestJS job handlers. Keep the Nest API as the sole owner of business rules and external-provider calls. Supabase `pg_cron` is the only scheduler after a staged cutover; `pg_net` is only a transport, not evidence that an HTTP job completed. Add durable per-run/request evidence, bounded processing, idempotency, safe retries, and alerts/runbooks. Include report materialization in this schedule and remove competing Vercel/external schedules only after Preview validation and an approved cutover.

Workflow mapping for this change:

| Flow | Scheduled responsibility                                                                        |
| ---- | ----------------------------------------------------------------------------------------------- |
| F0   | Expire pending approvals                                                                        |
| F1   | Expire due credit lots using existing serializable financial service                            |
| F2   | Enqueue eligible credit-expiry reminder intents (never send directly)                           |
| F3   | Process bounded transactional-outbox batches, including SMS intents                             |
| F4   | Evaluate fraud outbox intents through the consolidated fraud service                            |
| F5   | Process report-refresh outbox intents                                                           |
| F6   | Poll provider delivery reports for already-sent SMS                                             |
| F7   | Materialize reports incrementally using a persisted tenant cursor                               |
| F8   | Capture pilot operations snapshots                                                              |
| F9   | Prune only expired pilot-history rows under existing retention policy                           |
| F10  | Recover stale outbox claims and exhausted retries without replaying completed or historical SMS |

## Scope and non-goals

- Supabase Cron is sole scheduler for F0–F10 after cutover; it dispatches protected, environment-scoped requests to the Nest API.
- Keep Redis and all existing auth throttle keys/limits. Do not introduce Redis-backed job execution.
- Keep legacy worker/runtime code available as a rollback artifact until evidence and compatibility are accepted; do not run overlapping schedulers for the same flow after cutover.
- Do not change financial business rules, trust boundaries, APIs used by clients, SMS consent/suppression/template safeguards, audit semantics, or append-only financial history.
- Do not send live SMS, replay historical SMS, alter Production, apply destructive migrations, or perform Production cutover in this change.
- Do not claim Preview validation, live schedule inventory, or provider/deployment evidence without actually obtaining it.

## Phased delivery

1. Specify, inventory, and add non-destructive schema/API changes with local tests.
2. Validate the new path in Preview with SMS provider disabled and only synthetic/idempotent fixtures; compare behavior and collect evidence.
3. Shadow/canary each safe flow, prove boundedness, retry behavior, lock ownership, and report freshness; enable real SMS processing only via explicit approval and safe-provider checks.
4. Stop the legacy worker and remove Vercel/third-party schedules only in a separately approved Production cutover.

## Acceptance

- Every flow is invoked only through a guarded POST endpoint with fail-closed, constant-time, environment-specific scheduler authentication.
- Each HTTP request processes a strict bounded batch and returns truthful per-flow result counters; durable completion/error evidence distinguishes dispatch from successful work.
- Concurrent duplicate invocations cannot duplicate expiry ledger entries, reminders, SMS sends, fraud findings, or report mutations.
- A crashed process cannot strand claims indefinitely; retries are bounded and dead-lettered for operator review.
- Report materialization advances a persisted, fair cursor, avoids rebuilding every tenant per tick, and does not starve later tenants.
- Cron schedule inventory, secret setup, Preview-only validation, monitoring, rollback, and a Production-cutover stop gate are documented.
- No Production configuration or data was changed, no historical SMS replayed, and no live SMS was activated during implementation.
