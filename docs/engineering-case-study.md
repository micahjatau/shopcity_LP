# Engineering case study: ShopCity loyalty platform

> **Portfolio snapshot — October 2026.** Release-candidate / controlled-pilot validation, **not a claim of production certification**. This document is an index to inspectable implementation evidence, not a substitute for running tests or reviewing a deployed environment.

## The problem

A supermarket wanted to introduce loyalty store-credit without replacing its existing point-of-sale (POS) system. The system needed to support cashiers and supervisors, attach credit to real receipts, maintain correct balances through earn, redemption, reversal, and expiry operations, and leave an audit trail. Network interruptions and retries could not silently duplicate financial effects.

The engineering question was not merely *how to display a balance*, but *how to enforce and explain every balance change across an unreliable, multi-role workflow*.

## Architecture and design choices

- **Backend as source of truth.** The NestJS domain layer owns eligibility, approval, and financial mutations; the browser is not authoritative for balance calculations. Inspect [domain modules](../src/modules), [system overview](architecture/system-overview.md), and [data model](architecture/data-model.md).
- **Integer monetary values and ledger records.** The design avoids floating-point accounting and records financial changes for review. Inspect [ADR 003](adr/003-integer-money.md), [ADR 002](adr/002-postgresql-ledger.md), and the [loyalty](../src/modules/loyalty) and [redemptions](../src/modules/redemptions) modules.
- **Idempotent, actor-scoped operations.** Retry-safe financial APIs distinguish an identical replay from conflicting content or actor scope. Importantly, the [idempotency policy](architecture/idempotency-policy.md) explicitly identifies additional mutation families whose coverage remains to be certified.
- **Transactional outbox for side effects.** Money movements and outbound notification intents are decoupled so external message delivery failures cannot independently govern ledger commits. See [ADR 004](adr/004-transactional-outbox.md) and [outbox recovery tests](../test/outbox-worker-recovery.int-spec.ts).
- **Role and tenant boundaries.** The application has cashier, supervisor and administrator surfaces, with tenant-aware access controls and authorization tests. See [tenant ownership tests](../test/tenant-ownership.int-spec.ts).

### Operational flow

```text
Existing POS receipt
      |
Cashier verifies customer + card
      |
Authenticated API validates tenant, actor, policy, and idempotency
      |
Approval if required / ledger mutation + audit + outbox intent
      |
Balance, reports, and eventual notification
```

This is a logical sketch of the intended flow, not a guarantee that every edge case has passed production validation.

## Five technical decisions worth discussing in an interview

| Decision | Why it mattered | Where to inspect |
| --- | --- | --- |
| Keep financial logic on the server | Prevent UI state from becoming the ledger | [system overview](architecture/system-overview.md), [financial invariants](../test/financial-state-invariants.int-spec.ts) |
| Require replay protection | Duplicate requests must not duplicate credit | [idempotency policy](architecture/idempotency-policy.md), [offline replay tests](../test/offline-earn-sync.int-spec.ts) |
| Model reversal and allocation explicitly | Auditable rollback is different from deleting history | [ADR 009](adr/009-redemption-allocation-approval-reversal.md), [reversal isolation tests](../test/reversal-lot-isolation.int-spec.ts) |
| Decouple external side effects | SMS outages should not corrupt balances | [transactional outbox decision](adr/004-transactional-outbox.md), [recovery tests](../test/outbox-worker-recovery.int-spec.ts) |
| Gate releases with evidence | A successful local build is not production readiness | [CI workflow](../.github/workflows/ci.yml), [security gates](../.github/workflows/security-gates.yml), [residual risks](release-evidence/review-68-residual-risks.md) |

## How to verify the engineering work

Start with the [README](../README.md) for local setup and feature scope. Read the linked decision records, inspect the associated modules and tests, then review the [CI configuration](../.github/workflows/ci.yml). The presence of a workflow or test file establishes *configured checks*, not necessarily that the latest run passed. Consult GitHub Actions run history for a specific candidate SHA and reproduce the tests in a suitable environment.

Useful focused code evidence:

- [Financial state invariants](../test/financial-state-invariants.int-spec.ts)
- [Redemption allocation invariants](../test/redemption-allocation-invariants.int-spec.ts)
- [Offline earn synchronization](../test/offline-earn-sync.int-spec.ts)
- [Tenant authorization](../test/tenant-ownership.int-spec.ts)
- [Transactional outbox recovery](../test/outbox-worker-recovery.int-spec.ts)
- [Security gate workflow](../.github/workflows/security-gates.yml)

## Current limitations — stated plainly

The [latest documented residual-risk review](release-evidence/review-68-residual-risks.md) records unresolved environment-gated checks, including real-tenant collision validation, backup/restore migration proof, staging-like scanner load testing, provider reconciliation, logging review, and broader static-analysis remediation. Those checks cannot be inferred from the existence of local test suites.

Do **not** interpret this case study as evidence of unrestricted production deployment, audited financial compliance, measured transaction throughput, or independently confirmed business impact. Those claims require separate dated artifacts.

## What this project demonstrates

This repository provides inspectable evidence of work across **API and domain modeling, state transitions, SQL-backed financial integrity, async processing, authorization boundaries, offline synchronization, integration testing, CI, and release-risk documentation**.

The strongest interview discussion is the trade-off between speed of building features and proving correctness of money-changing operations: which invariants were made explicit, where the implementation may still be incomplete, and how the release decision should be supported by evidence.
