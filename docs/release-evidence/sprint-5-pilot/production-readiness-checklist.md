# Sprint 5 Production Readiness Checklist

## Release candidate stages

- [ ] Engineering complete on one identified release SHA.
- [ ] Staging certified on the same release SHA and image digest.
- [ ] Production approved with security, performance, and restore gates attached.
- [ ] Pilot started only after opening checks and day-0 evidence complete.

## Mandatory gates

- [ ] Docker verification evidence attached.
- [ ] Security workflow evidence attached.
- [ ] Performance evidence attached.
- [ ] Restore drill evidence attached.
- [ ] Staging validation evidence attached.
- [ ] Training sign-off evidence attached.
- [ ] Final owner/admin sign-off attached.

## Verifier

Run:

- `node scripts/release-evidence/verify-sprint-5-readiness.cjs --evidence docs/release-evidence/sprint-5-pilot/readiness.json --evidence-dir docs/release-evidence/sprint-5-pilot --reference-time 2026-08-13T12:00:00.000Z`

The readiness verifier must fail if any mandatory gate is missing, not passed, or backed only by example or fixture evidence.
