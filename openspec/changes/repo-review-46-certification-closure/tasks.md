## 1. Freeze and identify the release candidate

- [ ] 1.1 Choose the new minimum Sprint 5 candidate at or after `41afe775b8abf985173c58c8de244bcb617be8c5`.
- [ ] 1.2 Build and push the exact image for that candidate to GHCR and record the pushed digest.
- [ ] 1.3 Remove or relabel any evidence that still points at the older `49f0e443...` certification head.

## 2. Recapture observed evidence for the frozen artifact

- [ ] 2.1 Regenerate CI evidence for the frozen SHA.
- [ ] 2.2 Capture security evidence with Gitleaks, CodeQL, Trivy, and ZAP all successful.
- [ ] 2.3 Capture staging evidence showing the exact digest was deployed, migrated, probed, smoke-tested, and contract-tested.
- [ ] 2.4 Run ZAP against the actual staging HTTPS URL and record the result.
- [ ] 2.5 Rerun k6/performance validation against the certification environment and retain the raw output.
- [ ] 2.6 Replace the synthetic restore drill with a provider-managed Supabase backup restore into an isolated target.
- [ ] 2.7 Run the existing reconciliation/invariant checks against the restored target.
- [ ] 2.8 Record real trainer and approver identities plus the signed production-readiness checklist.

## 3. Harden readiness verification

- [ ] 3.1 Require every mandatory evidence file to match the same frozen SHA and pushed digest.
- [ ] 3.2 Reject future-dated or pre-freeze evidence.
- [ ] 3.3 Reject example, fixture, or narrative-only evidence files.
- [ ] 3.4 Fail the gate when CodeQL or ZAP are skipped instead of successful.
- [ ] 3.5 Require a real staging deployment target, not just a workflow URL or the word staging.
- [ ] 3.6 Require release evidence to distinguish local performance runs from staging or certification-environment measurements.

## 4. Reconcile release evidence and tracker state

- [ ] 4.1 Update the proposal-time GitNexus impact tracker with the final certification scope.
- [ ] 4.2 Align release-evidence docs and approval records so they name the same frozen candidate and digest.
- [ ] 4.3 Remove stale references that still imply the wrong commit is certified.

## 5. Validate the closure bundle

- [ ] 5.1 Run the readiness verifier against the regenerated evidence bundle.
- [ ] 5.2 Run `npm run openspec:validate` after the proposal artifacts are complete.
- [ ] 5.3 Confirm the bundle is internally consistent before implementation work starts.
