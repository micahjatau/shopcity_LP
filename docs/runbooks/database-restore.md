# Database Restore Runbook

## Purpose
Restore the database from a known backup when data loss or corruption occurs.

## Steps
1. Confirm the backup window and target restore point.
2. Restore the backup into a safe environment with `pg_dump`/`pg_restore` first when possible.
3. Validate schema, migration inventory, and critical queries.
4. Verify the app against the restored data.
5. Record the restore test in the migration tracker.
