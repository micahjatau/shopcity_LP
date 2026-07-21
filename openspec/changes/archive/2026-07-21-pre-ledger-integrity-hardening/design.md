## Context

The current repo already has a receipt integrity migration, an upgrade-path integration test, session-based auth, and a global CSRF guard. The remaining gaps are release-safety and trust-boundary gaps: legacy receipt upgrade validation can still be bypassed by bad historical data, receipt capture still depends on client-provided device identity, high-value receipts do not yet have an explicit review workflow, and bearer versus cookie CSRF behavior is not expressed as a clear contract.

## Goals / Non-Goals

**Goals:**
- Make receipt integrity upgrades fail fast on ambiguous legacy identity data.
- Make receipt capture atomic under concurrency and revalidate eligibility inside the write path.
- Move device identity to the authenticated session boundary and preserve receipt history.
- Add a review state model for high-value receipts so ledger work can rely on a clean approval boundary.
- Make bearer and cookie auth behave differently for CSRF in a way clients can understand.

**Non-Goals:**
- Implement the immutable earning ledger itself.
- Implement redemption, reversals, or SMS workflows.
- Rebuild the entire auth system or introduce a new auth provider.

## Decisions

### 1. Split the work into two capabilities
The change will carry one receipt-processing capability and one auth-contract capability. That keeps the release-safety concerns grouped with the receipt workflow while still making the CSRF behavior explicit.

Alternative considered: splitting migration safety, receipt capture, device binding, and auth into separate changes. Rejected because the current blockers are coupled and need one coherent release boundary.

### 2. Fail receipt upgrades before mutation
The migration should validate blank and duplicate legacy receipt identities before any irreversible rename, backfill, or drop runs.

Alternative considered: mutating first and validating later. Rejected because a transaction rollback is not a good enough safety story for release operations that may be repeated against dirty environments.

### 3. Treat capture as a single transaction with fresh validation
Receipt capture should re-check device, branch, card, and customer eligibility inside the transaction that creates the receipt and the supporting records.

Alternative considered: relying on preflight checks outside the transaction. Rejected because the review gap is exactly the time-of-check/time-of-use window.

### 4. Model high-value receipt review explicitly
Use explicit review state plus a separate approval record instead of burying approval metadata in the receipt row.

Alternative considered: a few nullable approval columns on `Receipt`. Rejected because the approval path is workflow state, not core receipt identity, and the extra row makes requester/approver separation clearer.

### 5. Source device identity from the authenticated session
Device identity should come from the authenticated session context rather than a client-supplied capture field. The receipt row keeps the immutable device reference, and device deletion is restricted if receipts already reference it.

Alternative considered: keep accepting deviceId in the body and only restrict deletes. Rejected because the client would still control a trust-boundary field that should be anchored to the authenticated session.

### 6. Branch CSRF by auth source
The CSRF guard should allow bearer-authenticated unsafe requests to pass without CSRF and continue requiring CSRF for cookie-authenticated unsafe requests.

Alternative considered: keep requiring CSRF for both. Rejected because bearer clients do not benefit from a browser CSRF defense and the current behavior is harder than necessary for API consumers.

## Risks / Trade-offs

- [Risk] Device/session binding can invalidate or complicate existing session flows. → Mitigation: roll it out together with the receipt capture path and keep the transition tightly covered by integration tests.
- [Risk] The approval workflow adds state complexity before ledger work lands. → Mitigation: keep the workflow explicit and narrow, with one review record and a small transition set.
- [Risk] Migration preflight can block deploys on dirty historical data. → Mitigation: keep the preflight, add upgrade-path coverage, and clean data before shipping the destructive change.
- [Risk] Bearer-only clients may suddenly stop sending unnecessary CSRF headers. → Mitigation: document the contract in OpenAPI and treat the change as breaking for cookie-based assumptions, not for bearer usage.

## Migration Plan

1. Add or adjust tests first: migration upgrade coverage, concurrent receipt capture, and auth contract coverage.
2. Ship the schema and service changes behind the existing application boundary.
3. Deploy the receipt integrity migration only after legacy duplicate/blank data is cleaned up.
4. Verify the upgrade path in Testcontainers and then update the migration tracker.
5. If session-bound device identity requires a data backfill or session rotation, do that during the same release window.

Rollback: preserve a database backup before the destructive migration, and roll back the application release if validation or auth-contract tests fail. Once the destructive receipt migration is applied, rollback requires restoring data rather than replaying code only.

## Open Questions

- Should device identity be hard-bound at session creation, or is a narrower session-resolved device claim enough for the first release?
- Should pending-approval receipts create a separate approval table now, or should the approval record be folded into the receipt workflow entity for the first release?
