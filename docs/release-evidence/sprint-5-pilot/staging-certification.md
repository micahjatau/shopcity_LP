# Staging certification

Candidate SHA: 78b186af8b1aa63a41eb4ac4619f4b79ed565899
Image digest: docker-daemon:shopcity-lp@sha256:4648c34f98b531e4e23881934a318911bd3470200f853beecc8f2e7292c06efb
RecordedAt: 2026-08-13T17:16:15Z
Deployment URL: https://shopcity-n0izs6ynq-micah-s-projects-bb6507fe.vercel.app
Staging URL: https://shopcity-lp.vercel.app
Staging workflow run: https://github.com/micahjatau/shopcity_LP/actions/runs/31724647994
CI workflow run: https://github.com/micahjatau/shopcity_LP/actions/runs/31724029222

Validation steps:

- exact Vercel deployment available at approved HTTPS target: passed (`dpl_AFpY6dqyVm7EvUnnyvWThNVEScSB`)
- runtime region: passed (`fra1`, verified by Vercel deployment build output and `x-vercel-id` on readiness/performance traffic)
- staging migrations: passed (remote Supabase schema was brought current with the committed migration set; Prisma diff retained only the intentionally un-applied destructive `ReceiptLegacyIdentityQuarantine` drop)
- readiness checks: passed (`/health/live` returned 200; `/health/ready` returned 200 with Postgres and Redis up)
- Bruno smoke checks: passed (`BRUNO_BASE_URL=https://shopcity-lp.vercel.app npm run bruno:test`, 2 requests passed, 4/4 tests passed)
- contract tests: passed (CI Static Checks run included `npm run openapi:lint`, `npm run openapi:diff`, `npm run client:generate`, and `npm run client:typecheck`)
- ZAP baseline: passed (security-gates workflow-dispatch run 31724647994 against the approved HTTPS target)
- k6 authenticated pilot performance: passed (see `docs/release-evidence/sprint-5-pilot/performance-summary.json`)

Staging validation: passed for this candidate SHA and deployment.
