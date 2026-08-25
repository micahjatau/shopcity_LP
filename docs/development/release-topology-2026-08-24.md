# Release topology evidence — 2026-08-24

## Observed state

- Repository: `micahjatau/shopcity_LP`
- Default branch: `master`
- Local branch: `frontend-development`
- Local HEAD: `9f98184c0e94c485aaf9baaed776636544f03353`
- Working tree: dirty; local HEAD is not a release candidate until committed and pushed
- GitHub authentication: verified for `micahjatau`
- GitHub `master` branch protection: enabled; required PR review, required `ci` status check, stale-review dismissal, admin enforcement, and conversation resolution
- Vercel projects: `shopcity-lp` and `shopcity-api`
- Frontend project root: `apps/web`
- Backend project root: repository root (`.`)
- Frontend production deployment: `dpl_5vjrDu4bfG5zMgaHmp9HzdzSe9By`
- Frontend deployment region: `fra1`
- Backend production URL: `https://shopcity-api.vercel.app`
- Frontend production URL: `https://shopcity-lp.vercel.app`

## GitHub workflow evidence

The latest successful CI workflow observed through `gh run list` was run `32741038746` at SHA `4d3689d4157fb1fbcf38ca0c43b1d1e2288d8e99`. It does not match the local candidate SHA, so this is not release approval evidence for the current dirty worktree.

## Duplicate-project disposition

No Vercel project named exactly `shopcity` appeared in the authenticated `vercel project ls` output. The two ShopCity projects observed are intentionally separated as `shopcity-lp` (frontend) and `shopcity-api` (backend). This should remain verified during deployment review.

## Latest verification — 2026-08-25

- `master` protection was enabled through the GitHub API and reconfigured with the required `ci` check.
- The latest successful remote CI remains run `32741038746` at SHA `4d3689d4157fb1fbcf38ca0c43b1d1e2288d8e99`.

## Residual evidence gaps

- The current local worktree has not been committed or pushed, so no successful workflow conclusion exists for the current changes.
- Database and backend data-plane regions were not independently verified in this evidence pass.
- Production deployment and workflow SHAs must be reconciled before release approval.
