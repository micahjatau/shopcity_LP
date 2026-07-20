## Context

The repository is past the broad foundation work, but the review still identifies two blocking issues before ledger development can begin: the receipt contract does not yet reflect the actual printed POS workflow, and Redis-backed safeguards still need a self-contained test story plus runtime recovery. The change must correct those gaps without starting ledger, wallet, or loyalty implementation.

## Goals / Non-Goals

**Goals:**
- Make physical POS receipt identity the enforced uniqueness boundary.
- Require active device attribution and derive branch context from authenticated tenant data.
- Bound POS timestamps and preserve an explicit override path for exceptions.
- Enforce tenant-safe receipt ownership with one authoritative actor reference.
- Make Redis-backed tests self-contained and Redis failures observable and recoverable.

**Non-Goals:**
- Implement loyalty earning, redemptions, balances, or approvals.
- Introduce new queue topology or background job workflows.
- Redesign unrelated customer, card, or audit contracts beyond what receipt integrity needs.

## Decisions

1. Make the physical receipt number first-class, remove the generated business `receiptNumber`, and keep the internal UUID separate.
- Why: the physical printed receipt is the business identity that prevents duplicate earning, while an internal UUID still gives the application a stable row identifier.
- Alternatives considered: keep a generated business receipt UUID as the uniqueness key. Rejected because it cannot prevent reuse of the same physical POS receipt.

2. Compute the receipt week and normalized uniqueness key on the server.
- Why: week assignment must be consistent, timezone-aware, and not trust client-provided values.
- Alternatives considered: accept week data from the client. Rejected because it lets callers move the same sale between weeks.

3. Require device-bound cashier context for receipt capture.
- Why: receipt capture is a checkout action and should be attributable to a valid device and branch, not an arbitrary branch identifier from the request body.
- Alternatives considered: keep branch as a free-form field with later validation. Rejected because the trust boundary would remain too loose.

4. Keep timestamps split between POS occurrence time and server capture time.
- Why: the business needs to know when the sale happened, but the server needs its own trusted capture timestamp and a tolerance window for late or future entries.
- Alternatives considered: use one client timestamp for everything. Rejected because it is easy to abuse and hard to audit.

5. Use Testcontainers or equivalent for Redis-backed tests and add bounded reconnect/reset logic in the Redis client.
- Why: CI should not depend on ambient host services, and a transient Redis outage should not leave the process permanently wedged.
- Alternatives considered: rely on a manually started local Redis and disable reconnects. Rejected because it is brittle in CI and unsafe in production operations.

## Risks / Trade-offs

- [Risk] Stricter receipt validation may block legacy cashier flows. → Mitigation: keep the override path explicit, audit every exception, and document the new capture contract.
- [Risk] Adding a normalized weekly receipt key may require a backfill or temporary expand-then-contract migration. → Mitigation: introduce new columns and constraints before tightening existing ones.
- [Risk] Redis reconnects can mask intermittent infrastructure problems. → Mitigation: log every reconnect attempt and preserve fail-closed behavior for the sensitive paths.
- [Risk] Tighter device/branch enforcement may surface data-quality issues in existing seed or test fixtures. → Mitigation: update fixtures and add focused integration coverage before rollout.

## Migration Plan

1. Expand the receipt model with physical receipt number, normalized weekly identity, explicit POS occurrence time, and tenant-safe ownership fields, then remove the generated business `receiptNumber` from the contract.
2. Update receipt capture validation to derive branch/device context from authenticated data and to enforce timestamp bounds.
3. Add or tighten unique constraints after backfilling any required receipt identity data.
4. Switch Redis integration tests to disposable infrastructure and add reconnect/reset logging around the shared client.
5. Run focused integration tests for duplicate receipts, branch/device rejection, timestamp bounds, and Redis outage recovery before implementation is considered complete.

## Open Questions

- What tolerance window should count as acceptable for late POS timestamps in production?
- Should supervisor overrides be an existing privileged workflow or a new explicit receipt-capture path?
- Do we normalize receipt numbers only by trimming whitespace, or also by stripping punctuation and leading zeros?
