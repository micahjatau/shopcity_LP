## Context

`docs/repo_review_53.md` is a gap inventory for a branch that is mostly complete but still not safe to certify. The largest risks are no longer missing screens; they are incorrect authorization, misleading offline capture, weak device/session truth, and a few remaining operational correctness gaps.

## Goals

- Keep human roles truthful and keep SYSTEM out of human admin routing.
- Restore the production auth throttle policy.
- Make the device/session contract available to the frontend and reusable for offline sync.
- Make Offline Earn truthful end-to-end: save, queue, batch, retry, reconcile.
- Expose branch receipt-week policy and supervisor read-only operational state.
- Fix correctness gaps in pilot health, approvals, reports, and adjustments.
- Add release evidence that proves the closure path actually works.

## Non-Goals

- No change to ledger authority, reconciliation authority, or append-only financial history.
- No replacement of the backend contract with frontend guesses.
- No extra demo-only behavior to keep tests passing.

## Design

### 1. Auth, roles, and SYSTEM

- Keep SYSTEM out of human navigation and admin route groups.
- If SYSTEM is supported at all, it must not render a human admin experience.
- Restore the production auth throttle to the established baseline.
- Remove any hardcoded live-E2E admin password fallback; tests must source credentials explicitly.

### 2. Device/session contract

- Surface the authenticated device context in session/me responses or equivalent bootstrap data.
- Persist the device identity locally only as a reflection of the authenticated device, not as a synthetic fallback.
- Regenerate client types if the API surface changes.

### 3. Offline Earn and sync

- Offline Earn must inspect local persistence results before claiming a successful save.
- Valid offline records must include truthful cashier, branch, device, receipt-week, and idempotency values.
- Queue state names and retry eligibility must match the batch API.
- Partial failures must keep failed items visible with rejection reasons and stable identities.

### 4. Operational surfaces

- Supervisor can view materialization state but cannot refresh/administer it.
- Pilot health should use the correct zero-failure semantic state.
- Approval queues need pagination/filtering so they work beyond the first page.
- Branch admin should allow receipt-week-start-day editing where the backend already supports it.
- Adjustments should preview customer/balance impact before submission.

### 5. Release readiness

- Add one real live e2e for device login → Earn → offline save → reconnect → sync → confirmation.
- Remove duplicate deployment-status confusion.
- Reconcile OpenSpec tracker entries with the implemented branch state.

## Phases

### Phase 1 — Security and trust

Fix SYSTEM routing, restore throttle, remove credential fallback, and expose device/session truth.

### Phase 2 — Offline workflow correctness

Repair Offline Earn capture, queue eligibility, and sync reconciliation.

### Phase 3 — Operational UI correctness

Fix supervisor materialization visibility, pilot health, approvals, branch policy, and adjustments.

### Phase 4 — Release evidence

Add the live E2E, clean deployment noise, and reconcile the OpenSpec tracker.

## Risks

- Session/device contract changes may require client regeneration and test fixture updates.
- Offline queue fixes may reveal additional backend validation that should be handled explicitly, not hidden in the UI.
- SYSTEM handling must be careful not to accidentally break machine workflows that are not human UI sessions.

## Validation

- Targeted unit tests for auth, routing, offline save, and queue eligibility.
- Integration/e2e coverage for device login and offline reconciliation.
- Contract tests for session/device fields, branch receipt-week policy, and supervisor read-only capabilities.
- CI and release evidence checks for exact-head status and OpenSpec reconciliation.
