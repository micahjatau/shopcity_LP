# Staging certification

Candidate SHA: a8b4506726915a2ee1b0c204e15d277a30f4d1cb
Image digest: Vercel deployment dpl_CTZ2BoVhHkwG6KprB6q2jST3ZeTa
RecordedAt: 2026-08-13T14:20:06Z
Deployment URL: https://shopcity-jmnacoqq6-micah-s-projects-bb6507fe.vercel.app
Staging workflow run: https://github.com/micahjatau/shopcity_LP/actions/runs/31709623536

Validation steps:

- exact Vercel deployment available at approved HTTPS target: complete (`dpl_CTZ2BoVhHkwG6KprB6q2jST3ZeTa`)
- staging migrations: pending
- readiness probes: complete (`/health/live` returns 200; `/health/ready` returns 200)
- Bruno smoke checks: pending
- contract tests: pending
- ZAP against actual staging URL: complete (`security-gates` run 31709623536, ZAP job success, `FAIL-NEW: 0`)

Staging validation: not certified; readiness is healthy, but Bruno, contract, and migration-gated evidence still need same-candidate confirmation

Latest readiness diagnosis on the current preview deployment:

- `/health/live` returns 200
- `/health/ready` returns 200
- Postgres status: `up`
- Redis status: `up`
- Result: preview wiring is healthy after switching Redis to Upstash and Postgres to the Supabase session pooler

Historical failure record preserved for the previous preview wiring issue:

- `/health/live` returns 200
- `/health/ready` returned 503
- Postgres failure detail: `FATAL: (ENOTFOUND) tenant/user postgres.nmuedccamqacgszvosvm not found`
- Redis failure detail: `Redis client error: connect ECONNREFUSED 127.0.0.1:6379`
