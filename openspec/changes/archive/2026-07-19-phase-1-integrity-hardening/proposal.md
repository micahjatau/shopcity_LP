## Why

Phase 1 is functionally large, but several integrity gaps still make the backend unsafe to deploy as the loyalty platform foundation. The current code needs a coordinated hardening pass so money policy, migrations, auth/session handling, contract quality, and invariants all line up before the loyalty ledger work begins.

## What Changes

- Correct the financial policy defaults and keep env samples, public config, and runtime behavior aligned.
- Add a real database migration and seed path so the Prisma schema is deployable.
- Tighten auth/session/CSRF handling so the browser auth model is coherent and safe.
- Improve OpenAPI metadata so request and response schemas reflect the actual API contract.
- Replace mocked integration coverage with real database-backed tests for the Phase 1 flows.
- Enforce core domain invariants for customers, cards, users, branches, tenants, and audit.
- Restore baseline CI gates for schema, contract, architecture, build, and quality checks.

## Capabilities

### New Capabilities
- `phase-1-integrity-hardening`: cross-cutting hardening for policy defaults, migrations, auth/session safety, contract quality, integration realism, domain invariants, and CI gates.

### Modified Capabilities
- None.

## Impact

- `src/config/`, `.env.example`, and public configuration responses.
- `prisma/` and `docs/database/migration-tracker.md`.
- `src/common/auth/`, `src/modules/auth/`, and cookie/session handling.
- `src/modules/*/*.dto.ts` and Swagger/OpenAPI generation.
- `test/` integration coverage and DB-backed verification.
- `src/modules/audit/`, `src/modules/customers/`, `src/modules/cards/`, `src/modules/users/`, and `src/modules/branches/`.
- `.github/workflows/ci.yml` and repo quality gates.
