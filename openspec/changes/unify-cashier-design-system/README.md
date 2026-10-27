# Unify Cashier design system — implementation handoff

Source request: `docs/repo_review_73.md`.

Status: implementation in progress. The initial presentation/token/Sync slices are applied and verified; remaining tasks are tracked in `tasks.md`. No deployment, financial transaction, database change or final visual approval is implied.

## Read order

1. [Proposal](proposal.md): scope, rationale, capabilities and non-goals.
2. [Reconciled audit](audit.md): actual source findings, stale-review corrections, reference/test gaps and GitNexus blast radius.
3. [Design](design.md): token ownership, CSS cascade, component contracts, workflow composition and compatibility decisions.
4. [Cashier design-system requirements](specs/cashier-design-system/spec.md).
5. [Conformance requirements](specs/design-system-conformance/spec.md).
6. [Execution plan](execution-plan.md): phase dependencies, target files, gates, commands, evidence and rollback.
7. [Tasks](tasks.md): executable implementation checklist.
8. [Traceability](traceability.md): review recommendations and requirements mapped to phases and evidence.

## Start here

Continue from the current branch/revision, preserving unrelated changes. Revalidate source state before each additional edit. The shared Button has CRITICAL graph impact; workflow/lookup components have HIGH impact. Refresh impact for actual edited symbols and include shared non-Cashier consumers in regression testing.

The key architectural decision is **one generated token source and one shared visual owner per component**, not identical page layouts and not a controller rewrite. Newer collapsible-sidebar and global-search behavior takes precedence over obsolete prototype instructions; TRD financial and security invariants remain mandatory.

Reference approval and required test execution are implementation gates. OpenSpec readiness means the planning artifacts exist, not that the implementation or visuals have passed.
