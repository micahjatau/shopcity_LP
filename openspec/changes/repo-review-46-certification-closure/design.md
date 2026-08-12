## Context

Repo review 46 says Sprint 5 implementation is complete enough for pilot use, but certification is still not trustworthy. The release bundle currently mixes the wrong candidate SHA, skipped security jobs, synthetic restore evidence, local-only performance output, placeholder approval text, and verifier rules that are not strict enough about frozen-candidate provenance.

This change is about release integrity, not product scope.

## Goals / Non-Goals

**Goals**

- Bind every Sprint 5 closure artifact to one frozen release SHA and one real registry digest.
- Replace synthetic, placeholder, or future-dated evidence with observed certification evidence.
- Make the readiness verifier fail closed when any mandatory gate is skipped, mismatched, or not tied to the frozen candidate.
- Prove the release was actually deployed, validated, restored, and approved rather than inferred from a local or narrative artifact.

**Non-Goals**

- Adding new Sprint 5 functionality.
- Reworking the ledger, reporting, restore, or performance implementations beyond what certification evidence requires.
- Moving the evidence bundle to a different platform unless the implementation later decides to reference external artifacts by design.

## Decisions

1. Freeze the candidate first, then regenerate evidence.

- The review explicitly says the current bundle certifies the wrong head.
- All evidence must be recaptured after the candidate is frozen so the SHA and digest remain auditable and stable.

2. Treat observed evidence as mandatory.

- Future timestamps, placeholder approvals, and narrative-only pass claims do not prove execution.
- Each mandatory gate must have run identifiers, timestamps, and observed outputs that the verifier can check.

3. Require end-to-end provenance for the release artifact.

- A real registry digest is required, not a reused digest string.
- Security and staging evidence must tie back to the same frozen artifact and same deployment target.

4. Fail closed on skipped gates.

- CodeQL and ZAP are not optional for the certification bundle.
- A skipped mandatory job is a failure, not a pass.

5. Keep the verifier strict about freeze time and target reality.

- Evidence cannot predate the candidate freeze.
- Staging evidence must include a real deployment target and the executed validation steps.

## Risks / Trade-offs

- Tightening the verifier will invalidate the current bundle until fresh evidence is captured.
- Requiring a pushed digest and real staging evidence may force a small amount of release-process work before the bundle can close.
- Replacing the synthetic restore proof with provider-backed restore evidence is operationally heavier, but it is required for TRD-aligned launch confidence.
- Identifying real approvers/trainers makes the bundle honest, but it also removes the convenience of placeholder sign-off text.

## Migration Plan

1. Freeze the new minimum candidate SHA.
2. Build and push the exact image and record the pushed digest.
3. Recapture CI, security, staging, performance, restore, training, and approval evidence for that exact artifact.
4. Patch the readiness verifier to require same-SHA/same-digest/same-freeze-time evidence and to reject skipped mandatory gates.
5. Update the production-readiness checklist and release evidence docs to point at the same frozen candidate.
6. Run `npm run openspec:validate` and the readiness verifier against the completed bundle.
