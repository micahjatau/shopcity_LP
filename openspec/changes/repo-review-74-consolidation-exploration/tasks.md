## 1. Establish the evidence boundary

- [x] 1.1 Record the current branch, SHA, working-tree status, and excluded pre-existing files in the exploration evidence; verify the record matches `git status --short` and `git rev-parse HEAD`.
- [x] 1.2 Re-read Review 74, the existing cashier design-system OpenSpec, and the latest relevant shell/search changes; verify every Review 74 finding is mapped to a source path or explicitly marked unavailable.
- [x] 1.3 Record GitNexus and Graphiti availability, stale-index errors, and fallback evidence; verify the exploration distinguishes current source state from historical context.

## 2. Confirm consolidation coverage

- [x] 2.1 Run the style-ownership guard and focused tests; verify embedded styles, inline visual styles, positional selectors, invalid state tokens, and known duplicate button owners are reported accurately.
- [x] 2.2 Inventory shared selector families across shell, controls, cards, forms, search, status, tables, dialogs, and workflow panels; verify each selector has an intended owner or a documented exception.
- [x] 2.3 Inspect AppTopbar, GlobalShellSearch, customer lookup, and related OpenSpec/history; verify the authoritative topbar/customer-discovery source is identified or recorded as an explicit blocker.
- [x] 2.4 Run the existing unit, typecheck, lint, build, Semgrep, and critical Playwright checks; verify command exits and known warnings/failures are recorded without rebaselining unrelated failures.

## 3. Define completion evidence

- [x] 3.1 Create a route/state/viewport conformance matrix for Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, Sync Queue, and shared shell roles; verify each row is required, not-applicable with reason, or pending.
- [x] 3.2 Define the computed-style comparison contract for equivalent variants, states, responsive breakpoints, focus, loading, disabled, error, and reduced-motion cases; verify expected properties and tolerances are explicit.
- [x] 3.3 Define final visual/reference evidence requirements and provenance rules; verify derived Sync evidence is distinguished from original prototype references.

## 4. Prepare the implementation handoff

- [x] 4.1 Write the bounded follow-on scope, protected behavior boundaries, rollback approach, and dependency order; verify no financial controller, API, authentication, queue, or unrelated dirty-file work is included.
- [x] 4.2 Resolve or list remaining open questions with owners and required evidence; verify no unresolved question silently changes the proposed implementation scope.
- [x] 4.3 Review `explore.md`, `proposal.md`, `design.md`, `tasks.md`, and `execution-plan.md` together; verify terminology, paths, exit criteria, and skip-specs status are consistent.
