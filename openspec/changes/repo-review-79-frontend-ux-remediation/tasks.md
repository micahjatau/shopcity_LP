# Tasks

## 1. Confirm scope and preserve baseline

- [x] 1.1 Record branch, reference HEAD, dirty-tree state and excluded changes; preserve pre-existing edits and untracked files.
- [x] 1.2 Read current Review 79 targets and applicable Review 78/78b artifacts; record overlap, inherited blockers and authoritative HTML references.
- [x] 1.3 Inspect current source/tests for each finding and classify disposition; do not apply stale-review fixes blindly.
- [x] 1.4 Run GitNexus impact analysis before editing affected components. Inspected components were LOW risk; final whole-tree detection later reported CRITICAL for a combined dirty worktree and is recorded in the handoff.

## 2. Repair global search interaction and responsive geometry

- [x] 2.1 Audit `GlobalShellSearch`; retain exact-card explicit verification, authorized categories, suggestions and route handoffs.
- [x] 2.2 Stabilize input/action geometry across categories and decouple desktop input width from category pill width.
- [x] 2.3 Set 180px minima at 1440/920 and 120px at 390/375; compare against prototype widths and record measurements/fallback in the composition audit.
- [x] 2.4 Suppress dropdown for empty focus/category selection; provide accessible pending/results/no-results/error states.
- [x] 2.5 Add outside-click dismissal; retain Escape/focus return, keyboard navigation and selection.
- [x] 2.6 Invalidate pending requests on clear, category change, ineligible query and dismissal.
- [x] 2.7 Add focused search interaction, category, state and race coverage.
- [x] 2.8 Measure rendered search dimensions at 1440/920/390/375 and verify no horizontal document overflow.

## 3. Correct landing cards and connectivity copy

- [x] 3.1 Confirm route data and branch on `route.featured` boolean.
- [x] 3.2 Test featured and ordinary card placement.
- [x] 3.3 Map supported connectivity states to readable labels.
- [x] 3.4 Verify labels do not expose raw enum values or imply API health; add exhaustive mapping tests.

## 4. Audit route-level composition

- [x] 4.1 Publish `docs/frontend/repo-review-79-composition-audit.md` with route/role/state/viewport matrix; identify derived routes.
- [x] 4.2 Review in-scope route composition dimensions and responsive reading order from source/DOM and available browser evidence.
- [x] 4.3 Distinguish human composition review from automated landmark/order/snapshot coverage.
- [x] 4.4 Record accepted deviations and unresolved mismatches; do not claim unavailable route-wide parity.

## 5. Recompose Sync Queue

- [x] 5.1 Trace actual queue status/retry/reconciliation semantics before copy changes.
- [x] 5.2 Consolidate header/instructions and remove repeated concepts/internal layout commentary.
- [x] 5.3 Place queue/connection status and primary Sync with secondary Refresh in the header/action region.
- [x] 5.4 Present device identity/count once; retain filters/table/pagination and meaningful states.
- [x] 5.5 Make selected-record details conditional/subordinate and technical details expandable; preserve retry/reconciliation/raw diagnostics.
- [x] 5.6 Add responsive/accessibility/status/empty tests and verify offline storage/device binding/sync behavior.

## 6. Clarify Transactions

- [x] 6.1 Verify endpoint scope and operation/status vocabulary; state bounded cashier activity and purchases/redemptions accurately.
- [x] 6.2 Keep Refresh in header actions, filters before table and one count/pagination region after it.
- [x] 6.3 Present transaction facts before technical detail; remove misleading receipt-image placeholder.
- [x] 6.4 Test bounded wording, operation terminology, empty/error states, dialog hierarchy and responsive composition.

## 7. Visual and functional acceptance

- [x] 7.1 Capture same-state HTML/React Transactions pages and search geometry at 1440/920/390/375; retain paired evidence.
- [x] 7.2 Keep existing screenshot baselines unchanged; record provenance and mismatches.
- [x] 7.3 Run focused/full web Jest, Playwright interaction/responsive, accessibility, design-system, typecheck, lint and build checks.
- [x] 7.4 Confirm auth/RBAC, verification, kobo precision, idempotency, offline Earn, no-offline-redemption and sync reconciliation remain unchanged.
- [x] 7.5 Run GitNexus `detect_changes()` and inspect final diff/status without absorbing unrelated dirty changes; combined-tree CRITICAL risk is reported in the handoff.

## 8. Independent second-pass review and handoff

- [x] 8.1 Perform fresh second-pass implementation review and finding-by-finding acceptance review.
- [x] 8.2 Disposition all ten findings as fixed/evidenced or document mismatch/residual; do not silently omit findings.
- [x] 8.3 Publish test results, captures, blocked comparisons and risks in `implementation-handoff.md` and the composition audit.
- [x] 8.4 Validate OpenSpec artifacts and record visual residuals and rollback/preservation boundaries.
