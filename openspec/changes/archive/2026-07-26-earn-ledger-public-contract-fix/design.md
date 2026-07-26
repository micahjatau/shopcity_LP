## Context

The repo now has the immutable ledger core, but it also still exposes a legacy receipt path that can complete without producing ledger effects. The public API, generated OpenAPI, and database constraints do not yet line up with the TRD's earn lifecycle or with the new ledger model.

## Goals / Non-Goals

**Goals:**
- Make one earn workflow authoritative for public clients.
- Express confirmed versus pending approval outcomes in the HTTP contract.
- Surface transaction identity, balance, and expiry data consistently.
- Close the main database and outbox safety gaps around the new ledger.

**Non-Goals:**
- Reworking redemption or FIFO allocation.
- Introducing a new messaging provider.
- Redesigning the overall auth/session model.

## Decisions

- Keep `LoyaltyService` as the single financial orchestrator and convert legacy receipt handling into a compatibility layer instead of a second business path. This avoids parallel persistence logic while preserving a migration path for old callers.
- Model pending approval as a first-class HTTP 202 response rather than a special case hidden behind 200/201 envelopes. This matches the TRD state machine and keeps the client contract explicit.
- Define transaction identity around separate `transactionId`, `receiptId`, and `approvalId` fields so the API no longer overloads one identifier for multiple concepts.
- Add authoritative balance computation from confirmed, unexpired lots rather than deriving balance from individual transaction reads. That keeps balance logic reusable for redemption later.
- Enforce ledger invariants in the database as well as in application code. Application checks are useful, but the financial history needs schema-level protection.
- Treat outbox publishing and SMS delivery as observable state transitions, not fire-and-forget queue work. The system needs a persisted trail for retries and failures.

## Risks / Trade-offs

- [Compatibility risk] Existing callers of legacy receipt routes may see changed behavior or status codes. → Mitigate by keeping a compatibility wrapper long enough to migrate callers and by documenting the new canonical endpoint.
- [Schema migration risk] Adding invariants to a live ledger can fail on existing bad rows. → Mitigate with preflight data checks and a rollback-safe migration plan.
- [Contract drift risk] Runtime responses and OpenAPI can diverge again if regeneration is skipped. → Mitigate by making contract regeneration part of the verification gate.

## Migration Plan

1. Route all public earn captures through the authoritative workflow.
2. Add the missing contract fields and status handling.
3. Add ledger and credit-lot constraints with a migration that validates current data first.
4. Bring outbox publishing and delivery-state updates online.
5. Regenerate OpenAPI and rerun verification so the published contract matches runtime behavior.

## Open Questions

- Should the legacy `/receipts` path be kept as a temporary compatibility wrapper or removed from cashier-facing access entirely?
- Should the outbox worker publish directly to SMS delivery or only mark events ready for a downstream adapter?
- Which response fields are mandatory on pending approval versus confirmed earn responses beyond the TRD minimum?
