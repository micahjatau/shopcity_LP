## 1. Proposal and scope lock

- [x] 1.1 Confirm `docs/repo_review_44.md` is the authoritative list of remaining Sprint 4 gaps and that no older tracker adds extra unresolved blockers.
- [x] 1.2 Validate this OpenSpec change with `npm run openspec:validate` after artifacts are created.
- [x] 1.3 Keep the scope frozen to Review 44 certification/evidence work; create a separate change if any new correctness defect is discovered.

## 2. Report refresh terminal exclusion evidence

- [x] 2.1 Add a failing regression that seeds a completed `report.refresh` event (`processedAt` set) and proves recovery excludes it.
- [x] 2.2 Add a failing regression that seeds a dead-lettered `report.refresh` event (`deadLetteredAt` set) and proves recovery excludes it.
- [x] 2.3 Confirm the assertions distinguish exclusion from silent success by verifying no queue publication or materialization occurs for either terminal event.
- [x] 2.4 Verify the existing stale `PUBLISHED` / `processedAt=null` recovery path still works after the exclusion assertions are added.

## 3. Receipt-race loser outcome evidence

- [x] 3.1 Identify the canonical loser result for offline→online same-receipt replay after offline success and codify it in the integration test.
- [x] 3.2 Strengthen the online↔offline concurrent race test so the losing path is asserted as an expected duplicate/conflict/replay-safe outcome, not merely “some rejection.”
- [x] 3.3 Strengthen the offline↔offline distinct-identity race test so the losing record is asserted as an expected duplicate/conflict/replay-safe outcome.
- [x] 3.4 Keep the existing authoritative invariants in every race test: exactly one receipt, one earn ledger entry, and one credit lot.
- [x] 3.5 If current runtime behavior is ambiguous, tighten the duplicate/conflict mapping in the implementation and add focused service-level coverage for the chosen loser outcome.

## 4. Release evidence certification

- [ ] 4.1 Replace the `_pending final commit and CI run_` placeholder in `docs/sprint-4-final-gate-evidence.md` with the final immutable SHA.
- [x] 4.2 Update the Review 43/44 OpenSpec tasks or notes so the remaining unchecked items clearly point only to final push/CI certification work.
- [ ] 4.3 Record the exact local validation commands rerun on the final SHA if the command set changed while closing Review 44.
- [ ] 4.4 Push the final SHA and record the GitHub Actions run URL proving Static Checks, Integration Tests, End-to-End Tests, and GitNexus are green.
- [ ] 4.5 Ensure the evidence document, any tracker notes, and GitHub CI all reference the same commit SHA.

## 5. Final validation

- [x] 5.1 Run the targeted worker recovery and offline receipt-race tests.
- [x] 5.2 Run any broader validation needed if implementation code changes were required to make loser outcomes deterministic.
- [ ] 5.3 Run `npm run openspec:validate` and confirm the change artifacts remain consistent with the implemented closure work.
