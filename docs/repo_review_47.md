ShopCity repo review — latest head

Current head: 58e760b6cdbb01e96e2b654b2caa013985dd6f9f — fix: format sprint 5 readiness verifier.

Previous review baseline: 0225eaff...

Verdict

Area Previous Current Decision

Sprint 3 98% 98% PASS / frozen
Sprint 4 95% 95% PASS / frozen
Sprint 5 engineering ~89% 96% PASS
Sprint 5 pilot certification ~75% 73% NO-GO

The apparent drop in pilot-readiness score is intentional: the engineering improved significantly, but closer inspection shows that several files labelled as real certification evidence do not agree with the actual GitHub Actions runs.

The important conclusion is:

> Sprint 5 engineering has crossed the 90% threshold. Stop feature/hardening development. The remaining work is release certification.

---

What was fixed since the last review

1. The expiry-reminder race is fixed

This was my main P1 finding previously.

The reminder service now discovers candidate customers, then inside the transaction re-queries and locks the authoritative credit lots using FOR UPDATE, recomputes the amount and expiry range, and emits nothing if the credit has been consumed.

There is also explicit regression coverage where the candidate originally has ₦5,000, its authoritative balance becomes zero before persistence, and the system correctly creates:

no outbox event;

no SMS;

no reminder evidence.

Previous P1: CLOSED.

---

2. Expiry-vs-redemption concurrency is now actually tested

This was previously claimed complete without a direct adversarial test.

There is now a real concurrent test where expiry and redemption simultaneously target the same ₦11,000 lot. The test requires exactly one operation to succeed and verifies:

remaining = 0
expiry rows + redemption allocations = 1

The competing redemption also conditionally decrements only when sufficient remaining credit still exists, failing if expiry won the race.

Previous evidence gap: CLOSED.

---

3. Sentry is now implemented

Sentry is no longer configuration-only.

@sentry/node is now a production dependency.

Initialization:

is conditional on SENTRY_DSN;

is non-blocking if initialization fails;

disables default PII;

strips authorization, cookie and CSRF headers;

identifies runtime and release.

Both API bootstrap and worker bootstrap invoke it.

So OpenSpec Sprint 5 task 6.2 is now technically complete, even though the old Sprint 5 tracker still shows it unchecked.

That tracker needs reconciliation, not more Sentry development.

---

Remaining engineering issue: SYSTEM actor first-creation race

This is now the only code issue I would still carry.

SystemActorService.getOrCreate() remains:

findFirst
→ if absent
→ create

Two expiry workers processing different due lots for the same new tenant can both observe no SYSTEM user. One then wins creation and the other can hit the unique constraint.

This does not corrupt financial state because the losing transaction rolls back. It just causes one sweep to retry on a later cycle.

Severity: P2

I would fix it eventually by catching the expected create uniqueness race and re-reading the canonical SYSTEM actor.

It is not enough to keep Sprint 5 engineering below the 90% gate.

---

The real blocker is now certification evidence

This is where the repo currently fails.

P1 — security evidence contradicts GitHub Actions

The committed security document claims:

Gitleaks — success
Trivy — success
CodeQL — success
ZAP — success

and declares the security gate passed.

But the actual referenced GitHub Actions run says:

Security job Actual result

Gitleaks SUCCESS
Trivy SUCCESS
CodeQL SKIPPED
ZAP SKIPPED

Worse, the security evidence declares candidate:

41afe775...

while the referenced workflow actually ran against:

49f0e443....

That makes the current security-results.md invalid certification evidence.

The exact same situation remains on the current head: Gitleaks and Trivy pass, while CodeQL and ZAP remain skipped.

So GitHub labels the overall security-gates workflow successful, but the TRD security certification is not successful.

---

P1 — staging evidence is not real staging evidence

The committed certification says the deployment URL was:

https://staging.shopcity.example

and claims migrations, readiness, Bruno, contracts and ZAP all passed.

.example is being used here as a placeholder environment, not evidence of an actual staging deployment.

The repo itself now recognizes this. The new Review 46 closure plan explicitly requires:

a real staging deployment;

exact digest deployment;

migrations;

readiness checks;

Bruno;

contract tests;

ZAP against the actual staging HTTPS URL.

Therefore:

staging certification = NOT COMPLETE.

---

P1 — performance evidence was relabelled as staging evidence

The k6 file now says:

"baseUrl": "https://staging.shopcity.example"

with excellent p95 measurements.

But that is not a real certification endpoint.

