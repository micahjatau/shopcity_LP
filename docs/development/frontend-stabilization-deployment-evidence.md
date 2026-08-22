# Frontend stabilization deployment evidence

Captured: `2026-08-22T22:43:18Z`

## Candidate

- Candidate SHA at inspection: `7777c05d0885c8fe61f963153354158cda88470f`
- The CI workflow now exports `CANDIDATE_SHA=${{ github.sha }}` and verifies `git rev-parse HEAD` in every job before running checks.
- Local build, API, performance, and contract artifacts must be attached to this same SHA before release approval.

## Vercel context

Vercel account inspection found:

- **Canonical frontend project candidate:** `shopcity-lp`
- **Project ID:** `prj_UvU3PsV5X1iWaf01tmsuayh3AKiC`
- **Production URL:** `https://shopcity-lp.vercel.app`
- **Latest production deployment observed:** `shopcity-pwja7idre-micah-s-projects-bb6507fe.vercel.app`, SHA `2cf0d9dd37c201560e9530f39a0aea64b061bf0b`, `2026-08-15T17:53:39Z`
- **Candidate preview deployment:** `shopcity-m5d3e0auj-micah-s-projects-bb6507fe.vercel.app`, deployment ID `dpl_4nzEpSx595rVZvLQiZpfMLgYB3Vz`, SHA `7777c05d0885c8fe61f963153354158cda88470f`, state `QUEUED`, build region `sfo1`
- **Duplicate/stale project candidate:** `shopcity`
- **Duplicate project ID:** `prj_EtlxuZOQxWiLJeXMVuMpuRtEesnf`

The mismatch was caused by the local branch being ahead of the remote branch. The branch was pushed with explicit approval, and Vercel has now queued a preview deployment for the exact candidate SHA. Production remains on the older August 15 deployment until a production promotion is approved. The duplicate project has not been disconnected because that requires an approved operational decision. Performance artifacts must be regenerated for the pushed candidate before release certification. Therefore production certification remains **BLOCKED**, while candidate preview identity is now traceable.

The candidate preview deployment now provides deployment ID `dpl_4nzEpSx595rVZvLQiZpfMLgYB3Vz` and build region `sfo1`; runtime region and production promotion status remain **UNKNOWN** until the queued build completes and is approved.

## Topology

- Frontend runtime region: **UNKNOWN** for the exact candidate deployment.
- Backend runtime region: **UNKNOWN**.
- Supabase/Postgres region: **UNKNOWN**.
- Same-region hop assessment: **UNKNOWN**.
- Mitigation/owner: deployment owner must bind the candidate SHA to the canonical project, record deployment ID and regions, and explicitly exclude or disconnect `shopcity`.

Docker release verification subsequently passed with the candidate SHA label: the image built, `help` exposed both API and worker runtimes, and both `dist/src/main.js` and `dist/src/worker.js` were present. The initial 300-second attempt timed out during the uncached build; the cached rerun completed successfully.

This artifact deliberately records unresolved evidence as blockers/unknowns rather than converting local performance results into deployment claims.
