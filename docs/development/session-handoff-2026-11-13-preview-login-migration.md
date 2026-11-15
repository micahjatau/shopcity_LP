# Session Handoff — Preview Login Database Migration

## Session state

- **Branch:** `workflow-states-implementation`
- **HEAD:** `fb0b7208` (`origin/workflow-states-implementation` at session start)
- **Worktree:** Already substantially dirty with pre-existing work. Preserve those edits; do not reset, broadly stage, or commit. This session updated `docs/database/migration-tracker.md` and created this handoff. No application code or migration SQL was edited.
- **User confirmation:** The user reports that preview login now works. No credentials were shared with or used by the agent.

## Root cause and resolution

- Vercel preview login requests returned HTTP 500 after Supabase password authentication, when Prisma loaded the local ShopCity `User` row. The database lacked `User.firstName`.
- The user confirmed Vercel preview uses the same database target as `.env.local`: linked ShopCity Supabase main project `nmuedccamqacgszvosvm`.
- Prisma found three pending migrations. `prisma migrate deploy` applied them to that target on **2026-11-13 at 19:31:55 UTC**:
  - `20261022_customer_marketing_preference_events`
  - `20261101120000_pilot_operations_health_history`
  - `20261112120000_staff_profile_fields`
- All three migrations are additive. The existing migration SQL files were not changed. No Vercel deployment, production settings, or credentials were changed.

## Verification

- Prisma reports all 60 migrations up to date; all three new migration records are finished.
- Verified the three `User` profile columns, marketing-preference event table and append-only trigger, and pilot snapshot table with RLS enabled.
- Vercel preview API `/health/ready` returned HTTP 200 with database and Redis up; preview `/login` returned HTTP 200. Production readiness also returned HTTP 200 with database and Redis up.
- A pre-migration `public` schema dump was restored into an isolated tmpfs-backed Supabase PostgreSQL 17.6.1 instance. The same pending migrations applied successfully there, key existing row counts remained unchanged, and Prisma status was up to date. Timed restore/apply/verification completed in 7 seconds.
- `docs/database/migration-tracker.md` records the migration, backup evidence, and the user's login confirmation.

## Backup and operational cautions

- Supabase backup inventory listed no physical backups and PITR was disabled (`walg_enabled=true`). A mode-`0600` logical dump of the affected `public` schema is at `/tmp/shopcity-main-pre-migration-2026-11-13T191742940Z/shopcity-public.dump` (2,305,912 bytes; SHA-256 `e6761b7ae77bcfc39726622882cabd6543259d1217ec63fa8ed1efa62aaa534b`). It excludes Supabase `auth` and `storage` schemas and is not a provider-managed backup.
- The dump is in `/tmp` on tmpfs and is ephemeral. Do not add it to the repository. Arrange approved secure retention and enable/verify provider-managed backups and PITR before future shared migrations.
- Host `/` reported 100% full during the session; a local Postgres operation failed for lack of space. The shared migration succeeded, and the restore rehearsal used tmpfs. Avoid broad cleanup or additional local database work until disk space is investigated safely.

## Suggested next steps

1. Confirm safe retention/transfer of the logical dump, then configure provider-managed backup/PITR for the shared Supabase project.
2. Preserve the current dirty worktree and existing Admin workflow implementation.
3. If login problems recur, capture the approximate UTC time and inspect sanitized Vercel API logs; do not request credentials or attempt sign-in on the user's behalf.