The verifier currently checks that the URL:

begins with HTTPS;

isn't localhost/127.0.0.1.

It does not reject .example.

So this can satisfy the machine verifier while still not representing a real performance run.

Review 46 appropriately requires rerunning k6 against the actual certification environment and retaining the raw output.

---

P1 — restore evidence is still synthetic

restore-drill.json contains plausible timestamps and claims a Supabase isolated restore completed successfully.

But the newly created Review 46 source of truth explicitly says:

> replace the synthetic restore drill with a provider-managed Supabase backup restore into an isolated target.

So the repository itself acknowledges that the currently committed restore evidence is not an observed DR exercise.

This remains a mandatory TRD NO-GO.

---

P1 — the supposedly frozen candidate does not match its CI evidence

readiness.json claims the frozen candidate is:

41afe775b8abf985173c58c8de244bcb617be8c5.

The final approval also claims 41afe775... but points to CI run 31630700887.

That CI run actually belongs to:

49f0e44324feb4793c15ffd8afa4e59d2b15bd12.

Therefore the rule:

> one frozen SHA → one image → same-SHA CI → same-SHA security → same-SHA staging → same-SHA load → same-SHA restore

is not currently satisfied.

This alone prevents release certification.

---

There is also a source-of-truth contradiction

readiness.json says:

engineeringComplete = true
stagingCertified = true
productionApproved = true

But the human production-readiness checklist still has every single stage and mandatory gate unchecked.

So we currently have:

machine file: PRODUCTION APPROVED
checklist: nothing approved
actual Actions: CodeQL/ZAP skipped
staging: example domain
restore: synthetic

The correct status is clearly NOT production approved.

---

Current CI quality

The actual current head 58e760b6... is healthy from a normal engineering perspective.

On current head:

Static Checks — PASS

unit/coverage — PASS

lint/typecheck/build — PASS

OpenAPI/client — PASS

OpenSpec — PASS

E2E — PASS

integration — PASS

GitNexus — PASS

Docker build verification — PASS

The current CI run is fully green across those jobs.

Security on the same head remains:

Gitleaks — PASS

Trivy — PASS

CodeQL — SKIPPED

ZAP — SKIPPED

So engineering CI is green; release certification is not.

---

Updated score

Using the same Sprint 5 rubric:

Sprint 5 area Score Assessment

Credit expiry + reminders 24/25 Correct architecture; SYSTEM actor race minor
Observability/reconciliation 15/15 Sentry now implemented
Security 8/15 Gitleaks/Trivy pass; CodeQL/ZAP not certified
Performance 6/10 k6 implementation strong; real certification run absent
Backup/restore 6/15 tooling exists; observed provider restore absent
Container/deployment 10/10 strong and CI-green
Runbooks/training 4/5 materials exist; real sign-off still needs capture
Final certification 0/5 SHA/evidence chain invalid
Pilot readiness 73/100 NO-GO

But looking strictly at engineering implementation, excluding external release execution/sign-off:

Sprint 5 engineering: 96/100 — PASS

That is the number relevant to the agreed 90% engineering threshold.

---

What should happen now

Do not start another round of Sprint 5 feature development.

The newly added repo-review-46-certification-closure is actually the correct next source of truth. It explicitly calls for a new frozen candidate, exact pushed image digest, same-SHA CI/security, real staging/ZAP, real k6, real Supabase restore, real training/approver identities and final readiness verification—and every one of those closure tasks is currently still unchecked.

The remaining path is therefore:

1. Fix the small SYSTEM actor race if desired before freezing the RC.

2. Pick one final SHA at or after 41afe775...—preferably current/final engineering head.

3. Build and push its exact image and capture the actual registry digest.

4. Enable and run CodeQL.

5. Deploy that exact digest to a real staging environment and run ZAP.

6. Run Bruno/contracts and k6 against that real environment.

7. Perform a real Supabase backup restore into an isolated target and rerun financial reconciliation.

8. Replace the synthetic/sign-off evidence with observed evidence tied to that SHA/digest.

9. Check the production-readiness checklist.

10. Run the readiness verifier and freeze the result.

Final decision

Sprint 5 engineering is done enough to close development: 96/100 PASS.

ShopCity is not yet certified for pilot/production: NO-GO.

The repo does not need another broad implementation review after this. The next review should be exclusively the Review 46 certification closure, and we should refuse to call Sprint 5 complete until the actual external evidence matches the claimed SHA and image digest.
