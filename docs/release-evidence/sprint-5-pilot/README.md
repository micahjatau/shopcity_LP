# Sprint 5 Pilot Release Evidence

Use this directory to store the final pilot certification bundle for one approved release candidate.

Current Review 49 status: **NO-GO**. The files in this directory are placeholders or pending records until same-SHA CI/security, real staging, real k6, provider-managed restore, training, and approval evidence are captured.

## Required contents

- `deployment-checklist.md`
- `rollback-checklist.md`
- `production-readiness-checklist.md`
- `final-approval-template.md`
- `evidence-handoff.md`
- `readiness.schema.json`
- `readiness.example.json` (negative fixture only)
- `readiness.json` (real release candidate evidence)
- CI results and workflow run URLs
- performance summary and validation output
- restore drill evidence and validation output
- security workflow results
- training sign-off references
- final approval record with release SHA and image digest
- CI and security workflow run URLs for the frozen candidate
- releaseFreezeAt timestamp for the frozen candidate

## Rules

- Keep all evidence tied to one release SHA and one deployable image digest.
- Record exceptions explicitly; missing mandatory gates block pilot launch.
- Redact secrets, tokens, customer phone numbers, and protected payloads.
- Run `npm run verify:sprint-5-readiness` against `readiness.json` before signing the pilot checklist.
- Replace example evidence with real release-candidate evidence before pilot approval.
