## Why

Repo review 49 shows the codebase is stable enough for pilot, but the release path is still not certifiable. The deployed Vercel surface returns `/health/live` = 200 while `/health/ready` still fails with `DEPENDENCY_UNAVAILABLE`, so the environment cannot yet prove Postgres and Redis readiness. In parallel, the recorded staging evidence ties a candidate SHA to the wrong immutable deployment ID, and the current evidence chain mixes a mutable Vercel alias with the older GHCR/container release model.

Without a change here, ShopCity cannot honestly claim a frozen, same-artifact certification trail for pilot approval.

## What Changes

- Diagnose and fix the deployed readiness failure so `/health/ready` reaches 200 only when Postgres and Redis are actually available.
- Identify the concrete dependency failure path in the deployed environment and preserve fail-closed readiness while making debugging clearer.
- Reconcile the release-candidate evidence chain so one frozen candidate maps to one immutable deployment artifact.
- Re-run staging and security evidence against the same immutable candidate and update release-evidence docs to match.
- Decide whether the release gate continues to certify a GHCR/container artifact or formally switches the certification model away from it, then make the chosen model explicit in the evidence trail.
- Ensure the worker runtime remains part of the certified release surface rather than certifying only the HTTP API.
- Complete staging migrations, readiness, Bruno smoke tests, contract tests, and final k6 measurements against the same candidate.
- Perform a real provider-managed Supabase backup restore into an isolated target and reconcile restored invariants.
- Complete role-based training, owner/admin sign-off, the production checklist, and the final readiness verifier.
- Reconcile the Review 46 tracker and all release-evidence artifacts, including the accepted ZAP warning record.

## Out of Scope

- New product features.
- Changing the append-only financial model.
- Reworking Sprint 5 business capabilities beyond what is needed for release certification.
- Replacing the TRD release process without an explicit architecture decision.

## Capabilities

### New Capabilities

- `release-certification-evidence`: one immutable candidate maps to one immutable deployment artifact and one evidence trail.
- `deployment-readiness-gating`: deployed readiness only passes when the real database and cache dependencies are healthy.
- `readiness-diagnostics`: readiness failures identify the missing dependency path well enough to debug the deployed environment.
- `artifact-model-selection`: the chosen release artifact model is explicit and reflected in evidence and verification.
- `staging-certification-completion`: migrations, health, Bruno, contract, and performance checks run against the certified candidate.
- `backup-restore-certification`: a real provider-managed backup restore is verified against an isolated target and business invariants.
- `pilot-approval-and-operations`: training, sign-off, production checklist, and final readiness verification are completed before pilot approval.

### Modified Capabilities

- `health-readiness`: deployed readiness remains fail-closed, but now distinguishes infrastructure failure from application startup success.
- `production-entrypoint-verification`: release packaging must prove the API and worker surfaces match the certified artifact model.
- `release-evidence-traceability`: staging, security, and readiness evidence must all point at the same candidate identifier.
- `release-evidence-reconciliation`: release docs, deployment IDs, and runtime verification records must agree on one candidate.
- `performance-certification`: k6 results must come from the final staging environment and certified artifact, not a local or synthetic run.
- `restore-and-recovery-verification`: restore evidence must use the provider-managed Supabase backup path and validate restored data.
- `pilot-readiness-signoff`: pilot approval requires completed operational checks, training, sign-off, and a passing readiness verifier.

## Impact

Proposal-time GitNexus analysis:

- `HealthController`: LOW risk, 5 impacted symbols, 3 direct dependants. Readiness behavior is localized, but it controls the pilot certification gate.
- `bootstrap` (`src/worker.ts`): LOW risk, 2 impacted symbols, 2 direct dependants. Worker lifecycle changes are narrow but part of the certified release surface.

Non-indexed but affected surfaces: Vercel config, worker deployment configuration, release-evidence docs, readiness verifier inputs, k6 and Bruno collections, Supabase restore tooling, training/sign-off records, production checklist, and any deployment metadata that binds SHA to artifact identity.

## Rollout / Verification

- Confirm `/health/live` stays 200 and `/health/ready` becomes 200 in the certified deployment environment.
- Verify the readiness failure reports the missing dependency cleanly when Postgres or Redis is unavailable.
- Identify whether the deployed failure is caused by Postgres, Redis, or deployment wiring and record the result.
- Re-record staging/security evidence against one immutable deployment identifier.
- Verify the worker runtime is included in the certified release path.
- Update the release-evidence docs, readiness notes, and candidate mapping to match the final artifact model.
- Run staging migrations and verify `/health/live` and `/health/ready` on the same candidate.
- Run Bruno smoke checks and contract tests against that environment; do not retain them as pending evidence.
- Run final k6 scenarios against the immutable staging target and record measured performance evidence.
- Run the full security workflow against the immutable target and document the four accepted ZAP warning categories with `FAIL-NEW: 0`.
- Restore a real provider-managed Supabase backup into an isolated target and verify migration history, required objects, financial history, and reconciliation invariants.
- Complete cashier, supervisor, admin, and owner/operator training plus actual approval/sign-off.
- Keep the production checklist unsigned until all gates pass, then run the final readiness verifier and reconcile the Review 46 tracker.

## Open Questions

1. The recommended certification model is the existing GHCR/container model required by Review 46 and the deployment runbook. If Vercel remains an API test surface, how will it be explicitly excluded from final artifact certification?
2. If Vercel remains in the loop, what is the immutable identifier that replaces the mutable alias in evidence documents?
3. Should readiness expose which dependency failed in production logs while keeping the HTTP response generic?
