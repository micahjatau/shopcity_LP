# Data Model

The data model centers on Postgres as the canonical store and uses Prisma for schema control.

## Key Data Concerns
- UUIDs for public-facing identifiers.
- Integer kobo for all monetary values.
- UTC timestamps for storage.
- Branch-local receipt numbering rules.
- Append-only ledger entries and related audit rows.
- Outbox-backed background work for SMS and other asynchronous tasks.

## Storage Boundaries
- Canonical operational data lives in Supabase/Postgres.
- Prisma owns schema and migration workflow.
- Redis supports queues and delayed work.
