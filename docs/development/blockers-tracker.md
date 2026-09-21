# Cashier Prototype Alignment Blocker Tracker

Updated: 2026-09-21
Candidate: `workflow-states-implementation` at `ba5416c260346351eb1067f579eebe50c2005df3`

## Open blockers

| ID       | Area                       | Status  | Evidence / unblock condition                                                                                                                           |
| -------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VIS-001  | Figma visual runner        | Blocked | No executable deterministic Figma-to-React runner is available. Implement/select one only when approved source inputs and execution environment exist. |
| VIS-002  | Figma source bounds        | Blocked | Reference manifest crop `sourceBounds` values are null. Pixel parity must remain unclaimed until bounds are supplied.                                  |
| VIS-003  | Figma fonts                | Blocked | Original Figma font identity/availability is unconfirmed. The 1% pixel-difference gate cannot be applied.                                              |
| VIS-004  | Responsive references      | Blocked | Complete approved desktop/tablet/mobile references for all six routes are unavailable.                                                                 |
| VIS-005  | Route conformance baseline | Blocked | Transactions snapshot expects 1196px while the current shell renders 1120px. No snapshot was updated; baseline ownership/reconciliation is required.   |
| STG-001  | Staging configuration      | Blocked | Required staging/runtime configuration and secrets are not available in this shell. Values were not printed or committed.                              |
| STG-002  | Deployment lineage         | Blocked | No verifiable staging frontend/backend deployment SHAs tied to candidate `ba5416c` are available.                                                      |
| STG-003  | Disposable fixtures        | Blocked | Operator-approved staging tenant/branch, role accounts, cards, device, and fixture identities are not verifiable locally.                              |
| STG-004  | Staging reconciliation     | Blocked | No current-candidate staging mutations or cleanup/reconciliation evidence exists; no staging workflow was run.                                         |
| REPO-001 | Dirty-tree attribution     | Open    | The repository contains unrelated pre-existing changes and untracked artifacts. Only explicitly reviewed files may be included in any commit.          |

## Completed gates

- Existing visual regression gallery: 6 passed, without snapshot updates.
- Sync Queue remediation: independently approved.
- OpenSpec strict validation and documentation diff checks pass.
- Staging assessment failed closed as required; no deployment, fixture creation, or financial mutation was attempted.

## Unblock checklist

1. Supply approved Figma exports with source bounds, font identity/assets, and responsive references.
2. Reconcile the Transactions snapshot at the approved shell width; do not update it without owner-approved evidence.
3. Provide operator-approved staging environment configuration, exact deployed frontend/backend SHAs, fixture manifest, and cleanup authority.
4. Run the documented staging smoke workflow, reconcile fixtures, and attach privacy-safe reports.
