# Execution plan: Review 74 consolidation exploration

## 1. Operating rules

This package is an exploration and handoff plan, not authorization to modify application behavior. Work only in the OpenSpec change directory unless a task explicitly calls for read-only inspection. Preserve unrelated dirty changes, do not reset or clean the repository, and do not treat untracked screenshots as approved references.

For every evidence task:

1. Capture the command, exit code, revision, and relevant output.
2. Separate current source evidence from historical OpenSpec, GitNexus, Graphiti, and review prose.
3. Mark unavailable evidence as blocked or unknown; never infer completion.
4. Update the task checkbox only after its verification condition passes.
5. Escalate any finding that would change runtime scope into a future proposal.

## 2. Dependency order

```text
P1 evidence boundary
  └─ P2 consolidation coverage
       └─ P3 completion evidence
            └─ P4 implementation handoff
```

Read-only source audits may run in parallel within a phase. No implementation work is part of this plan.

## 3. P1 — Evidence boundary

- Record branch, SHA, status, existing changes, and excluded files.
- Re-read Review 74 and the `unify-cashier-design-system` artifacts.
- Record GitNexus full-analysis failure, detect-changes result, Graphiti status, and missing branch references.
- Update `explore.md` only when source evidence changes the classification of a finding.

**Gate:** Every Review 74 finding is classified as confirmed, unresolved, or unverified, with a source path or explicit evidence limitation.

## 4. P2 — Consolidation coverage

- Run the ownership guard and focused tests.
- Inventory selector ownership across all shared visual families, not only the two action selectors currently enforced.
- Inspect the current AppTopbar and customer-discovery implementation against available OpenSpec/history.
- Run existing lint, typecheck, build, Semgrep, Jest, and critical Playwright checks using a fresh local server when browser verification is required.

**Gate:** The exploration can state precisely which consolidation tasks are complete and which remain blocked by missing source, missing tests, or missing visual evidence.

## 5. P3 — Completion evidence

- Build the seven-surface matrix: six Cashier routes plus shared shell role coverage.
- Define required state and viewport rows, computed-style properties, tolerances, focus behavior, reduced-motion behavior, and screenshot provenance.
- Distinguish original references from derived Sync Queue evidence.

**Gate:** A future implementation proposal can name concrete tests and artifacts for every completion claim.

## 6. P4 — Handoff

- Write the bounded follow-on scope and protected behavior boundaries.
- List unresolved questions and required owners/evidence.
- Cross-check all OpenSpec artifacts for consistent terminology and paths.
- If implementation is still required, create a separate proposal or explicitly obtain approval to expand scope; do not begin code edits from this exploration alone.

**Gate:** `explore.md`, `proposal.md`, `design.md`, `tasks.md`, and this plan agree on scope, non-goals, evidence limitations, and exit criteria.

## 7. Rollback and completion

Rollback is documentation-only: remove or revert this OpenSpec change directory. Never revert application code, screenshots, generated artifacts, or unrelated working-tree changes as part of exploration rollback.

Completion requires the exploration tasks and evidence gates to pass. Completion does not mean the Review 74 consolidation itself is complete; it means the repository has a defensible, implementation-ready handoff or a documented blocker.
