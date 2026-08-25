## Context

Review 51 is not asking for more backend capability first. It is asking for the existing backend to become usable through the frontend. The design goal is therefore to convert backend endpoints, public configuration, and generated contracts into task-oriented employee workflows that match the approved design system.

## Goals

- Make the cashier path genuinely usable from lookup through earn/redeem and sync.
- Expose customer and card administration through the UI.
- Turn supervisor and admin screens into real workspaces, not descriptive cards.
- Replace demo metrics, fake summaries, and no-op buttons with truthful behavior.
- Keep the backend contract authoritative and avoid duplicating business logic in the frontend.
- Keep accessibility, offline support, and visual consistency intact while the route structure changes.

## Non-Goals

- No financial rule redesign.
- No GraphQL or alternate data layer.
- No new backend authority for money or approvals.
- No invention of UI behavior that is not supported by the current contract or a separately approved follow-up change.
- No permanent dependence on hard-coded demo data.

## Key Decisions

### 1. Workflow-first route structure

Use real workflows as the organizing unit instead of large generic dashboard pages.

- Cashier routes should support lookup, earn, redeem, customers, and sync.
- Supervisor routes should support transactions, approvals, fraud, reports, and customer/card review.
- Admin routes should support operations, adjustments, users, devices, branches, audit, and reports.

This keeps each screen focused on a business task and makes testing easier.

### 2. Shared contract-driven data layer

The frontend should continue to consume the generated client as the source of truth.

- Query and mutation hooks should wrap generated API calls.
- Presentation components should not duplicate backend DTOs.
- Any contract gap should be surfaced explicitly instead of hidden in ad hoc local mapping.

### 3. Stable draft state for money-moving actions

Earn, redeem, reversal, adjustment, and offline sync need draft state that survives refreshes long enough to complete safely.

- Stable idempotency keys should be reused for the same logical draft.
- Drafts should retain enough information to render a review screen before submission.
- The UI should never silently replace a pending financial action with a new one.

### 4. Public configuration is shell context

Use public config to drive branch identity, timezone, policy context, and offline availability in the shell.

- If the backend already knows the tenant/branch/policy context, the shell should show it.
- Configuration should be displayed only where it helps the employee make a decision.
- No workflow should rely on hidden hard-coded assumptions when public config exists.

### 5. Offline sync is a reconciliation workflow

Offline capture is not just a counter.

- Local records must be visible as pending, synced, rejected, or retryable.
- Batch submission should show the result of each record.
- The user should be able to retry or inspect a failed batch without losing the local evidence.

### 6. Remove fake affordances

If a button, card, or metric looks actionable, it must either work or not be rendered yet.

- Demo metrics should be replaced with live data or hidden.
- Buttons without handlers should be removed.
- Descriptive shells should become actual routes only when a real workflow exists.

## Phased Implementation Plan

### Phase 1: Shell and navigation

- Add role-aware route groupings and navigation.
- Surface public configuration in the shell.
- Replace placeholder cards with route entry points.
- Establish shared loading, empty, error, and unauthorized states.

### Phase 2: Cashier flow

- Add card lookup and customer context.
- Rebuild earn and redeem around review/confirm/result states.
- Show policy-derived context before submission.
- Persist drafts and idempotency through retries.

### Phase 3: Customer and card management

- Add customer search/detail/create/edit/status.
- Add card lookup/assign/replace/status actions.
- Ensure customer/card state is visible before mutation.

### Phase 4: Sync and supervisor workspaces

- Add offline queue review and batch sync reconciliation.
- Add transaction search/detail and reversal.
- Expand approvals, fraud, and reports into detail-oriented workspaces.

### Phase 5: Admin and operations

- Add adjustments, users, devices, branches, audit, and pilot-health surfaces.
- Replace placeholder operational cards with real data.
- Align the admin surface with the same contract-driven UI primitives.

### Phase 6: Quality hardening

- Add accessibility and keyboard regression coverage.
- Add visual-regression baselines for the new route structure.
- Add e2e coverage for each persona workflow.
- Add contract-sync checks for any workflow-specific response adapters.

## Risks / Trade-offs

- The route refactor will touch many files, but it is mostly additive and can be staged by persona.
- Some screens may reveal contract gaps in response shapes; those should be split into separate API changes if the frontend cannot derive the needed presentation state safely.
- Replacing no-op buttons may expose unfinished product areas that should be hidden until complete; that is preferable to misleading users.
- Offline sync and draft persistence add UI complexity, but they are necessary to keep money-moving actions safe.

## Migration / Rollout Strategy

1. Add the shell/navigation scaffolding and keep old routes working during the transition.
2. Land cashier lookup and earn/redeem first because they unlock the highest-frequency workflows.
3. Add customer/card management and offline reconciliation next.
4. Replace supervisor/admin placeholder workspaces one by one.
5. Remove legacy demo metrics and no-op buttons only after replacements are live.
6. Freeze the final route map and lock it down with tests once the workflow set is complete.

## Verification Strategy

- Frontend lint, typecheck, unit tests, and route-level integration tests.
- Accessibility checks for keyboard navigation, focus order, and screen-reader labels.
- Visual regression for shell, cashier, supervisor, and admin states.
- End-to-end coverage for lookup -> earn/redeem, customer management, offline sync, transaction reversal, and reporting.
- Contract generation checks whenever a workflow depends on a new or adjusted API shape.
