# Tasks

- [x] 1. Replace the Supervisor registration submit action with local validation and a simple registration review dialog; verify the review action makes no API request.
- [x] 2. Submit the existing atomic customer/card/consent request only from the dialog; retain CSRF, idempotent retry, truthful errors, and duplicate recovery.
- [x] 3. Show success only after a confirmed response with a customer ID; provide Register another and stable-ID View customer actions.
- [x] 4. Remove the shared existing-customer preview from Manage customers and Assign card; show verified details directly, add Manage linked card navigation, and preserve assignment serial review.
- [x] 5. Add focused Jest coverage for review/no-submit, confirm payload, edit/dismiss, failure/retry, missing-ID response, success, direct selection, and assignment gates (49 tests passed across three suites).
- [x] 6. Validate OpenSpec, lint, typecheck, token/design checks, `git diff --check`, and affected Playwright workflows (2 passed). A production build and Supervisor route smoke passed in an isolated copy to avoid disturbing the active Next dev server. Existing changes remain unstaged.
