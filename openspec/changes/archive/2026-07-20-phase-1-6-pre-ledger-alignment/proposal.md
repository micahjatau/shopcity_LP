## Why

Phase 1.5 closed several important foundation gaps, but the latest review still identified a few blockers before ledger work can start: throttling is not Redis-backed, tenant ownership is still incomplete around actor/audit relations, bootstrap still accepts a predictable placeholder password, and the customer/card/receipt model still needs final product alignment.

## What Changes

- Replace process-local throttling with Redis-backed request counters and explicit per-route bucket rules.
- Enforce tenant-aware ownership for remaining actor and audit relationships.
- Harden administrator bootstrap so weak or placeholder credentials are rejected and local Supabase setup is fully documented.
- Finalize the pre-ledger product model decisions for customer email, card serial naming, and receipt vs sale-record semantics.

## Capabilities

### New Capabilities
- `redis-throttling`: distributed rate limits for sensitive routes using Redis.
- `tenant-ownership-completeness`: tenant-safe actor, audit, and child-entity ownership relations.
- `bootstrap-credential-hardening`: safe bootstrap password rules and Supabase setup guidance.
- `pre-ledger-model-alignment`: final naming and record-shape decisions before ledger implementation.

### Modified Capabilities

## Impact

- `src/common/throttle/`: Redis-backed throttling service and guards.
- `prisma/`: ownership constraint changes for actor/audit relations.
- `prisma/seed.ts`, `.env.example`, `README.md`, and local setup docs: bootstrap workflow and password policy.
- `src/modules/auth/`, `src/modules/cards/`, `src/modules/customers/`, and `src/modules/configuration/`: route keying and ownership-sensitive behavior.
- `docs/` and `prisma/`: model naming and receipt/sale-record decisions before ledger tables.
