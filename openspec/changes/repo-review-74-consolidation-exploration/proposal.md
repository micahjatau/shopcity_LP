## Why

Review 74 identified persistent gaps in the cashier design-system consolidation: incomplete topbar/customer-discovery reconciliation, narrow ownership enforcement, and missing whole-route conformance evidence. A second implementation pass resolved several CSS ownership issues, but the remaining evidence and source-of-truth questions need to be recorded before authorizing further code changes.

## What Changes

- Establish an exploration record for Review 74's confirmed fixes, unresolved gaps, and evidence boundary.
- Identify the authoritative topbar and customer-discovery source for reconciliation.
- Inventory remaining shared-selector ownership gaps across shell, controls, cards, forms, search, status, tables, dialogs, and workflow panels.
- Define the route/state/viewport evidence required to determine completion.
- Define a bounded follow-on scope that excludes financial controllers, API contracts, authentication, queue semantics, and unrelated working-tree changes.

## Capabilities

### New Capabilities

None. This is an exploration and proposal artifact only; it does not introduce runtime behavior.

### Modified Capabilities

None. Existing product requirements remain unchanged.

## Impact

- Documentation: `docs/repo_review_74.md` and the Review 74 OpenSpec exploration.
- OpenSpec planning: this change's `explore.md` establishes the handoff criteria for a future implementation proposal.
- No application source, API, database, deployment, authentication, or financial behavior is changed by this proposal.
- The follow-on implementation may affect `apps/web/styles/**`, shell components, Cashier presentation components, conformance scripts, and Playwright evidence, subject to a separate approved design and task plan.
