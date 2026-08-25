## Context

Repo review 26 identifies an artifact-consistency problem rather than a runtime feature gap. The OpenAPI document was corrected, but the generated client was not regenerated, and the release evidence for the remaining hardening gate still needs to be made current and truthful. Migration safety also remains part of the shared-environment risk surface.

## Goals / Non-Goals

**Goals:**

- Keep the generated client aligned with the committed OpenAPI contract.
- Make client-generation drift fail fast in CI.
- Record current-head hardening evidence instead of relying on tracker intent.
- Preserve deployable migration-history and backup/restore evidence requirements.

**Non-Goals:**

- Do not change runtime reversal behavior.
- Do not expand manual-adjustment execution.
- Do not edit already-applied shared migrations in place.

## Decisions

1. Treat the generated client as a contract artifact.

   The client must be regenerated and typechecked from the committed OpenAPI document so docs and SDKs cannot diverge silently.

   Alternative considered: leave client refresh to developer discipline. That would preserve the current drift risk.

2. Make CI enforce artifact cleanliness.

   The pipeline should fail when client generation produces diffs or typechecking fails, because stale generated output is now a release blocker.

   Alternative considered: document the regeneration step only. That would not prevent future drift.

3. Keep release evidence explicit and current-head based.

   The hardening gate should only close when the current commit has recorded evidence for the required checks and migration history, not when a tracker entry is merely marked done.

   Alternative considered: infer readiness from completed tasks. That would repeat the same evidence gap that the review flags.

## Risks / Trade-offs

- [CI may fail more often on generated drift] -> Accept the friction; it protects contract truthfulness.
- [Release evidence adds process overhead] -> Keep the evidence checklist narrowly scoped to the blockers in the review.
- [Migration proof can slow shared-environment changes] -> Prefer explicit evidence over ambiguous schema-only success.
- [Tracker updates can lag implementation] -> Tie tracker completion to recorded evidence, not intent.

## Migration Plan

1. Regenerate the OpenAPI client and confirm the generated output is clean.
2. Add or tighten CI steps so client generation and typechecking run as part of the release gate.
3. Update the hardening tracker and release evidence to require current-head validation.
4. Reconcile the migration evidence notes so shared-environment safety reflects deployable history and backup/restore or forward-fix proof.

Rollback should be by forward fix where possible. If evidence is incomplete, do not force the gate closed; record the gap and repair it in a follow-up change.
