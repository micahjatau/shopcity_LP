## Context

Sprint 2 financial writes are complete, but repo review 21 identified read/API contract defects in the customer, card, and throttling surfaces. Customer reads currently include `creditLots.remainingAmountKobo` to calculate balances, privileged customer reads can return the included Prisma payload directly, card lookup calculates balances from unfiltered lots, and 429 throttling currently falls back to the generic `HTTP_429` error code.

These reads sit on the trust boundary for cashier-facing UI, supervisor customer management, and the upcoming Sprint 3 redemption flow. The fix must preserve backend-owned financial authority, integer kobo accounting, append-only ledger history, and the existing PII minimization policy.

## Goals / Non-Goals

**Goals:**

- Return explicit customer/card DTOs from HTTP read paths, with no raw Prisma entities or raw `bigint` values.
- Make cashier-visible and privileged aggregate balances reflect only active, unexpired, positive credit lots.
- Avoid loading or returning unbounded credit-lot arrays for customer list pages.
- Align runtime throttling error envelopes with the documented `RATE_LIMITED` 429 contract.
- Add route-level tests that prove JSON serialization, role-specific DTO shapes, expiry filtering, and throttle exhaustion behavior.
- Reconcile Sprint 2 closeout issue/evidence text so it is internally consistent.

**Non-Goals:**

- Do not introduce redemption, debit ledger entries, expiry ledger events, reversals, or adjustments.
- Do not change the append-only ledger model or mutate historical credit lots outside existing lifecycle rules.
- Do not expose credit-lot internals to cashier or customer-management clients.
- Do not introduce GraphQL, microservices, or frontend-submitted balance authority.

## Decisions

1. Use explicit read DTO mappers for customer responses.

Customer list/detail endpoints will map database rows into stable role-specific DTOs. Cashier DTOs remain limited to sales-workflow fields. Privileged DTOs may include full phone/email and administrative customer fields, but all financial values must be converted to integer JavaScript numbers and no `creditLots` collection should be returned.

Alternative considered: configure a global serializer for `bigint`. That would hide the immediate JSON failure but still leak ORM-shaped nested data and would not fix expired-balance semantics.

2. Centralize active-balance reconstruction behind a shared backend helper/service.

Customer, card, earn-facing reads, and future redemption validation should use one active-balance query path that filters `remainingAmountKobo > 0` and `expiresAt > now`. The implementation may start as a shared service/helper using Prisma aggregate or grouped queries, but callers should not independently reduce arbitrary `creditLots` arrays.

Alternative considered: add identical filtered `creditLots` includes at each caller. That is smaller initially, but it repeats financial policy and would invite drift when redemption, expiry, and reporting are added.

3. Prefer aggregate queries over nested collection includes for list endpoints.

Customer list pages should load the bounded customer page and then attach active balances using an aggregate/grouped query scoped to those customer IDs. This keeps top-level pagination bounded and prevents a page of customers from expanding into an unbounded credit-lot result set.

Alternative considered: use filtered includes with `remainingAmountKobo` only. That fixes expired balances and JSON serialization, but still scales with lot count rather than page size.

4. Map throttling failures to the stable domain code at the error source or filter.

The runtime response for a throttled request must contain `statusCode: 429` and `code: RATE_LIMITED`. Throwing a domain exception from `RequestThrottleGuard` is preferred because it preserves intent at the source; adding a 429 case in the global filter is acceptable only if it does not weaken domain-specific error codes.

Alternative considered: update OpenAPI to document `HTTP_429`. That would institutionalize a generic code and contradict the existing financial throttling capability.

5. Keep audit metadata useful without duplicating raw searched PII.

Privileged customer list audit records should indicate that a search occurred and capture low-risk classification/count metadata rather than storing the raw phone or email query string. If correlation is required later, use a keyed hash of the normalized query.

Alternative considered: leave raw query metadata unchanged because audit logs are internal. Audit logs are durable sensitive records, so duplicating searched PII should be avoided when it is not needed.

## Risks / Trade-offs

- Active-balance aggregation query drift -> Keep one shared helper/service and cover it through customer, card, and loyalty-facing tests.
- Numeric conversion overflow -> Balances are integer kobo and current business scale fits JavaScript safe integers; tests should assert returned JSON numbers and implementation should avoid floating-point arithmetic.
- Extra query per customer page -> Use one grouped query for all page customer IDs, not per-customer lookups.
- Role DTO regression -> Add HTTP-level cashier and supervisor/admin tests that inspect serialized JSON shapes.
- Throttle test flakiness -> Configure a low test-only limit/window or call a route with deterministic test settings rather than sleeping on production windows.
- Issue body reconciliation via GitHub API can fail -> Treat it as a documented manual/process task if credentials or permissions are unavailable during implementation.

## Migration Plan

1. Add active-balance read helper/service and unit coverage for positive, zero, depleted, and expired lots.
2. Replace customer/card read calculations with the shared active-balance path and explicit DTO mappers.
3. Update throttle error mapping and add the runtime 429 envelope regression test.
4. Update closeout evidence/issue metadata as needed.
5. Run targeted specs, OpenAPI checks, build, and the repo verification scripts before closing the change.

Rollback is code-only: revert DTO/read-helper/throttle changes if regressions appear. No database migration is expected.

## Open Questions

- Should the initial active-balance helper live in `src/modules/loyalty` as financial domain logic or in a shared read-model module under `src/modules/customers` until redemption formalizes balance services?
- Is updating Issue #1 body required through GitHub automation during implementation, or is a follow-up evidence comment acceptable if body edit permissions are unavailable?
