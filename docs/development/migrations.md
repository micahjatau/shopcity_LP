# Migrations

## Rules
- Never edit a migration after it has been applied to a shared environment.
- Prefer expand-and-contract changes.
- Record destructive changes with a backup and data migration plan.

## Process
1. Update the Prisma schema.
2. Generate or apply the migration.
3. Regenerate the Prisma client.
4. Update `docs/database/migration-tracker.md`.
5. Run database and integration checks.
