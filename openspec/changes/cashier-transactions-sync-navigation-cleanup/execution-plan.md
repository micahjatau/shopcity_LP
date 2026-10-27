# Execution Plan

## Objective

Finish `cashier-transactions-sync-navigation-cleanup` without absorbing unrelated working-tree changes, while preserving backend authority, RBAC, offline queue semantics, and truthful Cashier capabilities.

## Current baseline

- OpenSpec progress: 15/25 tasks complete.
- Existing working tree is dirty with unrelated changes; do not reset, reformat globally, or stage unrelated files.
- GitNexus is available, but aggregate `detect_changes` currently reports CRITICAL because unrelated files are mixed into the tree.
- Lint, typecheck, build, Semgrep, OpenSpec validation, focused Jest, targeted Playwright modal, sync/offline, shell-navigation, and geometry checks have passed.
- Graphiti and local Supabase remain unavailable; neither is required unless the scope expands to memory/database work.

## Phase 1 — Freeze evidence and scope

**Tasks:** 1.3, 6.3 preparation

1. Freeze Cashier, Supervisor, and Admin session fixtures in route tests.
2. Add route-level evidence helpers for role, route, API, and screenshot assertions.
3. Create an explicit expected-file allowlist for this change.
4. Separate unrelated dirty files from the change review; do not stage them.

**Gate:** deterministic route fixtures run successfully and the expected-file allowlist is documented.

## Phase 2 — Shell and role-boundary completion

**Tasks:** 2.4, remaining role checks from 2.3/3.5

1. Compare sidebar, topbar, footer, connection-state copy, and button rhythm against the approved prototype at desktop and mobile widths.
2. Keep global search explicitly read-only unless a supported route-aware search contract exists.
3. Verify Help and Logout destinations and mobile drawer focus behavior.
4. Run Cashier, Supervisor, and Admin route/authorization checks, including reversal availability only in management workspaces.

**Gate:** shell accessibility and responsive tests pass; no Cashier route exposes reversal controls or Supervisor/Admin-only destinations.

## Phase 3 — Supported lookup and workflow copy

**Tasks:** 4.2, 5.1, 5.2

1. Treat card lookup as the only currently supported Cashier discovery contract unless verified API evidence proves phone/name discovery exists.
2. Keep authoritative lookup verification before Earn/Redeem unlocks.
3. Review Capture Purchase and Redeem stage hierarchy, widths, actions, keyboard focus, reduced motion, success, and error states.
4. Replace engineering-facing copy with operational language while preserving truthful limitations around bounded activity, approval, credit, audit, and offline status.
5. Add copy assertions for unsupported claims and regression tests for lookup, Earn, Redeem, and offline Earn.

**Gate:** workflow contract tests, responsive checks, and copy assertions pass without changing financial authority.

## Phase 4 — Visual evidence and parity review

**Tasks:** 5.3, 5.4

1. Run deterministic desktop and mobile routes for Cashier Transactions, opened detail modal, and Sync Queue empty/populated/syncing/approval/failed states.
2. Capture screenshots with dynamic session and connection values masked.
3. Review image diffs against the approved prototype before updating any baseline.
4. Add geometry assertions for shell width, topbar height, content bounds, filter controls, modal bounds, table overflow, and mobile layout.
5. Record accepted deviations and unsupported capabilities in the evidence file and reference manifest.

**Gate:** screenshots are reviewed, not blindly regenerated; visual and geometry suites pass.

## Phase 5 — Integrated verification

**Tasks:** 6.1

Run, in order:

1. Focused Jest: shell navigation, AppShell, transaction dashboard, transaction workspace, forms, offline queue, and reconciliation.
2. Targeted Playwright: navigation, Transactions list/detail modal, Sync Queue states/mobile, Find Customer, Earn, Redeem, offline, and reconciliation.
3. Frontend lint, typecheck, build, Semgrep, and OpenSpec validation.
4. Integration/security checks applicable to the frontend-only change.

**Gate:** no required test is skipped without recording an infrastructure blocker and exact evidence path.

## Phase 6 — Final review and deliverables

**Tasks:** 6.3, 6.4

1. Run GitNexus `detect_changes` on the change-specific allowlist and the full dirty tree.
2. Explain any CRITICAL/HIGH risk and distinguish pre-existing files from this change.
3. Inspect `git diff --check`, targeted diff, and repository status.
4. Produce:
   - changed-file rationale;
   - before/after route and sidebar map;
   - search capability matrix;
   - Transactions list/modal parity comparison;
   - Sync Queue state and copy matrix;
   - final desktop/mobile screenshots;
   - exact command outcomes and final SHA;
   - intentional deviations and unsupported capabilities.

**Gate:** all expected symbols and flows are reviewed, unrelated files remain untouched, and residual risks are explicit.

## Rollback

This change is frontend-only. Roll back by reverting only the allowlisted frontend, test, and OpenSpec evidence files. No database migration, Supabase change, or deployment mutation is expected.

## Stop conditions

Pause before editing if:

- a required backend capability is missing or would need to be fabricated;
- GitNexus impact is HIGH/CRITICAL for a newly affected shared symbol;
- a Playwright failure indicates an application/runtime issue rather than a test assertion;
- a screenshot diff cannot be reviewed reliably;
- unrelated dirty files would be staged or modified.
