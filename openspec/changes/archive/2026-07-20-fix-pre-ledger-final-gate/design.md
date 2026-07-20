## Context

The repository has already closed the broad foundation gaps, but the pre-ledger gate still has a few concrete blockers that would break production or leave the next ledger step ambiguous. The current throttle implementation is local-only, bootstrap still accepts the documented placeholder password, audit writes cannot safely represent system events, and the public card/receipt contract is still not fully settled.

This change is a final gate before ledger work. It should remove those contradictions without introducing the ledger itself.

## Goals / Non-Goals

**Goals:**
- Make throttling safe for real Redis deployments and stable across instances.
- Enforce a strict bootstrap password policy that rejects repository placeholders and weak values.
- Allow audit events without a human actor while preserving tenant-local actor safety.
- Finalize the public card identifier as `serialNumber`.
- Define a receipt input record with explicit idempotency and operational context.

**Non-Goals:**
- Implement loyalty earning, redemptions, wallet balances, or approval workflows.
- Introduce new queues or a new service topology.
- Rename every internal persistence column immediately if a boundary adapter can preserve the public contract.

## Decisions

1. Use an official Redis client with one shared application-managed connection.
- Why: the current raw TCP implementation only covers the unsecured local Redis case and does not handle auth, TLS, reconnects, or connection reuse.
- Alternatives considered: keep the bespoke RESP socket client. Rejected because it is not production-safe and creates a new TCP connection for every request.

2. Make login throttling multi-dimensional.
- Why: one bucket for IP plus username is easy to evade with account rotation or IP rotation.
- Alternatives considered: keep the current single combined bucket. Rejected because it leaves obvious spray patterns under-protected.

3. Reject bootstrap placeholder passwords explicitly and require a stronger minimum policy.
- Why: the repository example value must never be accepted as a working administrator password.
- Alternatives considered: allow placeholders in local/dev and warn. Rejected because bootstrap credentials are part of the trust boundary.

4. Allow audit records with both actor fields null, and only populate actor tenant/id together for human actors.
- Why: background jobs, system reversals, and reconciliation tasks need audit history even when no person initiated the event.
- Alternatives considered: keep actorTenantId populated even when actorId is null. Rejected because it violates the database invariant and breaks system events.

5. Expose `serialNumber` publicly while preserving internal storage names if needed during migration.
- Why: the public contract must stop contradicting the spec, but renaming every storage column immediately is unnecessary churn.
- Alternatives considered: keep `barcodeValue` public. Rejected because it preserves the current specification drift.

6. Model receipts as idempotent capture records, not weekly unique POS references.
- Why: ledger inputs need a stable retry key and clear operational context, but an external receipt number is not guaranteed to be authoritative and should remain informational.
- Alternatives considered: keep branch/week/receipt-number uniqueness as the main contract. Rejected because it does not express idempotent retries or optional informational references.

## Risks / Trade-offs

- [Risk] A stricter bootstrap policy may block operators who relied on the placeholder. → Mitigation: document the required credential path and fail fast with a clear error.
- [Risk] Switching Redis clients can change connection behavior in tests and production. → Mitigation: keep the throttle interface stable and verify with a real Redis test container.
- [Risk] Changing the public card identifier can break clients. → Mitigation: update OpenAPI and tests together and treat the change as a deliberate contract update.
- [Risk] Receipt schema changes may require follow-up migration work. → Mitigation: keep the receipt model expand-first, then tighten constraints after backfill validation.

## Migration Plan

1. Replace the custom Redis socket implementation with a shared Redis client and update throttle keying and tests.
2. Tighten bootstrap password validation and keep local setup/docs aligned.
3. Adjust audit writes so system-generated events can persist with both actor fields null.
4. Update card request/response schemas to `serialNumber` and keep internal persistence mapping stable during the transition.
5. Expand the receipt model to include idempotency and operational context, then add migration and integration coverage.
6. Validate the app, OpenAPI contract, and database migrations against local Supabase and Redis before implementation moves to the ledger.

Rollback is by feature area: throttle, bootstrap, audit, card contract, and receipt schema can each be reverted independently if a regression appears.

## Open Questions

- Should the Redis client live in a shared infrastructure module or stay inside the throttle module for now?
- Should receipt idempotency use a single unique key or a compound key across tenant, client operation, and hash?
- Do we keep `barcodeValue` as an internal persistence column only, or schedule a later storage rename after the public API switch?
