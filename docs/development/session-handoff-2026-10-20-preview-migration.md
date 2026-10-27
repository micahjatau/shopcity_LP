# Session Handoff — Preview Isolation and Prisma Migration

Updated: 2026-10-20

## Repository state

- Repository: `/root/github-repos/micahjatau/shopcity_LP`
- Branch: `workflow-states-implementation`
- HEAD: `eba6ce6 test(e2e): harden BFF tracing and isolate acceptance runners`
- Previous relevant commit: `66510ed feat(auth): add trusted BFF staff login`
- Upstream: `origin/workflow-states-implementation` at `9ae97bc`; local branch is 2 commits ahead. A `git push --dry-run` showed a fast-forward, but **no push was performed**.
- Working tree is dirty: no staged files; 29 tracked paths have unstaged changes and 2,620 untracked files remain, including generated `.next-*` artifacts and this handoff. Preserve all existing changes; do not clean/reset or stage broadly.

## User decisions and safety boundaries

- Pilot remains **NO-GO**.
- User withheld push authorization pending isolation evidence. Do not push `66510ed` or `eba6ce6`; pushes to this branch can trigger paired Vercel Preview deployments.
- Production changes/deployments, shared DB/Redis resets, financial acceptance testing, and paid infrastructure are not authorized.
- User explicitly authorized applying `20261015_pilot_pos_device_token_auth` to the linked shared Supabase `main` database. This authorization is limited to that migration; it does not authorize app deployment or Preview acceptance.
- Do not expose credentials, tokens, BFF secrets, request bodies, or cookie values. Do not use the local `.env.local` connection for remote migration work.
- Preserve financial history and do not modify `LotAllocationService` without renewed impact review.

## Preview and isolation status

- Latest web and API Preview deployments are READY at `9ae97bc`, not the two local candidate commits.
- No Supabase Preview branch exists; only `main` was listed.
- The API Preview database target and isolation cannot be verified: Vercel environment-variable inspection returned 403. A public branch identifier matching shared `main` is suggestive but not proof of the API database target.
- Dedicated test identity, isolated Redis, and non-production SMS target are not verified.
- No Preview settings or infrastructure were changed; no login/acceptance test was run.

## Migration status

- Migration: `prisma/migrations/20261015_pilot_pos_device_token_auth/migration.sql`.
- It adds the `DEVICE_TOKEN` enum value, `DeviceTokenCredentialStatus`, the `DeviceTokenCredential` table, indexes, and a device foreign key. The migration tracker records disposable Testcontainers verification; CI and shared-target verification were previously pending.
- A read-only query of `public._prisma_migrations` on linked Supabase `main` returned no row for this migration. Therefore Prisma records it as unapplied there.
- `supabase migration list --linked` showed all four Supabase CLI migrations matched locally and remotely; this is separate from Prisma migration history.
- User authorized applying the Prisma migration to linked `main`, but it **has not been applied**. The process has no `DATABASE_URL` or `SUPABASE_DB_PASSWORD`; the repo `.env.local` points to `localhost:5432/shopcity`, not remote `main`. Vercel env access is denied. Do not bypass Prisma migration tracking with hand-written SQL.
- Blocker: obtain an approved secure direct Prisma connection to linked `main`, or have the authorized DB operator run `prisma migrate deploy` and provide sanitized output. Then verify Prisma status/schema and record the application in `docs/database/migration-tracker.md`.

## Candidate commits and verification

- `66510ed` contains trusted BFF staff login work.
- `eba6ce6` contains BFF request-ID tracing/security coverage and isolated live/visual test-runner changes. It was committed from an explicit 18-file allowlist; commit hooks passed. Unrelated files were excluded.
- Focused checks previously passed: BFF proxy/security tests, disposable-runner safety tests (4/4), and commit hooks. The earlier broad root/web suites and auth checks are recorded in the prior closure plan.
- GitNexus `detect-changes` before the candidate commit reported 18 files, 12 symbols, low risk, and no affected processes; the index was stale at `9ae97bc`, so treat this result as limited.
- The complete 107-test visual suite and backend-connected E2E suite remain pending. Backend E2E previously refused safely because host RAM/swap was below preflight thresholds. Do not run broad suites until sufficient resources are available.

## Open tasks / safe next steps

1. Obtain the secure Prisma connection path to the explicitly authorized linked `main` target. Apply only `20261015_pilot_pos_device_token_auth` with Prisma tooling; verify and update the migration tracker.
2. Separately establish an approved isolated API Preview data target, isolated Redis, non-production SMS configuration, and dedicated approved test identity. Do not infer isolation from READY status or the public branch identifier.
3. Only after isolation is verified and push/deployment authorization is renewed, push the candidate and validate matching web/API Preview deployment identities.
4. Run the controlled Supervisor/Admin login, `/auth/me`, logout, and RBAC smoke only after those gates pass. Record sanitized SHA, environment identity, and correlated request ID.
5. Run the complete visual and backend E2E suites on a sufficiently provisioned runner; keep all remaining product/legal/security/operations approvals open.
