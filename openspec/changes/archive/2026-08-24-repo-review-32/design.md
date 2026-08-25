## Context

Review 32 confirmed that the repo is improving, but the release gate is still blocked by unsafe migration handling, incomplete restore proof, permissive Adjustment linkage, and a destructive duplicate-receipt workflow. The design needs to tighten those verification and safety boundaries without changing the core product model.

## Goals / Non-Goals

**Goals:**

- Preserve forward-only migration history.
- Make Adjustment source validation explicit and total.
- Replace destructive receipt cleanup with an approval-based flow.
- Prove restore behavior against the shared backup path.
- Keep release evidence aligned with the verified state.

**Non-Goals:**

- No API redesign.
- No new user-facing financial flows.
- No migration backfills beyond the safety checks needed for the new guards.

## Decisions

- Use a new forward migration for the follow-up repair work instead of rewriting the existing applied migration. This preserves checksum integrity for any environment that already applied the earlier file and avoids checksum drift across shared databases.
- Add a dedicated Adjustment validator on `BEFORE INSERT OR UPDATE` rather than relying on the existing ledger-entry insert trigger. That closes the loophole where an Adjustment can point at an already-existing non-Adjustment ledger row.
- Keep the historical preflight as a separate migration-time check. It protects existing data before the new trigger is installed and prevents silently carrying forward invalid links.
- Split receipt quarantine into report, stage, and execute scripts. This makes approval explicit and prevents the execution path from deleting rows that were never reviewed.
- Verify the shared backup path directly, not a synthetic clean-container round trip. The added cost is higher, but the result is much closer to the production-risk the review is trying to eliminate.

## Risks / Trade-offs

- Added migration and script surface area -> Mitigate with a single follow-up migration, deterministic SQL, and focused integration tests.
- Shared-backup verification is slower -> Mitigate by keeping the restore fixture narrow and only asserting required objects and histories.
- Approval-based quarantine can be operationally heavier -> Mitigate by keeping the report and staging outputs explicit and machine-readable.
