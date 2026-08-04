## Context

The repository now has a usable foundation, but the latest review still blocks ledger work because receipt identity, timestamp handling, and legacy migration behavior do not yet match the intended pre-ledger trust model. The change also needs to keep Redis-backed safeguards self-contained in CI and recoverable at runtime so validation remains trustworthy.

## Goals / Non-Goals

**Goals:**

- Make the physical POS receipt the business uniqueness boundary.
- Preserve historical receipt identity through migration/backfill instead of fabricating a new business key.
- Require device-bound cashier context and explicit audited timestamp override behavior.
- Enforce tenant-safe receipt ownership and one authoritative actor reference.
- Keep Redis test/runtime behavior fail-closed, observable, and self-contained.

**Non-Goals:**

- Implement earning, wallet, approvals, or ledger posting.
- Introduce new queue workflows beyond Redis operability needed for this gate.
- Redesign unrelated master-data modules beyond what receipt integrity requires.

## Decisions

1. Use the physical POS receipt number as the business identity.

- Why: the printed receipt is the real anti-duplication boundary for supermarket checkout.
- Alternatives considered: keep a generated business receipt UUID. Rejected because it cannot prevent reuse of the same physical sale.

2. Preserve legacy receipt history with expand-and-contract migration.

- Why: existing rows must retain the original POS receipt reference, not the old generated UUID.
- Alternatives considered: leave the old schema in place or squash everything into a fresh table. Rejected because the change must support safe migration of stored data.

3. Keep POS transaction time and server capture time separate.

- Why: the business needs the cashier/POS timestamp, but the server must enforce trusted capture and audit behavior.
- Alternatives considered: trust one client timestamp for all purposes. Rejected because it weakens fraud controls.

4. Make overrides explicit instead of implicit role bypass.

- Why: stale/future or out-of-policy captures need an auditable exception path, not hidden permission logic.
- Alternatives considered: allow supervisors/administrators to bypass checks automatically. Rejected because it obscures accountability.

5. Derive device/branch context from authenticated state, not request input.

- Why: the frontend should not be authoritative for receipt identity or terminal identity.
- Alternatives considered: keep device and branch as free-form request fields with service-side validation. Rejected because it leaves the trust boundary too loose.

6. Keep Redis tests disposable and reconnect behavior bounded.

- Why: CI should not depend on ambient services, and a transient Redis outage should not require a process restart to recover.
- Alternatives considered: rely on host Redis and disable reconnects. Rejected because it is brittle and hard to validate.

## Risks / Trade-offs

- [Risk] Legacy receipt rows may need a one-time backfill or quarantine path. → Mitigation: use expand-and-contract migration and targeted migration tests.
- [Risk] Stricter timestamp and device checks may break existing cashier flows. → Mitigation: keep the override path explicit and document the required capture contract.
- [Risk] Safe-money ceilings may require tuning. → Mitigation: keep the limit configurable and validate it against expected store operations.
- [Risk] Redis reconnection can hide intermittent infrastructure issues. → Mitigation: log reconnect attempts, preserve fail-closed behavior, and add recovery coverage.

## Migration Plan

1. Expand the receipt model with the corrected POS identity, timestamp, and ownership fields.
2. Backfill legacy receipt identity from stored POS references and quarantine rows that cannot be mapped safely.
3. Add uniqueness and ownership constraints after the backfill is validated.
4. Update receipt capture validation and OpenAPI/docs to match the new contract.
5. Switch Redis tests to disposable infrastructure and add bounded reconnect/reset handling.
6. Run focused integration and migration tests before considering the gate complete.

## Open Questions

- What tolerance window should be acceptable for late POS timestamps in production?
- Should the override path reuse an existing supervisor workflow or remain a dedicated receipt-capture exception path?
- What is the right maximum purchase ceiling before approval is required?
