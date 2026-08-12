# Database Restore Runbook

## Purpose

Restore the database from a known backup and prove the restored environment preserves financial integrity, recovery work, and pilot readiness evidence.

## Provider-managed backup responsibility

Scripted restore drills do not replace provider-managed encrypted scheduled backups or PITR controls. Record the active provider backup control for every drill.

## Steps

1. Confirm the backup window, target restore point, release SHA, and release artifact/image digest under test.
2. Restore the backup into a safe isolated environment with provider tooling plus `pg_dump`/`pg_restore` validation where applicable.
3. Run invariant verification, including migrations, triggers/functions, lot equations, and recoverable background work checks.
4. Verify the app against the restored data and rerun authoritative financial invariants.
5. Record backup completion time, restore start time, restore completion time, verification completion time, observed RPO, and observed RTO.
6. Validate the recorded drill with `node scripts/restore/verify-restore-drill.mjs --evidence <file>`.
7. Record the restore test in the migration tracker and release evidence.
