## Why

`docs/repo_review_52.md` is a gap inventory, not a general frontend review. It shows the frontend is broadly built but still has a set of concrete failures that can mislead operators or block safe completion:

- pilot health can render the wrong operational state because it reads the wrong fields;
- reports can use the wrong contract shape and never produce a real downloadable file;
- redeem still confuses available balance with basket amount and can allow over-limit submission;
- cashier users still see mutation controls they cannot execute, while supervisors lack the routes they should use;
- card replacement uses the wrong payload shape and suppresses type safety;
- offline earn capture exists only as a consumer path, not a producer path;
- drafts/idempotency are stable only within one mount, not across refresh/retry;
- approvals and fraud still substitute generic reasons and lack the filters/pagination needed to act safely;
- branch forms ignore receipt-week-start context;
- adjustments lack the customer/balance consequence preview they need;
- audit, users, devices, pilot ops, and transaction reversal still need truthful presentation details.

This change is not about new backend authority. It is about making the existing contract truthful, role-aware, and safe to use.

## What Changes

- Make shell navigation role-aware and human-safe, including SYSTEM handling.
- Correct cashier lookup so supported identifier behavior matches the contract and the result is reusable for earn, redeem, and customer detail.
- Rebuild redeem so available balance is context only, basket amount remains user-entered, and over-limit submission is blocked before submit.
- Persist logical drafts and idempotency across refresh/retry for the same money-moving intent.
- Add offline earn capture so failed submissions can become queued records with the same logical operation identity.
- Split customer/card access so cashier gets read-only review and supervisor/admin gets mutation workflows.
- Fix card replacement to use the generated DTO shape and eliminate `as any` request suppression.
- Make offline sync use authenticated device context and show authoritative record states, outcomes, and rejection reasons.
- Fix pilot health and report mapping to use the exact backend contract fields, including pilot operations summary shape.
- Make export perform a real file download or save action.
- Remove generic reason substitution from approvals and fraud decisions.
- Add fraud/approval filters and pagination so queues are usable beyond the first few rows.
- Preview the correct transaction amount in reversals and the balance impact in manual adjustments.
- Respect receipt-week-start configuration in branch create/update flows.
- Replace demo or placeholder UI state with live data or hidden controls.
- Add route, accessibility, visual-regression, and e2e coverage for every corrected persona flow.

## Capabilities

### New Capabilities

- `role-aware-shell-navigation`: the shell exposes only the route set and controls the authenticated role can actually use.
- `cashier-workflow-correction`: lookup, earn, redeem, customer detail, and sync behave as one coherent cashier flow.
- `customer-card-role-splitting`: read-only cashier review is separated from supervisor/admin mutation workflows.
- `offline-capture-producer`: failed earn submissions can enter the offline queue instead of disappearing.
- `financial-draft-persistence`: stable idempotency and draft state survive refreshes for the same logical action.
- `truthful-operational-panels`: pilot health, pilot ops summary, reports, and exports render the published backend contract exactly.
- `supervisor-decision-honesty`: approvals, fraud, and reports only expose supported context and reasons.
- `admin-consequence-preview`: adjustments, branches, users, devices, and audit actions show the consequence or live state before submission.

### Modified Capabilities

- `generated-openapi-consumption`: the frontend continues to use the generated client as the source of truth.
- `accessible-workflow-screens`: workflow screens keep keyboard, screen-reader, and loading/error behavior.
- `frontend-quality-governance`: tests must prove that route, role, export, and workflow state are truthful.
- `policy-context-rendering`: branch identity, tenant, timezone, receipt-week-start, and offline availability are shown where they matter.

## Impact

Proposal-time GitNexus analysis was run on the main frontend anchors this change touches:

- `AppShell` — LOW risk, 2 impacted symbols, 2 direct dependants.
- `PilotHealthPanel` — LOW risk, 3 impacted symbols, 3 direct dependants.
- `ReportsWorkspace` — LOW risk, 2 impacted symbols, 2 direct dependants.
- `EarnTransactionForm` — LOW risk, 1 impacted symbol, 1 direct dependant.
- `RedeemTransactionForm` — LOW risk, 1 impacted symbol, 1 direct dependant.

Route/page wrappers in `apps/web/app/(shell)` are mostly unindexed by GitNexus, so route coverage must be proven by direct frontend tests as well as the indexed symbol checks above.

## Rollout / Verification

- Land shell and role gating first so cashier, supervisor, and admin routes stop leaking each other’s controls.
- Correct the high-integrity cash/ops mappings next: redeem, lookup, pilot health, reports, pilot ops summary, card replacement, and export.
- Add offline earn capture and persistent draft/idempotency handling before expanding the queue UI.
- Move mutation controls out of cashier and into supervisor/admin where the backend already authorizes them.
- Clean up approvals, fraud, filters, pagination, branch defaults, and consequence previews only after the route split is in place.
- Run `npm run openspec:validate` plus frontend lint, typecheck, unit, accessibility, visual-regression, and route/e2e coverage before closing the change.

## Open Questions

1. Should receipt-based lookup remain visible if the current backend path only supports card serial lookup?
2. Which financial drafts must persist across refresh: earn, redeem, reversal, adjustment, and offline sync submission?
3. Should pilot health remain admin-only, or also appear in a read-only operator surface?
4. Do report export and pilot summary need any backend contract clarification, or are the current generated responses sufficient once the frontend stops guessing field names?
