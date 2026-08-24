# Idempotency Policy

ShopCity requires client-generated idempotency keys for mutations whose retry can create a duplicate financial, approval, audit, device, or operational effect.

## Required coverage

The following mutations MUST require and enforce `Idempotency-Key` semantics:

- Earn, redemption, receipt capture, reversal, and adjustment.
- Approval decisions and other state-changing approval actions.
- Card creation, replacement, status changes, and other card-lifecycle mutations.
- Offline Earn replay and any retry-sensitive synchronization mutation.
- Device enrollment, activation, revocation, and attestation rotation.

A request is scoped by tenant, authenticated actor, endpoint, and key. An identical replay returns the original completed response without a second effect. Reusing a key with a changed body or actor scope returns `IDEMPOTENCY_CONFLICT`; a concurrent in-progress replay returns a distinct in-progress conflict.

## Explicit non-goals

Read-only requests and low-risk metadata edits that cannot create a duplicate business effect do not require financial-grade idempotency. If a future mutation becomes retry-sensitive, it must be added to the required-coverage inventory before release.

## Current implementation status

Financial workflows and offline replay already implement the required replay, conflict, and actor scoping behavior. Card lifecycle, device lifecycle, and approval mutation coverage must be brought under the same contract before this change is certified. The endpoint inventory and corresponding tests are release evidence.
