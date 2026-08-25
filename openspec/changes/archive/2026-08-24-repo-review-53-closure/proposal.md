## Why

`docs/repo_review_53.md` shows the branch is broadly complete but still has a set of release-blocking correctness, security, and contract issues. The remaining problems are not feature absence; they are trust, authorization, and end-to-end workflow mismatches:

- SYSTEM sessions can still reach human admin surfaces.
- A committed admin-password fallback remains in live E2E coverage.
- Auth throttling is weaker than the production baseline.
- Device-bound authentication is not fully exposed to the frontend, so offline sync cannot rely on a truthful session/device contract.
- Offline Earn can claim success even when local persistence fails, and created records are not guaranteed to enter the queue or survive backend validation.
- Receipt-week-start is still not captured in admin branch workflows even though offline sync validates against it.
- Supervisor surfaces still hide legitimate read-only capabilities while over-constraining operational queues.
- Pilot health, approvals, reports, and adjustments still have correctness and usability gaps.
- Release evidence is incomplete, duplicate deployment status is misleading, and the OpenSpec tracker is out of sync with reality.

This change is about closing those gaps without changing ledger authority or inventing new backend behavior.

## What Changes

- Make shell and routing truly role-aware, with SYSTEM denied from interactive human navigation.
- Remove the committed admin credential fallback from live E2E and require explicit secure configuration.
- Restore the production auth throttle policy and keep test convenience out of the runtime policy.
- Expose the authenticated device/session contract needed for POS login and offline sync, including a usable `deviceId` in session context.
- Fix Offline Earn so it only reports local save success when persistence succeeds, and ensure queued records carry valid cashier, branch, device, receipt-week, and idempotency data.
- Align the offline queue states and batch submission rules so saved records are actually eligible for sync.
- Narrow or implement receipt lookup truthfully instead of advertising unsupported behavior.
- Allow Supervisor to view materialization state while keeping refresh/admin actions restricted.
- Correct pilot health semantics, approval queue pagination/filtering, and report/adjustment presentation details.
- Expose receipt-week-start-day in branch create/update forms.
- Add a real live E2E covering device login, offline capture, reconnect, and reconciliation.
- Remove duplicate deployment-status noise and reconcile OpenSpec/workflow tracking with the actual branch state.

## In Scope

1. **Authentication and session trust**
   - SYSTEM must not be treated as a human admin session.
   - Live E2E must not ship with a reusable admin password fallback.
   - Production auth throttling must match the real policy baseline.
   - Device-bound login must surface the real session/device context to the frontend.

2. **Offline Earn and sync correctness**
   - Offline Earn must not claim local success on failed IndexedDB/local persistence writes.
   - Offline records must use valid cashier, branch, device, receipt-week, and idempotency values.
   - Sync queue eligibility and retry behavior must accept the same states the UI can create.
   - Batch reconciliation must preserve record identity and report server rejection reasons truthfully.

3. **Supervisor/admin correctness**
   - Supervisor should see authorized read-only operational state, including materialization state.
   - Admin-only refresh actions remain restricted.
   - Approval queue, pilot health, reports, and adjustments should render honest values and usable controls.
   - Branch forms must expose receipt-week-start-day.

4. **Release readiness**
   - Add a real end-to-end offline earn/sync test.
   - Remove misleading duplicate deployment status.
   - Reconcile OpenSpec tracker items with the implemented state.

## Non-goals

- No changes to ledger authority, append-only guarantees, or financial policy rules.
- No GraphQL or alternate backend architecture.
- No front-end trust of balances, roles, or approvals beyond authenticated backend/session data.
- No new demo-only shortcuts for live E2E or production auth policy.
- No hand-maintained contract mirror where the generated client already models the response.

## Design Decisions

### 1. Role and SYSTEM handling

The frontend shell must treat SYSTEM as a machine actor, not an interactive human role. If SYSTEM authenticates at all, it should not be routed into admin UI flows. Human admin controls should be hidden unless the authenticated role can actually use them.

### 2. Auth and device binding

Offline sync depends on a real device/session contract, not a fabricated browser-local identifier. The login/session API must expose the device context that the backend already uses for authorization, and the frontend must persist and reuse that same device identity when building offline records and sync batches.

### 3. Offline Earn truthfulness

A local save failure is not a successful offline capture. The Earn flow must inspect local persistence results, surface failure, and only present queued/offline success when a valid record was actually written. Queue eligibility must match the batch API states so records are never stranded.

### 4. Branch policy context

Receipt-week-start-day is operational policy, not decoration. Branch administration must render and persist it so offline receipts and reconciliation can be validated against the same branch policy the backend enforces.

### 5. Supervisor visibility

Supervisor users should be able to read the operational state the backend authorizes, including materialization state, while refresh or mutation actions stay admin-only.

### 6. Honest release evidence

The review’s remaining gaps include CI certainty, deployment context, and OpenSpec drift. This change should add the missing live offline E2E, remove misleading duplicate deployment status, and reconcile the closure tracker so the plan reflects reality.

## Rollout Strategy

1. Fix auth/session/SYSTEM handling and restore the production throttle policy.
2. Expose the device/session contract and repair Offline Earn record creation and queue eligibility.
3. Correct branch policy, supervisor visibility, pilot health, approvals, reports, and adjustments.
4. Add the live offline E2E and reconcile release evidence and OpenSpec tracking.
5. Validate with lint, typecheck, targeted unit/e2e coverage, and the exact-head CI gate.

## Verification Strategy

- Shell/navigation tests proving SYSTEM cannot reach human admin UI.
- Auth tests proving throttle matches the production policy and live E2E requires explicit credentials.
- Session/device tests proving device context is exposed and reused.
- Offline Earn tests proving local persistence failures do not masquerade as success and that queued records are valid.
- Sync tests proving batch eligibility, retry, and rejection handling are truthful.
- Supervisor/admin tests covering materialization state, pilot health, approvals, reports, adjustments, and receipt-week-start-day.
- One live e2e flow covering device login, card lookup, Earn, offline save, reconnect, batch sync, and backend confirmation.
- Release evidence checks to remove duplicate deployment confusion and reconcile the OpenSpec tracker.
