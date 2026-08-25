## Why

Repo reviews 46 and 47 agree that Sprint 5 engineering is effectively complete, but pilot certification is still blocked by evidence provenance. Review 47 adds an important correction: several committed files now look like real certification evidence, but they contradict the referenced GitHub Actions runs or use placeholder environments such as `staging.shopcity.example`.

Without this change, the repo can continue to look ready while certifying stale, synthetic, or mismatched evidence for the wrong artifact.

## What Changes

- Treat current Sprint 5 pilot certification as **NO-GO** until the external evidence exists and matches the repo claims.
- Freeze one final release candidate at or after `58e760b6cdbb01e96e2b654b2caa013985dd6f9f`, or after an optional SYSTEM actor race fix if that P2 cleanup is included before release.
- Build and push the exact release image to GHCR, capture the real OCI digest, and thread that digest through every certification artifact.
- Replace narrative, placeholder, or local-only evidence with observed proof for CI, security, staging, performance, restore, training, approval, and checklist sign-off.
- Require security evidence to prove Gitleaks, CodeQL, Trivy, and ZAP all succeeded for the same frozen SHA; skipped mandatory security jobs must fail the gate even when the GitHub workflow concludes success.
- Require staging evidence to prove the exact digest was deployed to a real non-placeholder staging URL, staging was migrated, readiness checks ran, Bruno smoke passed, contract tests passed, and ZAP ran against that actual HTTPS URL.
- Replace the synthetic restore drill with a restore from a real provider-managed Supabase backup into an isolated target, followed by the existing invariant and reconciliation checks.
- Record real trainer/approver identities and a checked/signed production-readiness checklist instead of placeholder approval text.
- Harden the readiness verifier so it rejects mismatched SHA/digest pairs, future-dated or pre-freeze evidence, `.example` or placeholder domains, skipped mandatory jobs, and staging/performance/restore claims that do not include observed external execution.

## Out of Scope

- New Sprint 5 product features.
- Broad financial, reporting, restore, or performance rewrites beyond certification evidence and verifier hardening.
- Calling Sprint 5 pilot-ready before the external certification chain exists.
- Replacing the existing release process with a different platform or workflow engine.

## Capabilities

### New Capabilities

- `canonical-release-candidate-certification`: one frozen SHA owns the full Sprint 5 closure bundle.
- `pushed-image-digest-provenance`: the certification bundle records a real registry digest from a pushed artifact.
- `staging-deployment-provenance`: staging evidence proves the exact release digest was deployed and exercised on a real staging URL.
- `provider-managed-backup-restore-proof`: restore evidence comes from an actual Supabase-managed backup restore, not a synthetic SQL replay.
- `fail-closed-security-gates`: skipped CodeQL or ZAP jobs no longer count as success.
- `freeze-time-aware-evidence-validation`: the verifier rejects evidence that predates the candidate freeze or mismatches the frozen artifact.
- `signed-readiness-closure`: final approval and checklist evidence identify actual humans and signed closure artifacts.
- `truthful-no-go-certification-state`: repo evidence explicitly remains not approved until the external certification chain is complete.

### Modified Capabilities

- `production-artifact-certification`: readiness validation now requires one immutable candidate, a pushed digest, and observed evidence for every mandatory gate.
- `restore-and-recovery-verification`: restore verification must prove hosted-backup recovery, not only local Testcontainers replay.
- `pilot-operations-summary`: operational summary and release metadata remain truthful when a gate is skipped, failed, or not yet captured.

## Impact

Proposal-time GitNexus analysis:

- `HealthController`: LOW risk, 5 impacted symbols, 3 direct dependants. Readiness behavior is localized, but the gate must remain truthful and fail closed.
- `initializeSentryIfConfigured`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat the bootstrap path as a high-integrity surface and cover it with direct tests if it changes.
- `validateReadinessDocument`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat the verifier as a high-integrity surface and cover it with direct tests and evidence-path regression checks.
- `SystemActorService` / `getOrCreate`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. If the optional P2 SYSTEM actor first-creation race is fixed before freezing, cover it with direct race/regression tests.

## Rollout / Verification

This change is complete only when one frozen candidate proves all of the following:

- the release candidate SHA is at or after `58e760b6cdbb01e96e2b654b2caa013985dd6f9f` unless a later optional P2 race fix is included;
- the registry digest comes from a real pushed artifact and matches every recorded reference;
- CI evidence, security evidence, staging evidence, performance evidence, restore evidence, training evidence, and approval evidence all reference the same SHA and digest;
- security evidence shows Gitleaks, CodeQL, Trivy, and ZAP all succeeded for the same candidate;
- staging evidence shows the exact digest was deployed, migrated, probed, smoke-tested, contract-tested, and ZAP-scanned on an actual non-placeholder staging URL;
- performance evidence shows observed metrics from that real certification environment, not a local run or relabelled placeholder URL;
- restore evidence shows an actual provider-managed Supabase backup was restored into an isolated target and the invariant checks passed;
- training, approval, and readiness checklist artifacts name real people and are signed/acknowledged;
- the verifier rejects example fixtures, `.example` URLs, stale review-head artifacts, skipped mandatory gates, future-dated evidence, and digest/SHA mismatches;
- `npm run openspec:validate` passes after the proposal artifacts are written.

## Open Questions

1. Should the final evidence bundle live fully in-repo, or should the repository only reference externally stored release artifacts and retain hashes/links locally?
2. Should the P2 SYSTEM actor first-creation race be fixed before the final candidate freeze, or deferred because engineering has already crossed the Sprint 5 threshold?
