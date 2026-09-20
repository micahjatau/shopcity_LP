## Context

This is an exploration-only change based on `docs/repo_review_74.md`. The repository already contains an implementation-oriented `unify-cashier-design-system` change and a second code pass has moved AppShell CSS, removed several duplicate Cashier rules, and expanded the ownership guard. The remaining work is to establish whether Review 74 is complete and, if not, define a bounded follow-on change without authorizing more runtime edits.

The working tree is dirty with unrelated frontend, documentation, screenshots, and configuration changes. Any exploration artifact must preserve those changes and treat GitNexus/Graphiti as supporting evidence rather than authoritative product requirements.

## Goals / Non-Goals

**Goals:**

- Produce a traceable evidence map from each Review 74 finding to confirmed, unresolved, or unverified status.
- Identify the authoritative topbar/customer-discovery source before proposing reconciliation work.
- Define the remaining selector-ownership audit and route/state/viewport conformance evidence.
- Establish an implementation handoff boundary and acceptance checklist.

**Non-Goals:**

- No application source, CSS, API, database, authentication, financial, offline, or deployment changes.
- No new runtime capability or modified product requirement.
- No branch reset, screenshot cleanup, GitNexus index repair by destructive cleanup, or mutation of unrelated working-tree files.

## Decisions

### 1. Store exploration in the OpenSpec change directory

Use `explore.md` alongside the proposal, design, tasks, and execution plan so the reasoning remains linked to the Review 74 change. Do not create a new product spec because this package has `skip_specs: true` and changes no runtime behavior.

**Alternative considered:** Put the analysis only in `docs/`. Rejected because the result would be disconnected from the proposal and future OpenSpec handoff.

### 2. Separate evidence from authorization

Classify findings as confirmed, unresolved, or unverified. The exploration may recommend a follow-on implementation, but only the future proposal/design/tasks can authorize code changes.

**Alternative considered:** Mark the existing consolidation change complete based on passing tests. Rejected because test pass status does not prove topbar reconciliation or whole-route visual conformance.

### 3. Use repository-local evidence first

Use source inspection, existing tests, OpenSpec history, Git history, GitNexus change detection, and Graphiti historical context. Record unavailable or stale interfaces explicitly, especially when the referenced branch or GitNexus full re-analysis is unavailable.

**Alternative considered:** Treat Review 74 prose or screenshots as sufficient current state. Rejected because source and runtime evidence have higher precedence.

### 4. Define a bounded follow-on handoff

The handoff may include topbar/customer-discovery reconciliation, generic ownership checks, and route/state/viewport evidence. It must explicitly exclude financial controllers, API contracts, authentication, queue semantics, and unrelated dirty files.

**Alternative considered:** Reopen the entire cashier design-system migration. Rejected because most extraction work is already present and a broad restart would increase regression risk.

## Risks / Trade-offs

- **The authoritative topbar branch cannot be identified locally** → record the missing branch as an exit blocker rather than guessing at intended behavior.
- **A static selector scan may miss cascade interactions** → require computed-style evidence in the follow-on plan and treat the current guard as partial enforcement.
- **Dirty working-tree changes can contaminate evidence** → record the current SHA/status and maintain an explicit excluded-file list.
- **GitNexus indexing may remain degraded** → use existing impact/detect-changes results as bounded evidence and report the index failure.

## Migration Plan

No runtime migration or rollback is required. To hand off to implementation, create a separate approved OpenSpec change or explicitly extend this change only after the authoritative source, conformance matrix, and acceptance criteria are resolved. The exploration itself can be rolled back by removing this change directory without touching application code.

## Open Questions

None that block this exploration. The authoritative branch/commit and conformance matrix are recorded as exit criteria for the future implementation proposal, not silently assumed here.
