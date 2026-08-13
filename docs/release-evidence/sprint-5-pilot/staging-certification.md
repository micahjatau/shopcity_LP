# Staging certification

Candidate SHA: 2511acc2dc70e27c7e1892ecfbcf414ab78c2707
Image digest: Vercel serverless deployment dpl_2e3TRMYKQ8DMWaFzC7mhrtRcf8f5
RecordedAt: 2026-08-13T11:22:33Z
Deployment URL: https://shopcity-lp.vercel.app
Staging workflow run: https://github.com/micahjatau/shopcity_LP/actions/runs/31694340876

Validation steps:

- exact Vercel deployment available at approved HTTPS target: complete (`dpl_2e3TRMYKQ8DMWaFzC7mhrtRcf8f5`)
- staging migrations: pending
- readiness probes: partial (`/health/live` returns 200; `/health/ready` remains dependency-gated)
- Bruno smoke checks: pending
- contract tests: pending
- ZAP against actual staging URL: complete (`security-gates` run 31694340876, ZAP job success, `FAIL-NEW: 0`)

Staging validation: not certified; ZAP gap closed, remaining staging gates listed above

Latest readiness diagnosis on the current preview deployment:

- `/health/live` returns 200
- `/health/ready` returns 200
- Postgres status: `up`
- Redis status: `up`
- Result: preview wiring is now healthy after switching Redis to Upstash and Postgres to the Supabase session pooler

Historical failure record preserved for the previous preview wiring issue:

- `/health/live` returns 200
- `/health/ready` returned 503
- Postgres failure detail: `FATAL: (ENOTFOUND) tenant/user postgres.nmuedccamqacgszvosvm not found`
- Redis failure detail: `Redis client error: connect ECONNREFUSED 127.0.0.1:6379`
