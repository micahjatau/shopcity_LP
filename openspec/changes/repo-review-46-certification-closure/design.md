## Context

Sprint 5 implementation is now ahead of certification. Repo review 46 shows the remaining work is not new product behavior; it is release-evidence integrity. The codebase needs one frozen candidate, one truthful evidence bundle, and one verifier that refuses stale, future-dated, or mismatched artifacts.

## Goals / Non-Goals

**Goals**

- Bind every required Sprint 5 certification artifact to one immutable release SHA and image digest.
- Replace asserted or future-dated evidence with observed run data, timestamps, and execution references.
- Make the readiness verifier fail closed when any artifact is missing, stale, or inconsistent.
- Make Sentry initialization non-blocking so observability setup cannot prevent runtime startup.
- Bring OpenSpec/release-tracker docs back into alignment with the chosen candidate.

**Non-Goals**

- Adding new Sprint 5 product features.
- Reworking the ledger, reminder, restore, or performance implementation beyond evidence/certification needs.
- Changing the release-evidence schema in incompatible ways.

## Decisions

1. Freeze the candidate first, then regenerate evidence.

- The review explicitly says the current bundle certifies the wrong head.
- All evidence must be regenerated after the candidate is frozen so the SHA/image digest remains stable and auditable.

2. Treat observed evidence as mandatory, not descriptive text.

- Future timestamps, placeholder approvals, and narrative-only pass claims do not prove execution.
- The readiness bundle must carry execution identifiers and measured values so the verifier can validate the artifacts rather than trust prose.

3. Require verifier consistency across all evidence files.

- A single readiness file is not enough if the related artifacts can point at different SHAs or digests.
- The verifier should reject any bundle where release SHA, image digest, or gate references disagree.

4. Fail open on Sentry initialization.

- Observability should improve the runtime but never become a startup blocker.
- If Sentry setup throws, log the failure and continue booting.

5. Keep the tracker aligned with the certified artifact.

- Proposal-time tracker notes, release evidence, and the final approval record should all name the same frozen candidate.
- This prevents a repeat of the review-46 mismatch between the source head and the certified bundle.

## Risks / Trade-offs

- Tightening the verifier will invalidate the current evidence bundle until fresh observed artifacts are captured.
- Requiring run IDs and measured metrics may force small updates to the security, staging, and performance capture process.
- Failing open on Sentry can hide transient configuration errors if logs are ignored, so the initializer must emit an explicit warning.
- Regenerating the bundle after freezing the candidate adds one more release step, but it is necessary to avoid certifying stale code.

## Migration Plan

1. Choose and freeze the release candidate SHA/image digest.
2. Capture fresh observed evidence for restore, security, performance, staging, training, and approval.
3. Patch the readiness verifier to enforce digest/SHA/timestamp consistency and reject fixture evidence.
4. Wrap Sentry bootstrap so init failures log and continue.
5. Update the proposal-time tracker and release evidence docs to reference the same frozen candidate.
6. Run `npm run openspec:validate` and the readiness verifier against the completed bundle.
