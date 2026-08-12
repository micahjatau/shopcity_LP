## 1. Freeze and recapture the candidate

- [ ] 1.1 Freeze one release candidate SHA/image digest at or after `49f0e44324feb4793c15ffd8afa4e59d2b15bd12`.
- [ ] 1.2 Regenerate `docs/release-evidence/sprint-5-pilot/readiness.json` and all referenced evidence artifacts for that exact candidate.
- [ ] 1.3 Replace any future-dated, fixture, or narrative-only pass claims with observed timestamps and execution references.

## 2. Harden readiness verification

- [ ] 2.1 Require every mandatory evidence file to match the same release SHA and image digest.
- [ ] 2.2 Reject future timestamps, example/fixture evidence, and stale review-head references.
- [ ] 2.3 Require explicit execution identifiers or URLs for security and staging gates.
- [ ] 2.4 Validate that performance evidence contains observed metrics, not only threshold statements.

## 3. Make observability bootstrap fail open

- [ ] 3.1 Wrap Sentry initialization so a setup failure logs a warning and does not stop startup.
- [ ] 3.2 Keep the API and worker startup paths covered by regression tests for configured and unconfigured startup.

## 4. Reconcile release evidence and tracker state

- [ ] 4.1 Update the proposal-time GitNexus impact tracker with the final certification scope.
- [ ] 4.2 Align release-evidence docs and final approval records so they name the same frozen candidate.
- [ ] 4.3 Remove or relabel any stale evidence references that still point at the wrong commit.

## 5. Validate the closure bundle

- [ ] 5.1 Run the readiness verifier against the regenerated evidence bundle.
- [ ] 5.2 Run `npm run openspec:validate` after the proposal artifacts are complete.
- [ ] 5.3 Confirm the updated bundle is internally consistent before implementation work starts.
