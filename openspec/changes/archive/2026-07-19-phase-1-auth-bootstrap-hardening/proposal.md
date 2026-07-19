## Why

Phase 1 is functionally close, but the foundation is still split across service-level auth logic, incomplete HTTP coverage, and a bootstrap story that is not explicit enough for a safe local or deployment setup. We need to harden the session boundary and make initial environment bring-up deterministic before treating the ledger foundation as stable.

## What Changes

- Harden the authenticated session lifecycle across login, refresh, logout, and request authentication.
- Tighten session and user status checks so revoked, expired, suspended, or otherwise inactive identities cannot continue to access protected routes.
- Validate CSRF and cookie-based session handling at the HTTP boundary.
- Make the bootstrap path explicit with migrations, seed data, and documented readiness checks.
- Expand integration coverage around auth flows and application readiness.

## Capabilities

### New Capabilities
- `auth-session-lifecycle`: authenticated session issuance, rotation, revocation, and request validation.
- `environment-bootstrap`: deterministic project bootstrap, baseline seed state, and readiness verification.

### Modified Capabilities

## Impact

- `src/modules/auth/`, `src/common/auth/`, and related guards/cookie helpers.
- `src/modules/health/` and bootstrap entrypoints/readiness checks.
- `prisma/schema.prisma`, migrations, and seed data if bootstrap gaps require schema or seed alignment.
- `test/` integration coverage for auth and readiness flows.
- `README.md` and `docs/database/migration-tracker.md` for the operational bootstrap path.
