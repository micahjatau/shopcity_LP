# Staging smoke certification

## Certified candidate

- **SHA:** `996e63e9ac7749fcb2a2cf783065864373378212`
- **Environment:** staging
- **Frontend:** https://shopcity-lp-git-staging-micahjatau.vercel.app
- **Backend:** https://shopcity-api-git-staging-micahjatau.vercel.app
- **Backend readiness:** database and Redis healthy

## Smoke evidence

Three consecutive exact-SHA runs passed:

- [34342375267](https://github.com/micahjatau/shopcity_LP/actions/runs/34342375267)
- [34342927807](https://github.com/micahjatau/shopcity_LP/actions/runs/34342927807)
- [34343364604](https://github.com/micahjatau/shopcity_LP/actions/runs/34343364604)

Each run recorded 46 passing smoke tests, successful reconciliation, and successful release-evidence verification.

## Related fixes

- PR #25: safe runtime diagnostics
- PR #26: Vercel Prisma connection limit and BigInt report serialization
- PR #27: approval smoke threshold alignment
- PR #28: smoke evidence fallback handling
- PR #29: portable smoke workflow candidate checkout and evidence paths

This records staging certification only; it is not production certification.
