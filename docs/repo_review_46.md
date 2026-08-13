ShopCity repo review — latest head

Current head: 41afe775b8abf985173c58c8de244bcb617be8c5 — fix: close sprint 5 certification gaps.
Review baseline: 49f0e44324feb4793c15ffd8afa4e59d2b15bd12

Verdict

Sprints 1–4 remain closed. I found no regression that justifies reopening them.

For Sprint 5:

Current source-code engineering: 96/100 — PASS

Sprint 5 TRD/release closure: ~80/100 — NO-GO for pilot

Reason: the remaining problem is now almost entirely certification provenance, not product architecture.

This commit genuinely improves the source. It fixes Sentry fail-open behavior and makes the readiness verifier considerably stricter. But the repository is still marking several mandatory gates as passed when the underlying evidence does not satisfy the TRD.

---

What is now closed

1. Sentry fail-open — CLOSED

The previous operational concern is properly fixed.

Current code wraps Sentry initialization in try/catch, logs the failure, and allows startup to continue.

There is also a regression test explicitly asserting that a thrown Sentry.init() returns false, logs a warning, and does not continue Sentry setup.

That is materially better than candidate 49f0e443, where Sentry.init() was still unguarded.

So observability implementation is effectively complete.

---

2. Readiness verifier — substantially improved

The verifier now correctly checks:

same SHA across evidence;

same image digest;

no future timestamps;

measured k6 values;

real security/staging run references;

non-example evidence paths;

approval/training candidate identity.

This closes most of the previous verifier-design defect.

There is, however, still a critical false-positive path discussed below.

---

3. Real CI for 49f0e443 — VERIFIED

The evidence now references CI run 31630700887.

I directly checked that run through GitHub. These jobs actually completed successfully:

Static Checks

GitNexus

End-to-End Tests

Docker Build Verification

Integration Tests

So this is no longer “CI unverified” for candidate 49f0e443.

That is real progress.

---

P1 — Security gate is still falsely passing

This is the clearest remaining release blocker.

The security evidence itself says:

Gitleaks — ran

Trivy — ran

CodeQL — skipped

ZAP — skipped

yet concludes:

> Status: passed in release bundle

I independently checked workflow run 31630700891:

Gitleaks: success

Trivy: success

CodeQL: skipped

ZAP: skipped

The TRD explicitly defines the security layer as Gitleaks + CodeQL + Trivy + ZAP, with CodeQL required in PR/scheduled security analysis and ZAP at staging.

The workflow explains why this happened: CodeQL only runs when CODEQL_SCAN_ENABLED == true, while ZAP only runs from a manual dispatch that supplies an approved staging URL.

Why the verifier misses it

validateSecurityEvidence() currently only requires:

workflow run URL
workflow run ID
mentions Gitleaks
mentions Trivy
candidate SHA
image digest

It does not require CodeQL and ZAP to have successful conclusions.

So the machine gate still allows:

Gitleaks success
Trivy success
CodeQL skipped
ZAP skipped

→ security = PASSED

That is incorrect.

Required fix

The final security gate must require all applicable jobs to be:

Gitleaks → success
CodeQL → success
Trivy → success
ZAP → success

A skipped mandatory security job must not equal success.

---

P1 — “Staging certified” is not staging certification

The staging file currently says the validation command was:

npm run verify:sprint-5-readiness

and points to the same security workflow run.

But that security run's ZAP staging job was skipped.

There is no evidence in the file of:

an actual staging deployment URL;

deployment of the exact image digest;

migration of staging;

readiness probe;

Bruno staging smoke;

contract tests;

ZAP against that staging service.

The TRD deployment pipeline explicitly requires:

immutable version
→ deploy staging
→ migrate staging
→ readiness + Bruno smoke + contract tests
→ production approval

The current verifier's staging check is too permissive. It only looks for an Actions run URL and the word staging.

That is not enough.

---

P1 — the restore “drill” is still synthetic

The current restore-drill.json claims:

> Supabase managed encrypted scheduled backups with PITR enabled

and records an apparent restore window.

But the recorded substantive restore command is:

npx jest test/financial-repair-restore.int-spec.ts ...

That test creates a PostgreSQL Testcontainer and restores a synthetic SQL dump into it. The test describes itself as:

> financial repair synthetic upgrade-path verification

This is excellent migration/recovery regression coverage.

It is not evidence that a Supabase-managed backup was restored.

Those are two different questions:

Can our SQL/data restore logic work?
YES — good Testcontainers evidence.

Can we recover the actual hosted pilot database from
the backup mechanism we intend to depend on?
NOT YET PROVEN.

The TRD explicitly says:

automated database backups;

RPO ≤24 hours for pilot;

same-business-day RTO;

restore test before launch.

This remains a hard launch gate.

---

P1 — the certified candidate is already behind the current runtime

The readiness bundle certifies:

49f0e443...

But current head is:

41afe775...

