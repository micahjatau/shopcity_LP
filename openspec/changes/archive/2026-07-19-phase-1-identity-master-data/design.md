## Context

Phase 1 is the trust foundation for the platform. The repo already has NestJS, Prisma, Supabase, and health scaffolding, but the phase-1 domain modules are empty and the Prisma schema is unset. The design must unlock frontend integration without leaking authority to the client.

## Goals / Non-Goals

**Goals:**
- Establish backend-owned auth/session handling on top of Supabase identity verification.
- Define the minimum master-data model for users, branches, devices, customers, cards, and audit logs.
- Expose the first stable API surface for onboarding and lookup flows.
- Keep all sensitive decisions server-side and auditable.

**Non-Goals:**
- Ledger earning, redemption, approvals, expiry, or SMS processing.
- Offline sync behavior.
- Full reporting beyond basic audit/query support.

## Decisions

- Supabase verifies identity; ShopCity owns app sessions.
  - Alternatives considered: use Supabase sessions directly or re-implement password auth. Rejected because the TRD explicitly separates identity verification from app authorization and session control.

- Keep phase 1 as a modular monolith slice with dedicated Nest modules.
  - Alternatives considered: collapse into a generic users module or defer module boundaries. Rejected because phase 2+ depends on stable domain seams.

- Model tenant/branch context now, even though MVP deployment is one branch.
  - Alternatives considered: hard-code a single branch. Rejected because the TRD already anticipates branch-local receipt and policy rules, and the extra columns are cheap now.

- Store sessions/revocation state in the backend database.
  - Alternatives considered: stateless JWT-only auth. Rejected because revocation, suspension, and backend-owned RBAC need server-side control.

- Treat audit as append-only infrastructure shared by the phase-1 modules.
  - Alternatives considered: per-module ad hoc logs. Rejected because sensitive actions need consistent actor/target/request metadata.

### Phase-1 lifecycle sketch

```text
Supabase credential check
        |
        v
Backend issues session + CSRF
        |
        v
Session maps to backend role/suspension state
        |
        v
Protected APIs check session + RBAC + scope
        |
        v
Sensitive writes append audit rows
```

### Minimum data model

| Entity | Purpose |
|---|---|
| tenants | ownership boundary, future-ready |
| branches | branch policy and receipt context |
| devices | browser/POS attribution |
| users | staff identity and role |
| sessions | backend-owned application session state |
| customers | normalized customer identity |
| cards | barcode lifecycle and replacement history |
| audit_logs | immutable action trail |

## Risks / Trade-offs

- Session state adds storage and revocation complexity -> mitigated by keeping the session model minimal and centralized.
- Early branch/tenant fields may feel redundant in MVP -> mitigated by treating them as low-cost structural scaffolding for later phases.
- Audit logging can become noisy -> mitigated by limiting phase-1 audit coverage to sensitive and state-changing operations.

## Migration Plan

- Add Prisma models and generate the client.
- Introduce auth/session services behind the existing Supabase module.
- Wire phase-1 modules into `AppModule` and publish the new API contract.
- Backfill seed data for one tenant and one branch.
- Verify rollback by keeping the phase-1 schema additive and non-destructive.

## Open Questions

- Should session cookies be rotated on every authenticated request or only on explicit refresh?
- What is the minimum set of customer fields required for registration in MVP?
- Should device registration be required for all state-changing requests or only attribution/audit?
