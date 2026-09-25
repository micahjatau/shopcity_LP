## 1. Plan and validate

- [x] 1.1 Record proposal-time GitNexus impact result for `CashierSyncPage` and validate the focused OpenSpec change strictly.

## 2. Present clearer source-grounded copy

- [x] 2.1 Clarify local-record and eligible-batch copy; label visible sync states in plain language without altering underlying state values.
- [x] 2.2 Replace visible em-dash placeholders without changing data or action semantics; retain expandable technical diagnostics.
- [x] 2.3 Add focused copy/state and accessibility assertions plus responsive assertions for the Sync Queue.

## 3. Verify and preserve

- [x] 3.1 Run focused web Jest tests and affected Sync Queue Playwright tests.
- [x] 3.2 Run web lint and typecheck. Build was not run because an existing Next dev server was active on port 6767.
- [x] 3.3 Confirm no API/behavior change, no staged files, and preservation of all pre-existing dirty/untracked work.
