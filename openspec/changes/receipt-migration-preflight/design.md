## Context

The receipt integrity gate already protects upgrade correctness by failing closed on dirty legacy data, but the current upgrade story does not fully separate detection, repair, and verification. For shared databases, operators need a repeatable way to identify missing or duplicate legacy POS receipt identities before applying the receipt gate, and the upgrade harness needs to test the right historical schema.

## Goals / Non-Goals

**Goals:**
- Keep the receipt integrity gate fail-closed.
- Provide a documented repair/preflight path for legacy receipt data.
- Make the upgrade harness stop at the intended target migration.
- Keep migration evidence and operational guidance aligned.

**Non-Goals:**
- No change to the receipt domain model.
- No automatic data healing inside the migration itself.
- No new external tooling or service dependency.

## Decisions

- Keep the migration fail-closed on missing or duplicate legacy POS receipt identities. That is safer than trying to infer or auto-correct historical values during schema deployment.
- Put repair guidance in a runbook or SQL helper, not inside the migration. This keeps destructive remediation explicit and reviewable.
- Make the upgrade harness stop at the target migration using a break-on-target copy strategy. That prevents future migrations from polluting receipt-upgrade verification.
- Record evidence in the migration tracker alongside the repair workflow. The tracker should show both the failure mode and the verification path used to clear it.

## Risks / Trade-offs

- [Risk] Shared databases may remain blocked until operators run the repair workflow. → Mitigation: document the exact diagnostic queries and keep the failure message precise.
- [Risk] The harness can regress again if later migrations are added without updating the copy logic. → Mitigation: add a regression test that asserts the harness stops at the target migration.
- [Risk] Repair guidance may be mistaken for automatic cleanup. → Mitigation: keep the runbook explicit that the repair is manual and must be reviewed before deployment.

## Migration Plan

1. Update the upgrade harness to stop at the target migration.
2. Add or refresh the legacy receipt repair runbook and its diagnostic SQL.
3. Run the targeted receipt migration upgrade tests against the updated harness.
4. Update the migration tracker with the repair and verification evidence.

## Open Questions

- Should the repair workflow quarantine only rows with missing legacy references, or also emit a separate report for duplicates before any manual resolution?
- Do we want the migration tracker to link directly to the repair SQL path or only to the narrative runbook entry?
