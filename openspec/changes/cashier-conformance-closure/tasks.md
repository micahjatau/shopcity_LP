## 1. Baseline and scope

- [x] 1.1 Record candidate SHA, branch, dirty-tree inventory, current ownership output, and failing Playwright artifacts in the change evidence (`evidence.md`)
- [x] 1.2 Compare current topbar/customer-discovery implementation with available history and OpenSpecs, then record the accepted behavior boundary and any separately scoped functional work in `evidence.md`
- [x] 1.3 Run GitNexus upstream impact for each symbol planned for modification and record HIGH/CRITICAL warnings before editing in `evidence.md`

## 2. Ownership registry and enforcement

- [x] 2.1 Define the canonical selector-family registry for primitives, Cashier components, shell controls, and permitted modifiers; verify registry coverage against the production stylesheet inventory
- [x] 2.2 Expand the ownership checker to report competing owners for cards, inputs, forms, search, status, tables, dialogs, headers, flow panels, and shell selectors; verify it passes production sources
- [x] 2.3 Add negative fixtures for duplicate selectors, undeclared ancestor overrides, embedded styles, and inline presentation; verify the checker fails with actionable owner/file diagnostics
- [x] 2.4 Register or remove remaining `.cashier-card h2` and `.cashier-card .sc-input:focus-visible` exceptions; verify route CSS remains composition-only for audited shared families

## 3. Shared presentation normalization

- [x] 3.1 Move audited shared appearance rules to their canonical primitive or Cashier component owners without changing controller behavior; verify focused component tests and computed-style baselines
- [x] 3.2 Replace undocumented ancestor-dependent variants with explicit named modifiers where visual differences are legitimate; verify variant fixtures and route rendering
- [x] 3.3 Confirm the Cashier shell, search, page headers, flow panels, cards, forms, statuses, tables, and dialogs use the declared owners; verify static inventory has no unowned canonical family

## 4. Route and shell conformance evidence

- [x] 4.1 Convert the Review 74 matrix into executable route/state/viewport evidence for all six Cashier routes and Cashier/Supervisor/Admin shell roles
- [x] 4.2 Add computed-style comparisons for typography, colors, borders, radii, dimensions, spacing, focus treatment, and documented tolerances; verify intentional differences are reported as variants
- [x] 4.3 Add desktop, tablet, mobile, and applicable reduced-motion checks; verify no prohibited overflow, clipped controls, or inaccessible targets
- [x] 4.4 Add accessibility and interaction evidence for keyboard selection, focus return, dialogs, shell drawer/search, and protected workflow transitions

## 5. Browser failure closure

- [x] 5.1 Reproduce and classify every current Overview Playwright failure using the current candidate and preserved failure artifacts
- [x] 5.2 Fix production regressions or update stale assertions only when supported by the current product contract; verify the affected route tests pass
- [x] 5.3 Run the complete frontend conformance suite and verify no required row remains pending or silently skipped

## 6. Final verification and handoff

- [x] 6.1 Run frontend lint, typecheck, Jest/accessibility, build, Semgrep, ownership, and conformance gates; record every command exit
- [x] 6.2 Run GitNexus detect-changes and inspect the scoped diff/status; separate closure changes from pre-existing working-tree changes
- [x] 6.3 Publish final conformance evidence with candidate revision, environment, screenshots/reports, accepted deviations, and residual risks
- [x] 6.4 Validate this OpenSpec change and confirm every acceptance criterion is evidenced before claiming completion
