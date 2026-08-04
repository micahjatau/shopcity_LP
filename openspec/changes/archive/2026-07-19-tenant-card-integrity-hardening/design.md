## Context

The current backend has already tightened auth and session handling, but two integrity gaps remain in the config/card path: public configuration can resolve tenant and branch independently, and card status updates do not treat replaced cards as terminal. Both issues are small in scope but high in trust impact because they sit on the main operational path.

The repo is still in a backend-first MVP phase, so the safest change is to harden application behavior without introducing a larger schema migration or new infrastructure.

## Goals / Non-Goals

**Goals:**

- Ensure public configuration only returns a tenant/branch pair that belongs together.
- Prevent replaced cards from being reactivated through status updates.
- Preserve the existing card replacement flow and its one-active-card invariant.
- Add tests that lock in the new integrity behavior.

**Non-Goals:**

- Reworking the full tenant data model.
- Introducing new services, queues, or external dependencies.
- Changing the public API shape for cards or configuration.

## Decisions

1. Validate tenant/branch consistency in the configuration service.

- Why: the mismatch is a runtime trust issue that can be fixed at the service boundary with minimal surface area.
- Alternatives considered: composite tenant foreign keys, or a separate bootstrap table. Rejected for this change because they require broader schema work and are unnecessary for the current scope.

2. Treat `REPLACED` as terminal in card status updates.

- Why: the TRD expects replaced cards to remain inactive, and the current status endpoint allows a replaced card to be reactivated.
- Alternatives considered: remove `ACTIVE` from the status endpoint entirely, or add a separate state machine module. Rejected because the endpoint already serves a valid operational need for toggling between active and blocked cards.

3. Keep replacement logic centralized in the cards service.

- Why: replacement already owns the active-card uniqueness check and the audit trail. Keeping the new guard there avoids splitting card state rules across controller and service layers.
- Alternatives considered: enforce the rule in the controller or DTO validation. Rejected because business invariants belong in the service layer.

4. Add focused tests instead of expanding the change into schema migration coverage.

- Why: the behavior change is deterministic and can be covered with existing integration and service-level tests.
- Alternatives considered: full database constraint redesign. Rejected for this change because it is larger than the immediate bug fix.

## Risks / Trade-offs

- [Risk] Service-level tenant validation still relies on application code rather than database enforcement. → Mitigation: keep the check narrow, deterministic, and covered by tests; revisit schema hardening in a later change.
- [Risk] Replacing a card and blocking/reactivating cards use adjacent flows, which can be easy to regress. → Mitigation: add a direct test for replacing and a direct test for rejected reactivation of replaced cards.
- [Risk] Public config failures may surface as startup/runtime misconfiguration rather than a user-facing 4xx. → Mitigation: treat the mismatch as an operator error and fail fast.

## Migration Plan

1. Update the configuration and cards services.
2. Add tests for valid config pairs, mismatched config pairs, and card reactivation rejection.
3. Run the targeted test suites.
4. Deploy as a normal application release; no data migration is required.

Rollback is straightforward: revert the service and test changes. There is no schema migration to unwind.

## Open Questions

- Should the tenant/branch mismatch eventually move into schema-level constraints in a later change?
- Do we want to tighten the card status endpoint further so it only permits a subset of transitions explicitly?
