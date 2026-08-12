## Why

Repo review 46 says Sprint 5 engineering is effectively done, but pilot certification is still blocked by evidence provenance. The current bundle certifies the wrong candidate, skips mandatory security jobs, treats a synthetic restore drill as if it were a hosted backup restore, relies on local-only performance runs, leaves training/approval as placeholders, and still allows the verifier to accept evidence that predates or outlives the frozen release candidate.

Without this change, the repo can continue to look ready while certifying stale, synthetic, or mismatched evidence for the wrong artifact.

## What Changes

- Freeze one new minimum release candidate at or after `41afe775b8abf985173c58c8de244bcb617be8c5` and regenerate every Sprint 5 evidence artifact against that exact SHA.
- Build and push the exact release image to GHCR, capture the real OCI digest, and thread that digest through every certification artifact.
- Replace narrative, placeholder, or local-only evidence with observed proof for CI, security, staging, performance, restore, training, approval, and checklist sign-off.
- Require security evidence to prove Gitleaks, CodeQL, Trivy, and ZAP all succeeded; skipped mandatory security jobs must fail the gate.
- Require staging evidence to prove the exact digest was deployed, staging was migrated, readiness checks ran, Bruno smoke passed, contract tests passed, and ZAP ran against the actual staging HTTPS URL.
- Replace the synthetic restore drill with a restore from a real provider-managed Supabase backup into an isolated target, followed by the existing invariant and reconciliation checks.
- Record real trainer/approver identities and a signed production-readiness checklist instead of placeholder approval text.
- Harden the readiness verifier so it rejects mismatched SHA/digest pairs, future-dated or pre-freeze evidence, example/fixture files, skipped mandatory jobs, and staging claims that do not include a real deployment target.

## Out of Scope

- New Sprint 5 product features.
- Reworking the financial, reporting, restore, or performance implementations beyond certification evidence and verifier hardening.
- Changing the release-evidence schema in a breaking way.
- Replacing the existing release process with a different platform or workflow engine.

## Capabilities

### New Capabilities

- `canonical-release-candidate-certification`: one frozen SHA owns the full Sprint 5 closure bundle.
- `pushed-image-digest-provenance`: the certification bundle records a real registry digest from a pushed artifact.
- `staging-deployment-provenance`: staging evidence proves the exact release digest was deployed and exercised.
- `provider-managed-backup-restore-proof`: restore evidence comes from an actual Supabase-managed backup restore, not a synthetic SQL replay.
- `fail-closed-security-gates`: skipped CodeQL or ZAP jobs no longer count as success.
- `freeze-time-aware-evidence-validation`: the verifier rejects evidence that predates the candidate freeze or mismatches the frozen artifact.
- `signed-readiness-closure`: final approval and checklist evidence identify actual humans and signed closure artifacts.

### Modified Capabilities

- `production-artifact-certification`: readiness validation now requires one immutable candidate, a pushed digest, and observed evidence for every mandatory gate.
- `restore-and-recovery-verification`: restore verification must prove hosted-backup recovery, not only local Testcontainers replay.
- `pilot-operations-summary`: operational summary and release metadata remain truthful when a gate is skipped, failed, or not yet captured.

## Impact

Proposal-time GitNexus analysis:

- `HealthController`: LOW risk, 5 impacted symbols, 3 direct dependants. Readiness behavior is localized, but the gate must remain truthful and fail closed.
- `initializeSentryIfConfigured`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat the bootstrap path as a high-integrity surface and cover it with direct tests if it changes.
- `validateReadinessDocument`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat the verifier as a high-integrity surface and cover it with direct tests and evidence-path regression checks.

## Rollout / Verification

This change is complete only when one frozen candidate proves all of the following:

- the release candidate SHA is at or after `41afe775b8abf985173c58c8de244bcb617be8c5` and every evidence file references the same SHA;
- the registry digest comes from a real pushed artifact and matches every recorded reference;
- security evidence shows Gitleaks, CodeQL, Trivy, and ZAP all succeeded for the same candidate;
- staging evidence shows the exact digest was deployed, migrated, probed, smoke-tested, contract-tested, and ZAP-scanned on the actual staging URL;
- restore evidence shows an actual provider-managed Supabase backup was restored into an isolated target and the invariant checks passed;
- performance evidence shows observed metrics from the certification environment, not just a local run or threshold statement;
- training, approval, and readiness checklist artifacts name real people and are signed/acknowledged;
- the verifier rejects example fixtures, stale review-head artifacts, skipped mandatory gates, future-dated evidence, and digest/SHA mismatches;
- `npm run openspec:validate` passes after the proposal artifacts are written.

## Open Questions

1. Should the final evidence bundle live fully in-repo, or should the repository only reference externally stored release artifacts and retain hashes/links locally?
2. Should the verifier require raw workflow run IDs for security and staging gates, or is a URL plus artifact hash sufficient when the artifact is already pinned to the frozen SHA?
