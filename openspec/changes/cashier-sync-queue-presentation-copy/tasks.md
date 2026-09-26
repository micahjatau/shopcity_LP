## 1. Plan and validate

- [x] 1.1 Record proposal-time GitNexus impact result for `CashierSyncPage` and validate the focused OpenSpec change strictly.

## 2. Present clearer source-grounded copy

- [x] 2.1 Clarify local-record and eligible-batch copy; label visible sync states in plain language without altering underlying state values.
- [x] 2.2 Replace visible em-dash placeholders without changing data or action semantics; retain expandable technical diagnostics.
- [x] 2.3 Add focused copy/state and accessibility assertions plus responsive assertions for the Sync Queue.
- [x] 2.4 Stack the Sync Queue heading and toolbar when the shared shell constrains content width.
- [x] 2.5 Stretch mobile search and status filters across the queue card.

## 3. Verify and preserve

- [x] 3.1 Run focused web Jest tests and affected Sync Queue Playwright tests.
- [x] 3.2 Run web lint and typecheck. Build was not run because an existing Next dev server was active on port 6767.
- [x] 3.3 Confirm no API/behavior change, no staged files, and preservation of all pre-existing dirty/untracked work.
- [x] 3.4 Verify responsive heading geometry at 1080px and 1440px and rerun the focused Sync Queue Playwright checks.
- [x] 3.5 Verify mobile filter widths and shell layout against the narrow viewport contract.

## 4. Correct responsive composition and queue availability

- [x] 4.1 Use available page-container width to make Queue records full width when Sync activity is absent; use two columns only for meaningful results at wide workspace widths.
- [x] 4.2 Keep compact shell navigation on phones and verify mobile, tablet, and desktop geometry.
- [x] 4.3 Distinguish loading, successful empty, queue read failure, missing session identity, populated queue, and sync activity states without changing queue or financial semantics.
- [x] 4.4 Add the supported logout-and-sign-in recovery action for a missing device identity; retain queue-read retry only for read failures.
- [x] 4.5 Remove redundant empty-state footer and assert unknown rather than zero counts on loading/read failure.
