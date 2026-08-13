# Sprint 5 Evidence Handoff

Use this checklist to replace example Sprint 5 evidence with real release-candidate certification evidence.

## 1. Freeze the candidate

Record one real release candidate:

- release SHA
- image digest
- staging environment URL/name
- decision owner

Current observed candidate for the runtime readiness pass:

- release SHA: `a8b4506726915a2ee1b0c204e15d277a30f4d1cb`
- image digest: `dpl_CTZ2BoVhHkwG6KprB6q2jST3ZeTa`
- staging environment URL: `https://shopcity-jmnacoqq6-micah-s-projects-bb6507fe.vercel.app`

Update:

- `docs/release-evidence/sprint-5-pilot/readiness.json`
- `docs/release-evidence/sprint-5-pilot/final-approval-template.md`
- `docs/release-evidence/sprint-5-pilot/production-readiness-checklist.md`

## 2. Re-run artifact gates on that candidate

Required commands/evidence:

- `npm run verify:docker-image`
- security workflow run for the same SHA/image (`https://github.com/micahjatau/shopcity_LP/actions/runs/31709623536`)
- CI workflow run for the same SHA/image (`https://github.com/micahjatau/shopcity_LP/actions/runs/31709623465`)
- `k6 run scripts/performance/k6-pilot.js`
- `node scripts/performance/validate-k6-summary.mjs --summary tmp/k6-pilot-summary.json`
- `npx jest test/financial-state-invariants.int-spec.ts --config ./test/jest-int.json --runInBand`
- `node scripts/restore/verify-restore-drill.mjs --evidence <real-restore-evidence.json> --max-rpo-minutes 1440 --max-rto-minutes 1440`
- `npm run verify:sprint-5-readiness`

## 3. Replace example evidence with real evidence

Replace these placeholders:

- `docs/release-evidence/sprint-5-pilot/readiness.example.json`
- `docs/release-evidence/sprint-5-pilot/restore-drill.example.json`
- `docs/release-evidence/sprint-5-pilot/final-approval-template.md`
- `docs/release-evidence/sprint-5-pilot/readiness.json`
- `docs/release-evidence/sprint-5-pilot/restore-drill.json`

Recommended real files to add:

- `docs/release-evidence/sprint-5-pilot/performance-summary.json`
- `docs/release-evidence/sprint-5-pilot/security-results.md`
- `docs/release-evidence/sprint-5-pilot/staging-certification.md`
- `docs/release-evidence/sprint-5-pilot/training-signoff.md`
- `docs/release-evidence/sprint-5-pilot/final-approval.md`
- `docs/release-evidence/sprint-5-pilot/restore-drill.json`

## 4. Resolve remaining open decisions

- Record the observed restore RPO/RTO and note the restore target and policy used.
- If the pilot ever defers a mandatory gate, record the approver, rationale, and follow-up issue in final approval evidence.
- Do not mark the pilot certified until the immutable candidate, restore, performance, training, and approval evidence all reference the same release identity.

## 5. Final verification

After real evidence is in place, run:

- If available, attach the external staging URL and ZAP baseline run URL for the same candidate

- `npm run format:release`
- `npm run openspec:validate`
- `npm run verify:sprint-5-readiness`

Sprint 5 should only be closed when the readiness verifier passes against real, non-example evidence for the frozen candidate.
