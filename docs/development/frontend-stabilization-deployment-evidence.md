# Frontend stabilization deployment evidence

Captured: `2026-08-22T22:16:18Z`

## Candidate

- Candidate SHA at inspection: `b23e0634ad411bd0c942e41059b8177cce683763`
- The CI workflow now exports `CANDIDATE_SHA=${{ github.sha }}` and verifies `git rev-parse HEAD` in every job before running checks.
- Local build, API, performance, and contract artifacts must be attached to this same SHA before release approval.

## Vercel context

Vercel account inspection found:

- **Canonical frontend project candidate:** `shopcity-lp`
- **Project ID:** `prj_UvU3PsV5X1iWaf01tmsuayh3AKiC`
- **Production URL:** `https://shopcity-lp.vercel.app`
- **Duplicate/stale project candidate:** `shopcity`
- **Duplicate project ID:** `prj_EtlxuZOQxWiLJeXMVuMpuRtEesnf`

The latest observed deployments for both project contexts referenced commit `2eade672775e0907e32615a3b183ec05a10a20a9`, not the inspected candidate SHA. The duplicate project has not been disconnected because that requires an approved operational decision. Therefore canonical deployment certification is **BLOCKED**, not passed.

The observed deployment records did not provide an approved deployment ID/runtime-region evidence bundle. Runtime region remains **UNKNOWN**.

## Topology

- Frontend runtime region: **UNKNOWN** for the exact candidate deployment.
- Backend runtime region: **UNKNOWN**.
- Supabase/Postgres region: **UNKNOWN**.
- Same-region hop assessment: **UNKNOWN**.
- Mitigation/owner: deployment owner must bind the candidate SHA to the canonical project, record deployment ID and regions, and explicitly exclude or disconnect `shopcity`.

Docker release verification subsequently passed with the candidate SHA label: the image built, `help` exposed both API and worker runtimes, and both `dist/src/main.js` and `dist/src/worker.js` were present. The initial 300-second attempt timed out during the uncached build; the cached rerun completed successfully.

This artifact deliberately records unresolved evidence as blockers/unknowns rather than converting local performance results into deployment claims.
