## Why

`docs/repo_review_51.md` is not a generic frontend review; it is a line-by-line inventory of product gaps where the backend already exists but the UI still behaves like a demo, placeholder shell, or incomplete workflow.

This v2 change deliberately maps those gaps in the same order as the review:

1. Cashier workflow is incomplete: lookup is only an input, lookup does not prefill earn/redeem, customer balance/history are not shown, offline capture is detached, and sync has no real queue screen.
2. Customer workflows are missing: search, detail, create, edit, status, balance, and transaction history are absent.
3. Card workflows are missing: lookup exists in backend but not in the cashier UI; assignment, replacement, and blocking/unblocking are not exposed as real flows.
4. Earn and redeem are API-wired but UX-incomplete: they do not show enough customer/card/policy context, consequence preview, stable draft state, or rich result detail.
5. Public configuration is wasted: branch identity, tenant identity, timezone, policy values, and offline-redemption availability are available but not used as shell context.
6. Offline sync is not a workflow: the local queue exists, but there is no queue screen, batch submission flow, per-record reconciliation, retry handling, or rejection review.
7. Supervisor workspaces are still placeholders: transaction search/detail, reversal, approvals, fraud, and reports need real detail-led screens, not text cards.
8. Admin operations are partial: manual adjustments, user creation, device creation, branch management, audit, and pilot health all need full workflows.
9. Some backend capabilities should remain backend-only: deprecated receipt endpoints and worker internals should not be reintroduced as UI just because the review mentioned the domain.
10. The UI still contains fake affordances: demo metrics, no-op buttons, and descriptive cards that look actionable without actually doing anything.
11. Contract and quality gaps remain: the frontend needs route structure, accessibility, visual regression, contract adapters, and end-to-end coverage that prove each workflow is actually usable.

This change exists to close those gaps exhaustively and prevent future implementation from stopping at “API wired” instead of “employee workflow complete.”

## What Changes

- Replace placeholder dashboard cards with route-backed cashier, supervisor, and admin workspaces.
- Implement cashier lookup so it resolves customer identity, card status, balance, expiring credit, and policy context before earn/redeem.
- Add cashier customer detail access, including balance and recent transaction history, from lookup and transaction outcomes.
- Build customer search, detail, create, edit, and status flows, plus visible balance and transaction history surfaces.
- Build card lookup, assignment, replacement, blocking/unblocking, and status workflows with deliberate confirmation states.
- Rework earn and redeem into review-and-confirm flows that show customer/card context, policy context, computed limits, and rich result detail.
- Persist stable transaction draft state and idempotency context so refreshes and retries do not create a new logical transaction.
- Turn offline capture into a real reconciliation flow with a queue screen, batch submission, per-record results, retryability, and rejection reason visibility.
- Add supervisor transaction search/detail, reversal, approvals, fraud, and report workspaces with meaningful filters, drill-down, freshness, and export behavior.
- Add admin workflows for manual adjustments, staff users, devices, branches, audit, and pilot operations, including create/edit/status/rotation flows where supported.
- Surface public configuration in the shell so branch, tenant, timezone, policy, and offline-redemption context are visible where decisions depend on them.
- Remove or hide demo metrics, no-op buttons, and fake summary cards; where a control looks actionable it must be real.
- Keep deprecated or backend-only surfaces out of the frontend unless a separate contract change authorizes them.
- Add accessibility, visual-regression, and e2e coverage for each persona and each major workflow branch.

## Capabilities

### New Capabilities

- `cashier-workflow-completion`: lookup, earn, redeem, customer detail, and sync become one coherent cashier journey.
- `customer-management-workflow`: search, list, detail, create, edit, status, balance, and transaction history are available in the UI.
- `card-management-workflow`: lookup, assign, replace, block/unblock, and status changes are visible and deliberate.
- `transaction-review-workflow`: search, detail, reversal, adjustment, approvals, fraud, and report drill-down are workflow screens, not labels.
- `operations-and-reporting-workflow`: live reports, freshness, export, and pilot health replace summary-only placeholders.
- `role-aware-shell-navigation`: the shell reflects role, branch, tenant, and capability context.
- `offline-sync-reconciliation`: offline records can be reviewed and submitted as authoritative batches with per-record outcomes.
- `truthful-ui-state`: demo metrics, no-op buttons, and fake cards are eliminated or converted into real behavior.

### Modified Capabilities

- `generated-openapi-consumption`: the frontend continues to use generated contracts as the data source of truth.
- `frontend-design-system-implementation`: the design system is used to build real workflows, not decorative shells.
- `policy-context-rendering`: policy, branch, tenant, timezone, and offline availability are shown where they change user decisions.
- `accessible-workflow-screens`: all workflow screens preserve keyboard, screen-reader, and loading/error states.
- `frontend-quality-governance`: tests, visual regression, contract-sync checks, and e2e proofs must demonstrate usability.

## Impact

Proposal-time GitNexus analysis was run on the backend contract anchors this change relies on:

- `ConfigurationController` — LOW risk, 3 impacted symbols, 1 direct dependant.
- `OfflineSyncController` — LOW risk, 3 impacted symbols, 1 direct dependant.

The rest of the change is primarily new frontend surface area in `apps/web`. Any backend response-shape gap discovered during implementation should be split into a separate contract change rather than hidden in UI code.

## Rollout / Verification

- Deliver the work in persona slices: shell, cashier, customer/card, sync, supervisor, admin, then quality hardening.
- Verify the cashier route end-to-end: lookup → prefill → earn/redeem draft → confirm → result → customer detail.
- Verify customer and card routes expose every supported backend action and hide unsupported ones.
- Verify offline queue batches show authoritative per-record outcomes and preserve local evidence.
- Verify transaction reversal, approvals, fraud, and report drill-down are actionable rather than descriptive.
- Verify admin users, devices, branches, audit, and pilot health are live-data workflows.
- Verify no fake metrics or no-op buttons remain visible.
- Run `npm run openspec:validate` plus the frontend lint, typecheck, unit, accessibility, visual-regression, and e2e gates before closing the change.

## Open Questions

1. Should cashier, supervisor, and admin routes be fully separate shells or capability-aware nested routes under one shell?
2. Which draft forms must persist across refresh: earn, redeem, adjustment, reversal, and offline sync?
3. Are there any presentation gaps that require backend contract changes, or can they be solved with frontend adapters only?
4. Should pilot health be admin-only or also available in a read-only operator surface?
