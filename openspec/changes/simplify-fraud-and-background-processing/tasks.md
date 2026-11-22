# Tasks

- [x] Refactor fraud evaluation into the authoritative fraud service; keep branch policy thresholds and emit one high-value purchase finding.
- [x] Disable deferred low-confidence rule families for new events while preserving existing findings and rate limiting.
- [x] Add a protected, bounded PostgreSQL outbox cron endpoint for fraud events only.
- [x] Ensure atomic SKIP LOCKED claims, stale-claim recovery, bounded retry/dead-letter behavior, and idempotent completion under concurrent processing.
- [x] Keep SMS/report/expiry/maintenance event ownership, BullMQ/Redis, worker entrypoint, and deployment schedules unchanged.
- [x] Add focused unit and Testcontainers concurrency/recovery coverage.
- [x] Run applicable verification and record migration/cutover prerequisites; no database migration or production deployment/configuration change was needed. Worker retirement remains a separately approved, reconciliation-gated follow-up.
