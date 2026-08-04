## Context

The receipt migration is already functionally corrected, but the deployment path still has two sharp edges: populated databases may contain duplicate normalized legacy POS references, and the upgrade-test helper currently replays migrations in a way that will become unsafe as more migrations are added. This change hardens the migration path before immutable ledger work increases schema churn.

## Goals / Non-Goals

**Goals:**

- Prevent destructive receipt migration execution when legacy physical receipt identities collide.
- Make upgrade verification replay only the schema history that belongs before the target migration.
- Keep the safety checks testable and explicit.

**Non-Goals:**

- Redesigning receipt storage or the ledger model.
- Adding application-level receipt deduplication.
- Changing the business rules for receipt identity generation.

## Decisions

- Validate duplicate legacy receipt identities inside the migration path before any destructive schema changes.
  - Rationale: this fails fast on the data that matters and avoids partially mutating a database that cannot complete the upgrade.
  - Alternative considered: detect duplicates in application code before deploy. Rejected because the risk exists in the database snapshot, not in request handling.

- Normalize the legacy physical receipt identity the same way the receipt migration already does when checking for duplicates.
  - Rationale: the check must match the data that will later be persisted as the canonical identity.
  - Alternative considered: compare raw strings only. Rejected because whitespace and casing differences would miss real collisions.

- Change the upgrade-test helper to stop copying migrations once it reaches the target migration.
  - Rationale: this makes the test harness future-safe when later migrations are added.
  - Alternative considered: keep excluding only the target file. Rejected because later migrations would be applied out of order or against missing schema state.

- Keep the duplicate-reference test in the integration suite rather than unit tests.
  - Rationale: the risk is migration sequencing and database state, so the test must exercise PostgreSQL and the real migration runner.

## Risks / Trade-offs

- [False positives from normalization differences] -> Use the same normalization rules in the validation query as in the migration itself.
- [Migration fails on existing production data] -> Treat that failure as intentional and require manual duplicate resolution before retrying.
- [Future migration order drift] -> Keep the helper bound to the target migration boundary and cover it with an upgrade-path integration test.
- [Rollback complexity] -> Prefer blocking the migration before mutation; if a deployment is already in progress, revert by restoring from backup rather than attempting in-place repair.

## Migration Plan

1. Add the duplicate legacy receipt identity preflight to the migration.
2. Update the upgrade-test helper to copy only preceding migrations.
3. Add an upgrade-path integration test that uses duplicated legacy physical receipt identities.
4. Run the integration suite against a clean Testcontainers database.
5. Deploy the migration only after confirming no populated database contains duplicate normalized identities.

Rollback strategy:

- If validation fails pre-migration, stop deployment and resolve the duplicates.
- If the migration has already been applied in a lower environment and needs to be undone, restore the database from backup instead of attempting a partial reverse migration.

## Open Questions

- Should duplicate detection scope remain tenant + branch + receipt week, or be broadened if future receipt rules change?
- Do we want the test harness to resolve migration order from metadata instead of filename ordering?
