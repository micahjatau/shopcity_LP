# Migration Tracker

Use this file to track schema changes, applied migrations, and backup/restore checks.

## Rules
- Do not edit a migration after it has been applied to a shared environment.
- Prefer expand-and-contract changes.
- Record destructive changes only with an explicit backup and data migration plan.

## Entries
| Date | Change | Migration | Backup/Restore Check | Notes |
|---|---|---|---|---|
| 2026-07-19 | Initial Prisma schema scaffold | None yet | Not run | Add one row per schema change, restore check, or applied migration. |
| 2026-07-19 | Phase 1 identity/master data schema and API surface | Prisma schema updated, no migration file yet | Not run | Additive backend foundation for auth/session, users, branches, devices, customers, cards, and audit. |
| 2026-07-19 | Phase 1 integrity hardening | `prisma/migrations/20260719_phase_1_integrity_hardening/migration.sql` | Fresh database migrate deploy verified in Testcontainers | Seed script added for foundation tenant, branch, and admin; restore/deploy path is now proven against a clean database. |
