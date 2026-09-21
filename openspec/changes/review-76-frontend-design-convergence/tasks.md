## 1. Baseline and branch contract

- [x] 1.1 Record current HEAD, branch, dirty-tree inventory, CI status, and both branch SHAs; preserve unrelated changes and do not stage them.
- [x] 1.2 Run GitNexus impact for `AppShellContent`, `GlobalShellSearch`, `useCashierLookupController`, `VerifiedCardLookupStep`, `CashierWorkflowRoute`, and canonical card/search style owners; record risk before edits.
- [x] 1.3 Compare `workflow-states-implementation` with `fix/prototype-topbar-customer-lookup` for navbar, profile/notification, customer discovery, card lookup, generated contracts, and tests; document behavior conflicts and the selected source of truth.
- [x] 1.4 Confirm the accepted backend/API/RBAC boundary and create a separate follow-on proposal if integration requires a backend contract or authorization change.

## 2. Reconcile functional frontend behavior

- [x] 2.1 Integrate the supported role-aware navbar/search/customer-discovery behavior through a reviewable patch or merge, preserving the centralized `shell-*` ownership and current conformance tests; track profile/notification and `/profile` as the approved follow-on issue.
- [x] 2.2 Preserve Cashier-safe masking, tenant/branch scope, supported destinations, exact card verification, stale-request protection, keyboard/Escape/focus behavior, and truthful session/offline status.
- [x] 2.3 Reconcile `VerifiedCardLookupStep` and Earn/Redeem transitions with the integrated customer/card discovery behavior without changing controller, financial, approval, offline, or idempotency authority.
- [x] 2.4 Add conflict-resolution and branch-lineage evidence, including the files and behaviors intentionally retained from each source branch.

## 3. Enforce property-scoped style ownership

- [x] 3.1 Extend the ownership registry schema from file-level exceptions to selector/property-scoped exceptions with canonical appearance and allowed composition property sets.
- [x] 3.2 Make unknown selectors, exception properties, and canonical appearance declarations in route exceptions fail closed with actionable diagnostics.
- [x] 3.3 Add positive and negative fixtures for layout-only overrides, color/border/typography leakage, focus leakage, unknown exceptions, and duplicate owners.
- [x] 3.4 Run the checker against every production stylesheet and remove or explicitly classify remaining competing appearance rules.

## 4. Consolidate cards and route CSS

- [x] 4.1 Define the canonical card base and explicit `standard`, `metric`, `table`, and `flow` variants in the owning component/style layer.
- [x] 4.2 Migrate `.sc-card` and `.cashier-card` consumers without changing route behavior, responsive geometry, or accessibility semantics.
- [x] 4.3 Move reusable card, form, status, header, table, dialog, and focus appearance out of `cashier-routes.css`; retain only composition and documented variant layout.
- [x] 4.4 Remove obsolete selectors and update ownership/variant fixtures; verify no undocumented ancestor-dependent styling remains.

## 5. Verify the reconciled shell and workflows

- [x] 5.1 Add Cashier/Supervisor/Admin browser coverage for supported navbar/search categories, deferred profile/notification boundary, masking, authorization, active/focus states, session/offline status, and mobile drawer.
- [x] 5.2 Verify all six Cashier routes plus shell role consumers at desktop, tablet, mobile, and reduced-motion viewports with overflow and target-size checks.
- [x] 5.3 Verify customer name/phone discovery, exact card lookup/deep-link handoff, loading/empty/error states, stale responses, keyboard selection, Escape, and focus restoration.
- [x] 5.4 Verify Earn/Redeem shared lookup geometry and protected workflow transitions after branch reconciliation.

## 6. Add exact visual evidence

- [x] 6.1 Inventory committed Figma export references and map each required route/state/viewport to a stable fixture and capture command.
- [x] 6.2 Implement Figma-to-React comparison evidence with stable fonts, deterministic data, per-surface tolerances, and measured property/pixel reports; document the crop-alignment blocker and fail-closed runner contract.
- [x] 6.3 Record approved intentional differences separately from React screenshot baselines and computed-style comparisons.
- [x] 6.4 Capture and inspect shell, card, lookup, form, status, table, dialog, and responsive states; do not blindly update baselines. Categorize evidence as direct Figma parity, prototype/design-system conformance, or derived product conformance; retain explicit source-bound and typography blockers.

## 7. Run isolated staging journeys

- [ ] 7.1 Provision or select disposable staging tenant/branch fixtures and document credentials/secrets handling without committing secrets.
- [ ] 7.2 Run customer name/phone search and exact card verification with authorization, masking, deep-link, and error assertions.
- [ ] 7.3 Run Capture Purchase and Redeem journeys covering confirmed, approval, offline/error, and financial-gating behavior without production mutation.
- [ ] 7.4 Reconcile/clean up staging fixtures and record data-integrity results, environment, candidate SHA, and residual risks.

## 8. Final verification and handoff

- [ ] 8.1 Run ownership, lint, typecheck, Jest/accessibility, frontend conformance, Figma comparison, build, integration, Semgrep/security, and generated-artifact checks.
- [ ] 8.2 Run GitNexus `detect_changes()`, inspect the scoped diff and dirty tree, and separate convergence changes from pre-existing files.
- [ ] 8.3 Validate this OpenSpec change and confirm every requirement scenario has evidence or an accepted deviation.
- [ ] 8.4 Publish final handoff with candidate revision, source branch lineage, reports/screenshots, accepted deviations, rollback path, and residual risks.
