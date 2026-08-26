## 1. Reversal contract cleanup

- [x] 1.1 Remove the false `202` reversal success contract from the controller/OpenAPI boundary and keep the route review-required at runtime.
- [x] 1.2 Update the reversal HTTP and OpenAPI tests so `201` and `202` are both absent and `422 REVERSAL_REVIEW_REQUIRED` is asserted.
- [x] 1.3 Regenerate any committed OpenAPI or generated-client artifacts that reflect the updated reversal boundary.

## 2. Credit-lot and restoration integrity

- [x] 2.1 Generalize credit-lot source handling so approved `ADJUSTMENT/CREDIT` entries can create lots without loosening unsupported-source rejection.
- [x] 2.2 Add the original-debit restoration guard so reversal restorations must point back to the debit that consumed the allocation.
- [x] 2.3 Extend the financial invariant tests to cover adjustment-credit creation, foreign-restoration rejection, and original-debit preservation.

## 3. Migration safety verification

- [x] 3.1 Add restore-based verification that compares the shared database ledger, committed migrations, and expected custom SQL objects before release.
- [x] 3.2 Verify representative historical rows still exhibit the expected backfill/trigger effects after restore-based validation.
- [x] 3.3 Add or update the migration-safety tests so missing SQL objects, trigger drift, or historical-effect regressions fail closed.

## 4. Tracker and evidence refresh

- [x] 4.1 Update the release-evidence/tracker documentation so repo-review completion is only recorded when visible proof exists.
- [x] 4.2 Re-run the repo-review evidence checks and capture the current verified head, restore proof, and any migration-object inventory needed for the tracker.
- [x] 4.3 Confirm the change artifacts and tracker entries no longer mark unproven migration or financial work as complete.
