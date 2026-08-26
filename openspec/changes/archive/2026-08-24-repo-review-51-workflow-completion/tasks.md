## 1. Scope and shell structure

- [ ] 1.1 Replace placeholder workflow cards with route-backed workspace entry points.
- [ ] 1.2 Add role-aware navigation for cashier, supervisor, and admin users.
- [ ] 1.3 Surface public branch identity, tenant identity, timezone, policy values, and offline-redemption availability in the shell.
- [ ] 1.4 Add shared loading, empty, error, unauthorized, and not-found states for workflow routes.

## 2. Cashier workflow

- [ ] 2.1 Implement card lookup so cashier can scan or type a card/receipt and immediately see identity, card status, customer balance, expiring credit, and policy context.
- [ ] 2.2 Rebuild earn as a review-and-confirm flow with customer/card context prefilled from lookup, expected credit, policy context, and a rich success view.
- [ ] 2.3 Rebuild redeem as a review-and-confirm flow with available balance, calculated maximum redemption, policy context, and a rich success view.
- [ ] 2.4 Persist stable draft state and reuse idempotency for the same logical transaction.
- [ ] 2.5 Add cashier customer detail access from lookup, earn, and redeem results, including balance and recent transaction history.
- [ ] 2.6 Ensure offline capture is visible inside the cashier workflow, not only as a counter badge, and can navigate into the sync queue.

## 3. Customer and card management

- [ ] 3.1 Add customer search and list views.
- [ ] 3.2 Add customer detail, create, edit, status-change, balance, and transaction-history workflows.
- [ ] 3.3 Add card lookup, assignment, replacement, blocking/unblocking, and status-change workflows.
- [ ] 3.4 Ensure customer and card state changes are confirmed with the correct role-based affordances.

## 4. Offline sync

- [ ] 4.1 Add a real sync queue screen for local offline earn records with filters and a clear pending/synced/retryable/rejected state model.
- [ ] 4.2 Submit batches to the backend and display per-record outcomes.
- [ ] 4.3 Expose retryable vs rejected states and surface rejection reasons.
- [ ] 4.4 Preserve local evidence when a batch partially succeeds or fails.

## 5. Supervisor workflow

- [ ] 5.1 Add transaction search and transaction detail views.
- [ ] 5.2 Add reversal confirmation with original transaction context and consequence preview.
- [ ] 5.3 Expand approvals into a detail-led review flow with customer, receipt, policy, audit, and reason context, replacing hard-coded decisions.
- [ ] 5.4 Expand fraud review into a detail-led review flow with evidence, filters, branch/customer/date context, and decision context.
- [ ] 5.5 Expand reports into selectable, filterable, exportable workspaces with freshness awareness, materialization state, and admin refresh.

## 6. Admin workflow

- [ ] 6.1 Add manual adjustment workflow with consequence preview and confirmation.
- [ ] 6.2 Add staff user creation and user role/status management, while excluding impossible human roles from the picker.
- [ ] 6.3 Add device creation, attestation/rotation affordances where applicable, and device status management.
- [ ] 6.4 Add branch create/edit views if the backend contract already supports them, and surface branch identity in the shell.
- [ ] 6.5 Add audit trail and pilot operations summary views, replacing any demo-based pilot-health panel.

## 7. Truthful UI state

- [ ] 7.1 Replace all demo metrics with live backend data or hide them until supported, including pilot-health cards and report summaries.
- [ ] 7.2 Remove no-op buttons or wire them to real navigation/actions, including workspace buttons that currently only describe future behavior.
- [ ] 7.3 Ensure empty states explain what the user can actually do next.
- [ ] 7.4 Ensure loading and error states are actionable rather than decorative.

## 8. Contract alignment and quality gates

- [ ] 8.1 Add any minimal presentation adapters needed to consume the current generated client cleanly.
- [ ] 8.2 Split any true backend contract gap into a separate follow-up change instead of inventing UI behavior.
- [ ] 8.3 Add route, accessibility, and workflow regression coverage for the new screens.
- [ ] 8.4 Add visual-regression coverage for the major persona workspaces.
- [ ] 8.5 Add end-to-end tests for lookup -> earn/redeem, customer/card management, sync, reversal, and reporting.
- [ ] 8.6 Run `npm run openspec:validate` and the relevant frontend test commands before closing the change.
