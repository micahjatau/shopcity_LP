## 1. Release Gate And Tracker Truth

- [x] 1.1 Record the Sprint 3B hardening gate criteria so current-head evidence, not intent, controls release readiness.
- [x] 1.2 Update the release tracker entries to reflect the remaining blocker status honestly.

## 2. OpenAPI Client Consistency

- [x] 2.1 Regenerate the TypeScript client from the committed OpenAPI document and confirm the checked-in artifact is clean.
- [x] 2.2 Add or tighten CI checks so client generation and client typechecking fail on drift.

## 3. Migration Safety Evidence

- [x] 3.1 Update the migration-safety spec to require deployable migration history and recorded evidence.
- [x] 3.2 Record the remaining backup/restore or forward-fix evidence in the migration tracker.

## 4. Verification And Closure

- [x] 4.1 Run the affected contract, client, and release-evidence checks for the new gate.
- [x] 4.2 Confirm the change is apply-ready once every required artifact is complete.
