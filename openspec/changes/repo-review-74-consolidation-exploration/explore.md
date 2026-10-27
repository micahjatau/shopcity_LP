# Review 74 consolidation exploration

## Objective

Use `docs/repo_review_74.md` to determine whether the cashier design-system consolidation is complete, identify the remaining gaps, and define evidence required before opening a follow-on implementation proposal.

## Evidence reviewed

- `docs/repo_review_74.md`
- `openspec/changes/unify-cashier-design-system/`
- `apps/web/components/app-shell.tsx`
- `apps/web/components/app-topbar.tsx`
- `apps/web/components/workflows/cashier-transaction-route.tsx`
- `apps/web/scripts/check-cashier-style-ownership.mjs`
- `apps/web/styles/cashier-design-system.css`
- `apps/web/styles/cashier-routes.css`
- `apps/web/styles/shell-components.css`

## Phase P1 evidence boundary

- Revision: `374eb6933bb142c5d4e5043d32bc53b188435008`
- Branch: `workflow-states-implementation`
- Working tree: dirty; pre-existing changes include AGENTS/CLAUDE guidance, Admin/Supervisor pages, preview CSP/configuration, generated test artifacts, screenshots, frontend setup files, review documents, and the existing preview-framing OpenSpec.
- OpenSpec validation: 18 changes passed, 0 failed; this exploration is complete with specs intentionally skipped.
- GitNexus: existing-index `detect-changes` completed at low risk for 13 files/37 symbols; full re-analysis remains blocked by the inconsistent `file_fts` index, and the status command requires the repository selector in this multi-repository installation.
- Graphiti: transport/backend/read health available; repository namespace contains the two follow-up verification memories written during this session.

Every Review 74 finding is mapped to either a confirmed fix, an unresolved source requirement, or missing acceptance evidence below. No source files were reset or cleaned.

## Current conclusion

The consolidation is materially improved but not proven complete.

### Confirmed as addressed

- AppShell embedded style blocks were moved into shared shell CSS.
- AppShell static inline heading styling was replaced with a class.
- Cashier route first-of-type styling was replaced with explicit stage classes.
- Duplicate Cashier primary/secondary action definitions were removed from route CSS.
- Ancestor-based `.cashier-card .sc-button` overrides were removed.
- Invalid numbered warning focus tokens were replaced with the semantic focus token.
- The style-ownership guard now covers 16 source files and detects competing owners for the two shared Cashier action selectors.

### Phase P2 coverage evidence

- Ownership guard: passed for 16 source files; focused ownership test passed.
- Web verification: typecheck passed; lint passed with two existing React hook warnings; Jest/web tests passed (17 suites, 73 tests); Semgrep reported 0 findings.
- Selector inventory: Cashier shared action ownership is now singular, but the guard does not generically enforce all shared selector families. Cashier route CSS still contains scoped `.cashier-card .sc-input:focus-visible` and `.cashier-card h2` rules that require an explicit exception or later normalization. Non-Cashier Admin/Supervisor surfaces still contain inline CSS by design and remain outside the Cashier migration guard.
- Topbar/source reconciliation: current history includes `208c47e` role-aware global search/card lookup and `e48b122` design-system work, but the referenced `fix/prototype-topbar-customer-lookup` branch is absent and no newer authoritative notification/avatar implementation is available. This remains an explicit blocker, not an inferred completion.
- Critical browser coverage was previously rerun against a fresh local server on port 3110 and passed 4/4 tests.

### Still unresolved or insufficiently evidenced

1. **Topbar/customer-lookup reconciliation**
   - Review 74 requires reconciliation with the newer topbar and customer-discovery work.
   - The current `AppTopbar` still renders a non-interactive avatar and has no notification control.
   - The referenced `fix/prototype-topbar-customer-lookup` branch is not available locally, so branch-level reconciliation cannot be proven.

2. **Ownership guard breadth**
   - The guard checks embedded styles and inline styling across 16 files, but duplicate ownership detection is currently limited to two action selectors.
   - It does not generically detect competing definitions for cards, inputs, search, status, tables, dialogs, headers, or shell selectors.

3. **Conformance evidence**
   - Focused ownership, typecheck, lint, build, Jest, Semgrep, OpenSpec validation, and critical Playwright checks pass.
   - There is no complete six-route computed-style report covering equivalent variants, states, responsive breakpoints, reduced motion, and shell roles.
   - Visual evidence for the final candidate revision is not complete.

4. **Repository state and tooling**
   - GitNexus `detect-changes` reports low risk, but full re-analysis is blocked by an inconsistent `file_fts` index.
   - Existing unrelated working-tree changes must remain separated from any follow-on implementation.

## Conformance evidence

The executable handoff matrix is recorded in `conformance-matrix.md`. It covers all six Cashier routes, Cashier/Supervisor/Admin shell roles, required states, desktop/tablet/mobile viewports, reduced motion, computed-style properties, tolerances, and reference provenance. All rows remain pending until a future implementation pass produces route-level evidence.

## Exploration questions

- Which topbar/customer-discovery commit or OpenSpec is the authoritative source for the reconciliation requirement?
- Should notifications and avatar interaction be included in consolidation, or handled as a separate functional change?
- Which shared selector families are authoritative, and which intentional variants need an exception registry?
- What exact route/state/viewport matrix is required for final computed-style and screenshot acceptance?
- Can GitNexus be repaired or rebuilt safely without touching unrelated source changes?

## Sequential execution status

- P1 Evidence boundary: complete.
- P2 Consolidation coverage: complete; topbar/customer-discovery source remains blocked and generic ownership enforcement remains incomplete.
- P3 Completion evidence: complete; `conformance-matrix.md` defines the required future evidence, but all route rows remain pending.
- P4 Implementation handoff: complete; this package is ready to inform a separate implementation proposal, not to claim Review 74 closure.

## Candidate follow-on scope

A follow-on implementation should be limited to:

- reconciling the authoritative topbar/customer-discovery behavior;
- expanding selector ownership checks across shared component families;
- adding a six-route shell/state/viewport conformance report;
- recording final visual evidence and justified deviations;
- repairing or documenting the GitNexus index blocker.

It should not change financial controllers, API contracts, queue semantics, authentication, RBAC, or unrelated dirty working-tree files.

## Exit criteria for exploration

Exploration is complete when the authoritative topbar/customer-discovery source is identified, unresolved selectors are inventoried, the conformance matrix is approved, and a separate implementation proposal can state measurable acceptance criteria without relying on screenshot similarity alone.
