## Context

The repository’s receipt-integrity work is close, but the latest review still blocks shared-database rollout because the migration accepts whitespace-only legacy receipt references and the upgrade path has only been proven from a fresh database. The underlying receipt capture contract is stable enough that this change is narrowly about migration safety, not new product behavior.

## Goals / Non-Goals

**Goals:**

- Reject blank or whitespace-only legacy receipt references during the receipt-integrity migration.
- Preserve only trustworthy legacy POS references by trimming them before backfill.
- Prove the migration on a populated pre-change schema, not just on a clean install.
- Record verification in the migration tracker so deployment readiness is explicit.

**Non-Goals:**

- Change receipt capture behavior beyond the migration/backfill safety fix.
- Add new ledger, approval, or card lifecycle behavior.
- Redesign the broader receipt model or create a new data migration framework.

## Decisions

1. Patch the existing receipt-integrity migration instead of adding a second follow-up migration.

- Why: the migration has not been proven in a shared environment yet, so hardening the current artifact keeps the rollout story simple and avoids leaving an unsafe migration behind.
- Alternatives considered: add a new expand-only migration. Rejected because it would preserve the flawed original backfill logic and make verification harder to reason about.

2. Treat blank and whitespace-only legacy receipt references as invalid migration inputs.

- Why: a physical POS receipt identity cannot be reconstructed from empty text, and trimming is the minimal safe normalization for retained rows.
- Alternatives considered: preserve whitespace as-is or synthesize a replacement identity. Rejected because either option fabricates or obscures the true receipt identity.

3. Add a dedicated upgrade-path integration test that exercises the actual migration boundary.

- Why: fresh-database receipt tests do not prove that a populated database can be upgraded safely.
- Alternatives considered: rely on the existing receipt capture suite. Rejected because it validates runtime behavior after migration, not the migration itself.

4. Update the migration tracker only after the upgrade-path test passes.

- Why: the tracker is the operational source of truth for schema safety, and it should reflect verified deployability instead of intent.
- Alternatives considered: leave the tracker unchanged until a later release note. Rejected because that keeps the deployment risk opaque.

## Risks / Trade-offs

- [Risk] Some historical rows may have blank legacy references that now fail migration. → Mitigation: surface those rows in the upgrade test and require manual cleanup or quarantine before deployment.
- [Risk] The new upgrade test will be slower than the existing fresh-install receipt test. → Mitigation: keep the fixture minimal and scope it to the receipt migration only.
- [Risk] Editing an existing migration is only safe while it remains unapplied in shared environments. → Mitigation: verify deployment status before release; if that changes, replace this with a new expand-only migration.

## Migration Plan

1. Tighten the receipt-integrity SQL guard so `externalReceiptNumber` must be non-empty after trimming before it is backfilled.
2. Add a focused upgrade-path integration test that applies the pre-change schema, seeds a legacy receipt row, and then applies the receipt-integrity migration.
3. Verify the migrated row keeps the trimmed physical POS receipt identity and that the legacy column is removed.
4. Record the verification result in `docs/database/migration-tracker.md`.

## Open Questions

- If historical rows with blank legacy references are discovered, should they be quarantined for manual repair or excluded from the upgrade path entirely?
