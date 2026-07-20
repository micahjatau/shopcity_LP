## Why

The backend is solid on auth, sessions, and core customer/card flows, but the review still shows several foundation risks that should be closed before ledger work begins: cross-tenant ownership is still app-enforced, card state updates are not fully concurrency-safe, bootstrap credentials are too permissive, and a few public endpoints still need throttling and active-state checks.

## What Changes

- Add database-level ownership constraints so tenant-scoped rows cannot reference branches or parent entities from another tenant.
- Make card status transitions concurrency-safe and terminal for replaced cards, with explicit activation eligibility checks.
- Harden bootstrap so administrator credentials are explicit and safe, and the local development flow includes a working Supabase startup path.
- Add request throttling for sensitive public endpoints and reject public configuration when the tenant or branch is inactive.

## Capabilities

### New Capabilities
- `ownership-integrity`: database constraints that enforce tenant ownership across branch-linked entities.
- `card-state-safety`: concurrency-safe card transitions, terminal replaced-card handling, and activation eligibility checks.
- `bootstrap-safety`: explicit, safe administrator bootstrap and a documented local Supabase startup flow.
- `request-throttling`: rate limits for sensitive public endpoints plus inactive-tenant/public-config rejection.

### Modified Capabilities

## Impact

- `prisma/`: schema and migration updates for composite ownership constraints.
- `src/modules/cards/`: card status transition logic and tests.
- `src/modules/configuration/`: public config eligibility checks.
- `src/modules/auth/` and `prisma/seed.ts`: bootstrap credential handling.
- `src/config/`, `docs/`, and local setup scripts: Supabase startup and seed workflow.
- `src/common/` and request-facing controllers/guards: throttling and endpoint protection.
