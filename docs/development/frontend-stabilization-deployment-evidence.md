# Frontend stabilization deployment evidence

Captured: `2026-08-22T22:36:00Z`

## Candidate

- Candidate SHA at inspection: `f7b867069d86883bdb5c8252dfd9dbabdaf60b69`
- The CI workflow now exports `CANDIDATE_SHA=${{ github.sha }}` and verifies `git rev-parse HEAD` in every job before running checks.
- Local build, API, performance, and contract artifacts must be attached to this same SHA before release approval.

## Vercel context

Vercel account inspection found:

- **Canonical frontend project candidate:** `shopcity-lp`
- **Project ID:** `prj_UvU3PsV5X1iWaf01tmsuayh3AKiC`
- **Production URL:** `https://shopcity-lp.vercel.app`
- **Latest production deployment observed:** `shopcity-pwja7idre-micah-s-projects-bb6507fe.vercel.app`, SHA `2cf0d9dd37c201560e9530f39a0aea64b061bf0b`, `2026-08-15T17:53:39Z`
- **Duplicate/stale project candidate:** `shopcity`
- **Duplicate project ID:** `prj_EtlxuZOQxWiLJeXMVuMpuRtEesnf`

The mismatch is explained by repository state and deployment target: the canonical production alias is still on an older August 15 deployment, while the latest branch preview deployments are on the remote branch head. In both cases, the mismatch is explained by repository state: `origin/frontend-development` is still at `2eade672775e0907e32615a3b183ec05a10a20a9`, while the local candidate is 31 commits ahead at `f7b867069d86883bdb5c8252dfd9dbabdaf60b69`. Vercel is deploying the remote branch head, not this local-only candidate. No push was performed because publishing the branch requires explicit release approval. The performance artifacts were collected on earlier commits and must be regenerated for the eventual pushed candidate before release certification. The duplicate project has not been disconnected because that requires an approved operational decision. Therefore canonical deployment certification is **BLOCKED**, not passed.

The observed deployment records did not provide an approved deployment ID/runtime-region evidence bundle. Runtime region remains **UNKNOWN**.

## Topology

- Frontend runtime region: **UNKNOWN** for the exact candidate deployment.
- Backend runtime region: **UNKNOWN**.
- Supabase/Postgres region: **UNKNOWN**.
- Same-region hop assessment: **UNKNOWN**.
- Mitigation/owner: deployment owner must bind the candidate SHA to the canonical project, record deployment ID and regions, and explicitly exclude or disconnect `shopcity`.

Docker release verification subsequently passed with the candidate SHA label: the image built, `help` exposed both API and worker runtimes, and both `dist/src/main.js` and `dist/src/worker.js` were present. The initial 300-second attempt timed out during the uncached build; the cached rerun completed successfully.

This artifact deliberately records unresolved evidence as blockers/unknowns rather than converting local performance results into deployment claims.
