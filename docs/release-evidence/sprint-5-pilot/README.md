# Sprint 5 Pilot Release Evidence

Use this directory to store the final pilot certification bundle for one approved release candidate.

## Required contents

- `deployment-checklist.md`
- `rollback-checklist.md`
- `production-readiness-checklist.md`
- `readiness.schema.json`
- `readiness.example.json`
- performance summary and validation output
- restore drill evidence and validation output
- security workflow results
- training sign-off references
- final approval record with release SHA and image digest

## Rules

- Keep all evidence tied to one release SHA and one deployable image digest.
- Record exceptions explicitly; missing mandatory gates block pilot launch.
- Redact secrets, tokens, customer phone numbers, and protected payloads.
- Run `npm run verify:sprint-5-readiness` before signing the pilot checklist.
