# Frontend stabilization deployment evidence

Captured: `2026-08-22T23:00:00Z`

## Candidate

- Candidate SHA at inspection: `c388a96295d88b3c16201c24b82a2535170e082c`
- The CI workflow now exports `CANDIDATE_SHA=${{ github.sha }}` and verifies `git rev-parse HEAD` in every job before running checks.
- Local build, API, performance, and contract artifacts must be attached to this same SHA before release approval.

## Vercel context

Vercel account inspection found:

- **Canonical frontend project candidate:** `shopcity-lp`
- **Project ID:** `prj_UvU3PsV5X1iWaf01tmsuayh3AKiC`
- **Production URL:** `https://shopcity-lp.vercel.app`
- **Latest production deployment observed:** `shopcity-pwja7idre-micah-s-projects-bb6507fe.vercel.app`, SHA `2cf0d9dd37c201560e9530f39a0aea64b061bf0b`, `2026-08-15T17:53:39Z`
- **Candidate preview deployment:** `shopcity-jgljno32l-micah-s-projects-bb6507fe.vercel.app`, deployment ID `dpl_7roRBWYFtcJpWKSkUDPK2PTTsU8p`, SHA `c388a96295d88b3c16201c24b82a2535170e082c`, state `READY`, build region `sfo1`, runtime region `iad1`
- **Duplicate/stale project candidate:** `shopcity`
- **Duplicate project ID:** `prj_EtlxuZOQxWiLJeXMVuMpuRtEesnf`

The mismatch was caused by the local branch being ahead of the remote branch. The branch was pushed with explicit approval, and Vercel has now completed a preview deployment for the exact candidate SHA. Production remains on the older August 15 deployment until a production promotion is approved. The duplicate project has not been disconnected because that requires an approved operational decision. An unauthenticated preview performance artifact was regenerated for the pushed candidate at `tmp/performance/frontend-stabilization-candidate-c388a96.json`; authenticated workflow evidence remains unavailable. Therefore production certification remains **BLOCKED**, while candidate preview identity and runtime placement are traceable.

The candidate preview deployment now provides deployment ID `dpl_7roRBWYFtcJpWKSkUDPK2PTTsU8p`, build region `sfo1`, and runtime region `iad1`; production promotion status remains **UNKNOWN** until explicitly approved.

## Topology

- Frontend runtime region: `iad1` for the exact candidate preview deployment; build region is `sfo1`.
- Backend runtime region: **UNKNOWN**.
- Supabase/Postgres region: **UNKNOWN**.
- Same-region hop assessment: **UNKNOWN**.
- Mitigation/owner: deployment owner must bind the candidate SHA to the canonical project, record deployment ID and regions, and explicitly exclude or disconnect `shopcity`.

Docker release verification subsequently passed with the candidate SHA label: the image built, `help` exposed both API and worker runtimes, and both `dist/src/main.js` and `dist/src/worker.js` were present. The initial 300-second attempt timed out during the uncached build; the cached rerun completed successfully.

This artifact deliberately records unresolved evidence as blockers/unknowns rather than converting unauthenticated preview performance results into production claims.
