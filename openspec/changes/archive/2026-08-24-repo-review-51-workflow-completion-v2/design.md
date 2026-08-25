## Context

Review 51 identifies a frontend that is mostly wired to the backend at the API level but still fails as a product because many screens are summaries, placeholders, or static examples instead of real workflows. This v2 keeps the backend authority unchanged and focuses entirely on converting every reported subgap into a usable route or component.

## Goals

- Close every review 51 frontend gap in the same order the review presents them.
- Make the cashier path flow from lookup through earn/redeem and sync without re-entering context.
- Make customer and card administration task-oriented instead of form fragments.
- Make supervisor and admin workspaces detail-led and action-led.
- Replace demo artifacts with live data, hidden states, or actual navigation.
- Keep accessibility, route structure, and quality gates strong during the refactor.

## Non-Goals

- No change to ledger authority, balance math, approval policy, or offline financial rules.
- No GraphQL or alternate financial data authority.
- No introduction of fake demo data to replace missing backend fields.
- No reintroduction of deprecated receipt endpoints as primary UI flows.
- No permanent dependence on hand-maintained DTO copies.

## Review-Driven Design Decisions

### 1. Cashier is a workflow, not a panel

Lookup must be the entry point for earn, redeem, and customer detail. The workflow should prefill the resolved card/customer context and show balance, expiring credit, and policy values before any money-moving action.

### 2. Customer and card management are first-class

Customer and card pages should exist because they are part of the operational flow, not because admin screens are nice to have. If the backend supports search, detail, create, edit, status, or replacement, the UI should expose them as real tasks.

### 3. Offline sync is reconciliation

Pending offline records must be visible, batch-submittable, and individually reconcilable. A counter badge is not a sync workflow.

### 4. Supervisor workspaces need detail and consequence

Transactions, reversals, approvals, fraud, and reports must show the context needed to decide, not just the fact that a record exists.

### 5. Admin operations must be live and truthful

Users, devices, branches, audit, and pilot health need live data and must not present demo numbers as operational truth.

### 6. Public config is shell context

Branch, tenant, timezone, policy values, and offline-redemption availability should be rendered where they guide decisions, not buried in a settings page.

### 7. No fake affordances

If a control is visible, it should work. If it cannot work yet, it should be hidden or clearly marked non-actionable.

## Migration / Rollout Strategy

1. Add shell context and role navigation first.
2. Implement cashier lookup and rewire earn/redeem around it.
3. Add customer/card management.
4. Add offline sync queue and reconciliation.
5. Add supervisor workspaces: transactions, reversal, approvals, fraud, reports.
6. Add admin workflows: adjustments, users, devices, branches, audit, pilot health.
7. Remove placeholders, demo cards, and no-op buttons only after replacements exist.
8. Lock the final route map with tests and visual baselines.

## Verification Strategy

- Route-level e2e tests for each persona.
- Accessibility tests for keyboard/focus/announcement behavior.
- Visual regression for shell, cashier, customer/card, sync, supervisor, and admin states.
- Contract-sync checks whenever a workflow depends on an adapter or response interpretation.
- Feature-flag or route-gating tests for any hidden/disabled placeholder removal.
