## 1. Shell and route structure

- [ ] 1.1 Replace placeholder dashboard cards with route-backed workspace entry points.
- [ ] 1.2 Add cashier, supervisor, and admin navigation that reflects role and capability.
- [ ] 1.3 Surface tenant, branch identity, timezone, policy values, and offline-redemption availability in the shell.
- [ ] 1.4 Add loading, empty, error, unauthorized, and not-found states for all workspace routes.
- [ ] 1.5 Ensure route guards do not expose features the user cannot perform.

## 2. Cashier workflow

- [ ] 2.1 Implement lookup for card serials and receipt identifiers.
- [ ] 2.2 Show customer identity, card status, customer balance, expiring credit, and policy context from lookup.
- [ ] 2.3 Prefill earn and redeem drafts from lookup results.
- [ ] 2.4 Rebuild earn as review → confirm → success with computed credit, approval/SMS context, and customer detail links.
- [ ] 2.5 Rebuild redeem as review → confirm → success with available balance, maximum allowed redemption, and resulting balance.
- [ ] 2.6 Persist logical drafts and reuse idempotency across refresh/retry.
- [ ] 2.7 Provide a cashier customer detail view with balance and recent transaction history.
- [ ] 2.8 Make offline capture visible from the cashier route and link it to sync.

## 3. Customer workflows

- [ ] 3.1 Add customer search and list views.
- [ ] 3.2 Add customer detail with balance, linked cards, and transaction history.
- [ ] 3.3 Add customer create, edit, and status-change forms.
- [ ] 3.4 Ensure role-based visibility for customer creation and status changes.

## 4. Card workflows

- [ ] 4.1 Add card lookup with card/customer/balance context.
- [ ] 4.2 Add card assignment flow.
- [ ] 4.3 Add card replacement flow with deliberate confirmation.
- [ ] 4.4 Add block/unblock and status-change controls.
- [ ] 4.5 Ensure card state changes are reflected immediately in customer and card views.

## 5. Offline sync

- [ ] 5.1 Add a real sync queue for local offline earn records.
- [ ] 5.2 Submit batches and show confirmed, pending-approval, rejected, and retryable results.
- [ ] 5.3 Surface rejection reasons and retry actions.
- [ ] 5.4 Preserve local evidence when a batch partially succeeds or fails.

## 6. Supervisor workspaces

- [ ] 6.1 Add transaction search and transaction detail.
- [ ] 6.2 Add reversal confirmation with original transaction context and consequence preview.
- [ ] 6.3 Expand approvals into detail-led decision screens with customer, receipt, policy, audit, and reason context.
- [ ] 6.4 Expand fraud review into detail-led screens with filters, evidence, and decision context.
- [ ] 6.5 Expand reports into selectable, filterable, exportable workspaces with freshness awareness, materialization state, and admin refresh.

## 7. Admin workspaces

- [ ] 7.1 Add manual adjustment workflow with consequence preview and confirmation.
- [ ] 7.2 Add staff user creation and user role/status management.
- [ ] 7.3 Exclude human-ineligible roles from the user picker.
- [ ] 7.4 Add device creation, update, and status management.
- [ ] 7.5 Add branch create/edit views where the backend supports them.
- [ ] 7.6 Add audit trail and pilot operations summary views.
- [ ] 7.7 Replace the pilot-health demo panel with live operational signals.

## 8. Truthful UI state

- [ ] 8.1 Replace demo metrics with live data or hide them until supported.
- [ ] 8.2 Remove no-op buttons or wire them to real actions.
- [ ] 8.3 Replace descriptive cards with actual navigation or hidden placeholders.
- [ ] 8.4 Ensure empty states explain what the user can do next.
- [ ] 8.5 Ensure loading and error states are actionable rather than decorative.

## 9. Contract alignment and quality gates

- [ ] 9.1 Add minimal adapters only where the current generated client is insufficient for safe presentation.
- [ ] 9.2 Split any true backend contract gap into a separate follow-up change instead of inventing behavior in the UI.
- [ ] 9.3 Add route, accessibility, and workflow regression coverage for the new screens.
- [ ] 9.4 Add visual-regression coverage for cashier, customer/card, sync, supervisor, and admin states.
- [ ] 9.5 Add e2e tests for lookup → earn/redeem, customer/card management, sync, reversal, approvals, fraud, reports, and admin operations.
- [ ] 9.6 Run `npm run openspec:validate` and the relevant frontend test commands before closing the change.