and 41afe775 contains the required Sentry fail-open fix that 49f0e443 does not. Compare the two implementations directly.

There is nothing inherently wrong with having an evidence-only commit above the release candidate.

But 41afe775 is not evidence-only. It changes runtime code.

Therefore:

Release candidate = 49f0
→ lacks the final Sentry hardening requirement.

Current implementation = 41afe
→ has not been certified.

The next candidate must be 41afe775 or a later code-equivalent SHA.

---

P1 — certification timestamps are still not credible for 49f0

This is another important provenance issue.

The candidate commit 49f0e443 was created at approximately 19:02 UTC on August 12 according to GitHub metadata.

Yet evidence attributed to that exact candidate says:

restore started at 16:20 UTC;

training completed around 17:00–17:30;

k6 recorded at 17:40;

staging gate recorded at 18:20;

production approval recorded at 18:30.

Those activities are being presented as evidence for a SHA before that SHA existed.

The verifier now rejects future timestamps, but it doesn't check the other necessary boundary:

evidence timestamp >= release candidate creation/freeze time

That should be added for technical release gates.

There is an even smaller internal inconsistency: readiness.json records the Docker gate at 18:00 UTC, while the Docker evidence itself says it was recorded at 19:08 UTC.

A gate cannot be completed before its evidence exists.

---

P1/P2 — the claimed image digest is not proven

The bundle says the immutable image is:

ghcr.io/shopcity/shopcity-lp@sha256:385fe391...

But this is the same digest previously assigned to the older 0225eaff candidate.

Between those candidates, runtime code and dependencies changed materially.

More importantly, the repository's Docker verification script only:

docker build -t shopcity-lp:local .
docker run ...

It does not push an image to GHCR or capture an OCI registry digest.

The current Docker evidence therefore has a registry digest assertion that the documented verification process doesn't produce.

For a true immutable candidate, the release pipeline should:

build
→ push GHCR
→ capture pushed digest
→ deploy exactly that digest
→ scan exactly that digest
→ certify exactly that digest

Until then, SHA consistency is much stronger than image-digest consistency.

---

Performance is much better evidenced

This part has improved significantly.

There are now actual measured values:

Metric Observed

Card lookup p95 44.6 ms
Earn p95 112.9 ms
Redeem p95 91.5 ms
Report isolation p95 22.1 ms
HTTP failure rate 0%
Reconciliation mismatches 0

Those are comfortably within the defined thresholds.

However, the run was against:

http://127.0.0.1:3001

rather than a deployed staging artifact.

So I would classify it as:

local performance gate: PASS
release/staging performance certification: not yet complete

---

Training and approval are still placeholders

The final approval record says:

Approver: Pilot Approver
Approved: yes

rather than identifying an actual approving person.

The cashier sign-off file contains only the candidate SHA and digest—no cashier, trainer, acknowledgement, or actual signature/evidence.

And most importantly, the actual Production Readiness Checklist is still entirely unchecked.

The TRD's Sprint 5 exit gate is:

> production-readiness checklist signed and restore test completed.

So the repository itself still says the exit gate has not been completed.

---

Tracker status

The main Sprint 5 tracker remains appropriately open on:

observed restore drill;

final candidate freeze;

final evidence;

readiness closure.

The new Review 46 closure tracker is also completely unchecked.

That is actually more honest than readiness.json, which currently claims production approval.

---

Updated score

I would not reopen any financial architecture.

Current code

96/100 — engineering PASS

The codebase is essentially pilot-capable from an implementation perspective.

TRD Sprint 5 closure

~80/100 — NOT CLOSED

The remaining ~20 points are overwhelmingly certification/operations:

CodeQL;

ZAP;

actual staging deployment;

actual hosted backup restore;

real immutable image digest;

same-candidate reruns;

real training/approval;

signed readiness checklist.

Decision

Engineering: DONE

No more broad implementation cycles.

Pilot release: NO-GO

The remaining blockers are concrete and finite.

---

Exact path to closure

I would make 41afe775 the new minimum candidate baseline and do only this:

1. Build and push 41afe775 to GHCR; capture the actual OCI digest.

2. Run CI for that exact SHA.

3. Enable CodeQL and require it to succeed.

4. Deploy the exact digest to an actual staging environment.

5. Dispatch ZAP against that staging HTTPS URL and require success.

6. Run Bruno/contract/readiness checks in staging.

7. Rerun k6 against staging and retain the raw result.

8. Restore an actual provider-managed Supabase backup into an isolated target and run the existing reconciliation/invariant checks against it.

9. Record actual trainee/approver identities and sign the production-readiness checklist.

10. Harden the verifier so skipped CodeQL/ZAP cannot equal security pass, staging must contain a real deployment target, technical evidence cannot predate candidate freeze, and the image digest must come from a real pushed artifact.

Once those are done, there should be no reason for another Sprint 5 implementation review. The next review should be a pure release-candidate certification review, and if those gates are real and same-artifact, Sprint 5 should move directly into the 90s and close.
