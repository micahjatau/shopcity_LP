## Context

Phase 1.5 improved the trust boundary, but the review still left four pre-ledger decisions unresolved: throttling must become distributed, the remaining tenant ownership edges must be closed, bootstrap must stop accepting placeholder credentials, and the product model still needs final naming/record-shape alignment before any loyalty ledger can be introduced.

This change is a final alignment pass before the financial core. It should remove ambiguity and dependency gaps without introducing the ledger itself.

## Goals / Non-Goals

**Goals:**

- Move throttling from process memory to Redis so limits are stable across restarts and instances.
- Close the remaining tenant ownership gaps around actor and audit references.
- Make bootstrap credentials explicit, safe, and fully documented for local setup.
- Resolve customer, card, and record naming so the ledger phase starts from a clear contract.

**Non-Goals:**

- Implement the ledger, wallet, redemption, or approval workflows.
- Introduce a new service topology or queue system.
- Redesign the entire customer domain beyond the pre-ledger alignment decisions.

## Decisions

1. Use Redis as the rate-limit backing store.

- Why: throttling counters must survive restarts and coordinate across instances.
- Alternatives considered: in-memory maps and PostgreSQL counters. Rejected because neither fits high-frequency request protection.

2. Key login and lookup limits by stable client context, not by the submitted serial number.

- Why: serial-based keys can be evaded by rotating values and can inflate memory/counter cardinality.
- Alternatives considered: using the card serial itself, or only IP address. Rejected because the serial is the abuse target and IP-only is too coarse for authenticated usage.

3. Complete tenant ownership for actor/audit relations before introducing financial records.

- Why: audit trails and actor links must not cross tenant boundaries once money-like records exist.
- Alternatives considered: leave actor references as application-only checks until ledger work. Rejected because financial auditability requires stronger invariants first.

4. Reject placeholder bootstrap passwords rather than trying to infer operator intent.

- Why: a placeholder that looks like a strong password is still unsafe if it ships unchanged.
- Alternatives considered: silently accepting and warning. Rejected because bootstrap credentials are part of the trust boundary.

5. Resolve record naming now, before ledger tables exist.

- Why: receipt/sale-record semantics and serial-number terminology affect schema, APIs, and tests more cheaply before the ledger phase.
- Alternatives considered: defer until the first ledger migration. Rejected because ambiguity would propagate into the financial contract.

## Risks / Trade-offs

- [Risk] Redis introduces a new operational dependency for throttling. → Mitigation: use the existing Redis service already present in the stack and fail closed when unavailable.
- [Risk] Stronger bootstrap rules can slow first-run setup. → Mitigation: document the exact setup path and require explicit credentials.
- [Risk] Model alignment can force follow-up renames in later work. → Mitigation: make the decision now and keep the current change focused on the contract, not the ledger.

## Migration Plan

1. Replace the in-memory throttling service with Redis-backed counters.
2. Add tenant-safe relations for the remaining actor and audit links.
3. Harden bootstrap password validation and update local setup documentation.
4. Confirm the customer/card naming decision and the receipt vs sale-record shape.
5. Add focused tests for Redis throttling, ownership constraints, bootstrap validation, and model decisions.

Rollback is straightforward for code changes. Schema changes should be applied with the existing expand-and-validate pattern.

## Open Questions

- Should card lookup throttling also track device identity in addition to IP and tenant context?
- Should the final pre-ledger record name be `receipt`, `sale-record`, or `transaction-intake`?
- Do we want to keep legacy barcode terminology internally for migration compatibility, or remove it completely now?
