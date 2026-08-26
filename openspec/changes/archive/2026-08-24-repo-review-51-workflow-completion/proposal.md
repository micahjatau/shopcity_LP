## Why

`docs/repo_review_51.md` shows that the ShopCity backend is materially ahead of the usable frontend. The design system and shell exist, but the product still behaves like a partially wired demo in many places:

- cashier lookup is present only as a text input, and lookup does not prefill earn/redeem with the resolved customer/card context;
- customer search/detail/register/edit/status flows are missing, including customer balance and transaction history views;
- card lookup, assignment, replacement, and blocking workflows are not exposed;
- earn and redeem submit to the backend but do not present enough customer/policy/result context;
- offline queueing exists locally but does not become a usable sync workflow;
- supervisor transaction, reversal, adjustment, fraud, and report workspaces are incomplete, including filters, freshness, export, and detail drill-down;
- admin operations, users, devices, branches, audit, and pilot health views are partial or still demo-driven;
- public configuration is available in the backend but not yet used as shell context for branch identity, timezone, policy, or offline-redemption availability;
- several buttons and metrics imply functionality that does not exist.

This change is not about inventing new business rules. It is about converting already-implemented backend capabilities and public contracts into complete employee workflows.

## What Changes

- Replace card-style placeholder screens with route-backed workspaces for cashier, supervisor, and admin roles.
- Implement cashier card lookup that resolves identity, card status, balance, and policy context before earn/redeem actions.
- Build customer search, customer detail, customer create/edit/status, customer balance, transaction history, and customer-card linking flows.
- Build card lookup, assignment, replacement, blocking/unblocking, and status management flows.
- Rework earn and redeem into review-and-confirm workflows that show customer context, card context, policy context, expected outcome, and rich success/failure results.
- Add stable transaction draft state and idempotency reuse so refreshes and retries do not create a new logical transaction.
- Turn the offline queue into a real batch-sync screen with per-record reconciliation, retry handling, and rejection reasons.
- Add supervisor workspaces for transaction search/detail, reversal, approvals, fraud, and reports, including the filters and drill-down context needed to act on each item.
- Add admin workspaces for manual adjustments, users, devices, branches, audit, and pilot operations, with real create/edit/status/rotation flows instead of summary-only cards.
- Replace fake metrics, demo data, and no-op buttons with live data, hidden controls, or real navigation, including the pilot-health demo surface and any controls that only looked functional.
- Use public configuration to drive shell context such as branch identity, timezone, policy values, and offline-redemption availability.
- Preserve the generated OpenAPI client as the frontend data source and only add contract adapters where the existing response shape is insufficient for a complete UI.
- Expand accessibility, visual-regression, and end-to-end coverage so each workflow is demonstrably usable rather than merely wired.

## Capabilities

### New Capabilities

- `cashier-workflow-completion`: lookup, earn, redeem, customer detail, and sync become a single usable cashier flow.
- `customer-management-workflow`: users can search, view, create, edit, and status-change customers from the UI.
- `card-management-workflow`: card assignment, replacement, blocking, and lookup become first-class UI workflows.
- `transaction-review-workflow`: transaction search/detail, reversal, and adjustment flows are available to the right roles.
- `operations-and-reporting-workflow`: approvals, fraud, reports, and pilot health use live backend data and meaningful filters/actions.
- `role-aware-shell-navigation`: shell navigation reflects role, branch, and capability context rather than static feature cards.
- `offline-sync-reconciliation`: local offline records can be reviewed and submitted as authoritative sync batches with per-record outcomes.
- `truthful-ui-state`: demo metrics, fake summary cards, and no-op buttons are removed or replaced with real behavior.

### Modified Capabilities

- `generated-openapi-consumption`: the frontend consumes existing backend contracts as the source of truth and avoids hand-maintained duplicate DTOs.
- `frontend-design-system-implementation`: the approved design system is used to compose real workflows, not just polished shells.
- `policy-context-rendering`: policy, branch, timezone, and offline availability context is surfaced where it changes user decisions.
- `accessible-workflow-screens`: all workflow screens must preserve keyboard, screen-reader, and loading/error-state behavior.
- `frontend-quality-governance`: tests, visual regression, and contract-sync checks must prove the workflow surfaces remain functional.

## Impact

Proposal-time GitNexus analysis was run on the existing backend contract anchors that this change leans on:

- `ConfigurationController` — LOW risk, 3 impacted symbols, 1 direct dependant. Public configuration is a small but important shell-context anchor.
- `OfflineSyncController` — LOW risk, 3 impacted symbols, 1 direct dependant. The sync batch surface is narrow but must stay stable for the new UI.

The rest of the change is primarily new frontend surface area in `apps/web`, so indexed backend blast radius is expected to stay low unless a missing contract forces a follow-up API change.

## Rollout / Verification

- Ship the frontend in persona-based slices rather than one giant dashboard rewrite.
- Verify cashier lookup -> earn/redeem -> result -> customer detail flows end to end.
- Verify customer and card management screens can reach every supported backend action.
- Verify offline queue batches show authoritative per-record sync results and retry states.
- Verify supervisor transaction detail can lead to reversal, approval, and fraud actions where allowed.
- Verify reports, audit, users, devices, and branches render real data and not demo content.
- Remove or hide any remaining no-op buttons before marking the change complete.
- Run `npm run openspec:validate` plus frontend lint, typecheck, unit tests, accessibility tests, visual regression, and end-to-end coverage before closing the change.
- If a backend response shape is genuinely insufficient for a workflow, split that gap into a separate contract change instead of inventing behavior in the UI.

## Open Questions

1. Should the first release use separate routes for cashier/supervisor/admin workspaces, or a single shell with capability-aware tabs and nested routes?
2. Which workflows should persist draft state across refreshes: earn, redeem, manual adjustment, reversal, and offline sync?
3. Are there any backend response fields that need a contract update for detail views, or can the UI derive all missing presentation state locally?
4. Should pilot health remain admin-only, or also appear in a read-only operator status surface?
