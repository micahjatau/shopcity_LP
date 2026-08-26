# Frontend stabilization release contract

The stabilization program uses one exact candidate SHA and one canonical frontend deployment identity.

## Required evidence fields

Every release evidence bundle MUST identify:

- candidate source commit SHA;
- CI run/check identifiers for lint, typecheck, build, tests, Semgrep, affected Playwright, and performance;
- canonical Vercel project and deployment ID, or the approved non-Vercel deployment artifact;
- explicit status for stale/duplicate deployment contexts;
- production-build route performance artifact;
- frontend/backend/database topology artifact;
- exceptions with observed value, rationale, owner, and follow-up date.

## Gate rules

1. Evidence from a different commit cannot satisfy the candidate gate.
2. A duplicate deployment failure cannot be silently omitted; it must be disconnected, excluded with owner approval, or remain a blocker.
3. Missing performance or topology fields are `UNKNOWN`, not passing values.
4. A release summary may claim `READY` only when all required checks reference the same candidate SHA and canonical deployment.
5. The worker/backend release artifact remains independently certified; frontend Vercel evidence does not replace container/worker evidence.
