# Admin navigation icons and live Overview card metric

## Why

Admin sidebar icons should communicate each destination rather than rely on generic list symbols, and the Overview should show active virtual cards only when an authoritative tenant-scoped value is available. The current Overview cannot obtain an active virtual-card count from its report endpoints.

## What changes

- Use context-appropriate Admin sidebar icons for Operations, Transactions, and Fraud while preserving text labels, route matching, and role boundaries.
- Add an Admin-only tenant-scoped API metric for active virtual cards, backed by `Card.status = ACTIVE` and the authenticated Admin's tenant.
- Integrate the metric with the Overview's independent loading/error/retry states and runtime response validation.
- Preserve existing report materialization semantics, integer-kobo financial fields, cumulative registration snapshots, and cron-job.org configuration; do not invent or derive report values.

## Out of scope

- No role, route, or tenant authorization changes; no tenant selector.
- No financial calculations or report-schema/database migration.
- No change to Supervisor navigation or transaction workflow.
- No production cron schedule/credential changes.
