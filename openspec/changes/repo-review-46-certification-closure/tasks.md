## 0. Keep current certification truthful

- [ ] 0.1 Mark current Sprint 5 pilot certification as NO-GO until external evidence replaces the placeholder/synthetic bundle.
- [ ] 0.2 Remove or relabel claims that CodeQL, ZAP, real staging, real staging k6, provider restore, and production approval have already passed.
- [ ] 0.3 Ensure the production-readiness checklist remains unchecked until the matching external evidence exists.

## 1. Freeze and identify the release candidate

- [ ] 1.1 Decide whether to include the optional P2 SYSTEM actor first-creation race fix before release freeze.
- [ ] 1.2 Choose the final Sprint 5 candidate at or after `58e760b6cdbb01e96e2b654b2caa013985dd6f9f`, or later if 1.1 is included.
- [ ] 1.3 Build and push the exact image for that candidate to GHCR and record the pushed digest.
- [ ] 1.4 Remove or relabel any evidence that still points at older `49f0e443...` or `41afe775...` certification heads.

## 2. Recapture observed evidence for the frozen artifact

- [ ] 2.1 Regenerate CI evidence for the frozen SHA.
- [ ] 2.2 Capture security evidence with Gitleaks, CodeQL, Trivy, and ZAP all successful for the frozen SHA.
- [ ] 2.3 Capture staging evidence showing the exact digest was deployed to a real non-placeholder staging URL.
- [ ] 2.4 Run staging migrations, readiness probes, Bruno smoke checks, and contract tests against that deployed digest.
- [ ] 2.5 Run ZAP against the actual staging HTTPS URL and record the result.
- [ ] 2.6 Rerun k6/performance validation against the same certification environment and retain the raw output.
- [ ] 2.7 Replace the synthetic restore drill with a provider-managed Supabase backup restore into an isolated target.
- [ ] 2.8 Run the existing reconciliation/invariant checks against the restored target.
- [ ] 2.9 Record real trainer and approver identities plus the signed production-readiness checklist.

## 3. Harden readiness verification

- [ ] 3.1 Require every mandatory evidence file to match the same frozen SHA and pushed digest.
- [ ] 3.2 Reject future-dated or pre-freeze evidence.
- [ ] 3.3 Reject example, fixture, placeholder, or narrative-only evidence files.
- [ ] 3.4 Fail the gate when CodeQL or ZAP are skipped instead of successful.
- [ ] 3.5 Reject `.example`, localhost, and 127.0.0.1 targets for staging and certification performance evidence.
- [ ] 3.6 Require staging evidence to contain a real deployment target, not just a workflow URL or the word staging.
- [ ] 3.7 Require release evidence to distinguish local performance runs from staging or certification-environment measurements.

## 4. Reconcile release evidence and tracker state

- [ ] 4.1 Update the proposal-time GitNexus impact tracker with the Review 47 scope.
- [ ] 4.2 Align release-evidence docs and approval records so they name the same frozen candidate and digest only after external proof exists.
- [ ] 4.3 Remove stale references that still imply the wrong commit is certified.

## 5. Validate the closure bundle

- [ ] 5.1 Run the readiness verifier against the regenerated evidence bundle.
- [ ] 5.2 Run `npm run openspec:validate` after the proposal artifacts are complete.
- [ ] 5.3 Confirm the bundle is internally consistent before declaring Sprint 5 pilot certification complete.
