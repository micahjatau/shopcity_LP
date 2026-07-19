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
