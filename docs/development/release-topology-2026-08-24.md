# Release topology evidence — 2026-08-24

## Observed state

- Repository: `micahjatau/shopcity_LP`
- Default branch: `master`
- Local branch: `frontend-development`
- Local candidate: `adef3e2ee5ce6006d2bdfbe97001cba9843852b1`
- GitHub authentication: verified for `micahjatau`
- GitHub `master` branch protection: not configured (GitHub API returned 404)
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

## Residual evidence gaps

- The current local candidate has not been pushed to GitHub, so no successful workflow conclusion exists for it.
- Database and backend data-plane regions were not independently verified in this evidence pass.
- Production deployment and workflow SHAs must be reconciled before release approval.
