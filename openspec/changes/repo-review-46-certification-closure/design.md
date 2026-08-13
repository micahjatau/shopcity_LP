## Context

Repo reviews 46 and 47 say Sprint 5 engineering is complete enough for pilot use, but certification is still not trustworthy. Review 47 specifically found that the committed evidence claims CodeQL/ZAP success while the referenced security run skipped those jobs, points 41afe evidence at 49f0 CI runs, uses `.example` staging/performance URLs, and describes synthetic restore evidence as if it were an observed Supabase backup restore.

This change is about release integrity, not product scope.

## Goals / Non-Goals

**Goals**

- Keep the current pilot certification state truthful: NO-GO until external evidence exists.
- Bind every Sprint 5 closure artifact to one frozen release SHA and one real registry digest.
- Replace synthetic, placeholder, or future-dated evidence with observed certification evidence.
- Make the readiness verifier fail closed when any mandatory gate is skipped, mismatched, placeholder-backed, or not tied to the frozen candidate.
- Prove the release was actually deployed, validated, restored, and approved rather than inferred from a local or narrative artifact.

**Non-Goals**

- Adding new Sprint 5 functionality.
- Reworking the ledger, reporting, restore, or performance implementations beyond what certification evidence requires.
- Moving the evidence bundle to a different platform unless the implementation later decides to reference external artifacts by design.

## Decisions

1. Do not certify placeholder evidence.

- Review 47 shows that `.example` URLs and relabelled local evidence can pass a weak machine check while remaining invalid certification evidence.
- The repo should say NO-GO until the external staging, security, performance, restore, training, and approval artifacts are real.

2. Freeze the candidate first, then regenerate evidence.

- The current bundle certifies or references the wrong heads.
- All evidence must be recaptured after the candidate is frozen so the SHA and digest remain auditable and stable.

3. Treat observed evidence as mandatory.

- Future timestamps, placeholder approvals, and narrative-only pass claims do not prove execution.
- Each mandatory gate must have run identifiers, timestamps, and observed outputs that the verifier can check.

4. Require end-to-end provenance for the release artifact.

- A real registry digest is required, not a reused digest string.
- CI, security, staging, performance, restore, training, and approval evidence must tie back to the same frozen artifact.

5. Fail closed on skipped or placeholder-backed gates.

- CodeQL and ZAP are not optional for the certification bundle.
- A skipped mandatory job is a failure, not a pass.
- `.example`, localhost, and undocumented staging targets cannot satisfy external certification evidence.

6. Keep the optional SYSTEM actor race separate from certification.

- Review 47 calls the SYSTEM actor first-creation race a P2 engineering cleanup, not a Sprint 5 threshold blocker.
- If fixed before freeze, it should be covered by focused race tests and included in the final candidate SHA.

## Risks / Trade-offs

- Tightening the verifier will invalidate the current bundle until fresh external evidence is captured.
- Requiring a pushed digest and real staging evidence may force release-process work before the bundle can close.
- Replacing synthetic restore proof with provider-backed restore evidence is operationally heavier, but required for TRD-aligned launch confidence.
- Leaving the SYSTEM actor race for later keeps release certification focused, but a retry-only race may still appear in worker logs during first tenant expiry processing.

## Migration Plan

1. Mark or keep current pilot certification as NO-GO until real external evidence replaces placeholders.
2. Decide whether to include the optional SYSTEM actor race fix before final freeze.
3. Freeze the final candidate SHA.
4. Build and push the exact image and record the pushed digest.
5. Recapture CI, security, staging, performance, restore, training, and approval evidence for that exact artifact.
6. Patch the readiness verifier to require same-SHA/same-digest/same-freeze-time evidence and to reject skipped mandatory gates plus placeholder URLs.
7. Update the production-readiness checklist and release evidence docs to point at the same frozen candidate.
8. Run `npm run openspec:validate` and the readiness verifier against the completed bundle.
