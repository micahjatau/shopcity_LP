## Why

Phase 1 is the first trust boundary for the platform: staff identity, backend-owned sessions, master data, and auditable customer/card operations. We need this slice defined now so the frontend can integrate against stable contracts while the ledger work remains safely out of scope.

## What Changes

- Add backend-owned authentication and session flows on top of Supabase staff identity verification.
- Add role-aware access control for cashier, supervisor, and admin actions.
- Add master-data endpoints for branches, devices, users, customers, and cards.
- Add immutable audit logging for sensitive actions and auth events.
- Publish the first version of the API contracts for phase-1 onboarding and lookup flows.

## Capabilities

### New Capabilities
- `identity-master-data`: staff auth/session lifecycle, RBAC, branch/device records, customer registration, card assignment/replacement, and audit logging.

### Modified Capabilities

<!-- None. This change is additive. -->

## Impact

- NestJS modules for auth, users, branches, customers, cards, and audit.
- Prisma schema for users, branches, devices, customers, cards, sessions, and audit logs.
- OpenAPI contract and generated client surface.
- Supabase integration boundary for staff identity verification.
- Frontend onboarding, cashier lookup, and supervisor registration flows.
