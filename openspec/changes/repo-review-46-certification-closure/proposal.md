## Why

Repo review 46 says the Sprint 5 engineering work is effectively closed, but pilot certification is still a no-go because the evidence bundle is tied to the wrong commit, several artifacts are future-dated or asserted rather than observed, the readiness verifier still does not fully bind every artifact to one immutable release candidate, Sentry bootstrap can still fail the process instead of failing open, and the proposal-time tracker no longer matches the source state.

Without this change, the repo can keep looking ready on paper while certifying stale or fabricated evidence for the wrong release candidate.

## What Changes

- Freeze one new immutable release candidate at or after `49f0e44324feb4793c15ffd8afa4e59d2b15bd12` and regenerate every Sprint 5 evidence artifact against that exact SHA and image digest.
- Replace future-dated or narrative-only readiness evidence with observed artifacts that include real timestamps, release identifiers, CI/run references, restore drill results, performance metrics, staging execution, and approval/training sign-offs.
- Harden the readiness verifier so it rejects mismatched SHA/digest pairs, future timestamps, fixture/example documents, and evidence that lacks execution identifiers for required gates.
- Make Sentry initialization fail open in both API and worker bootstrap paths so observability setup cannot block financial or worker startup.
- Reconcile release-evidence and OpenSpec tracker documentation so the certification bundle, repo review notes, and planned release candidate all point at the same immutable artifact.

## Capabilities

### New Capabilities

- `single-candidate-release-certification`: one frozen release SHA/image digest owns every mandatory Sprint 5 evidence artifact.
- `observed-evidence-not-asserted-evidence`: readiness records capture measured timestamps, run IDs, and execution outputs instead of future-dated placeholders.
- `fail-closed-multi-artifact-verification`: the verifier rejects any evidence bundle whose artifacts do not match the same release candidate.
- `fail-open-sentry-bootstrap`: observability initialization logs and continues when Sentry setup fails.
- `tracker-aligned-certification-records`: proposal-time tracker entries and release evidence stay synchronized with the committed candidate.

### Modified Capabilities

- `production-artifact-certification`: readiness validation now requires one immutable candidate and observed evidence for every mandatory gate.
- `pilot-operations-summary`: release metadata and observability fields remain truthful when Sentry is configured or explicitly skipped.

## Impact

Proposal-time GitNexus analysis:

- `HealthController`: LOW risk, 5 impacted symbols, 3 direct dependants. Readiness gate behavior is localized but the change must remain truthful and fail closed.
- `initializeSentryIfConfigured`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat Sentry bootstrap as an unindexed high-integrity surface and cover it with direct tests.
- `validateReadinessDocument`: target not found in GitNexus, impactedCount 0, risk UNKNOWN. Treat the readiness verifier as an unindexed high-integrity surface and cover it with direct tests.

## Rollout / Verification

This change is complete only when all of the following are true for one frozen candidate:

- `readiness.json` and every referenced evidence artifact point to the same release SHA and image digest;
- no evidence file contains future-dated or planned-only certification claims;
- the verifier rejects example/fixture evidence, stale review-head evidence, and mismatched artifact bundles;
- the observed restore drill, security runs, performance summary, staging validation, and final approval all reference the same candidate;
- Sentry startup succeeds when configured and does not block startup when initialization fails;
- the proposal-time tracker reflects the same closure scope as the source and release evidence;
- `npm run openspec:validate` passes after the proposal artifacts are written.

## Open Questions

1. Should the final certification bundle remain fully in-repo, or should the repository only reference externally stored release artifacts for the observed evidence files?
2. Should the verifier require explicit workflow run IDs for security and staging gates, or is a URL plus artifact hash sufficient?
