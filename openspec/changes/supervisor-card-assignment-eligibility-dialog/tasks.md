## 1. Confirm and encode the UI contract

- [x] 1.1 Record the full-width Assign card search, verified eligibility dialog, no-write serial review, close behavior, and non-regression constraints in the proposal/spec/design.
- [x] 1.2 Confirm the dialog is assignment-specific, not the removed generic customer-selection preview; retain current API and eligibility contracts.

## 2. Implement the assignment workspace

- [x] 2.1 Replace the split search/details layout with a full-width customer search and full-width result rows; keep labels and controls responsive.
- [x] 2.2 Move loading, verified identity/status, eligibility reasons, ineligible actions, and retry into an accessible Assignment eligibility dialog opened only from selected/ID context.
- [x] 2.3 Move the blank serial field and existing serial-review state into the dialog; preserve Back, explicit Assign confirmation, CSRF/idempotency, pending guards, errors, refresh, and success behavior.
- [x] 2.4 Make close/Escape/backdrop preserve query/results while clearing selected identity; prevent close while a mutation is pending.

## 3. Verify behavior and visual states

- [x] 3.1 Update focused Jest coverage for selection, deep links, eligible/ineligible/unknown states, retry, serial review, close behavior, and existing assignment API invariants.
- [x] 3.2 Add Playwright coverage for full-width search, conventional dialog hierarchy, visible customer/card status, responsive layout, keyboard dismissal/focus, and no horizontal overflow.
- [x] 3.3 Run focused frontend tests, the affected Playwright test, typecheck, lint, formatting, design/token checks, `git diff --check`, and strict OpenSpec validation.
- [x] 3.4 Inspect final diff/status and confirm all inherited dirty files remain preserved and nothing is staged or committed.
