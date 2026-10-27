## 1. Cursor-backed page navigation

- [x] 1.1 Replace the Load more append interaction with a cursor stack and Previous / Page N / Next controls matching the transactions table.
- [x] 1.2 Preserve the current page on failed Previous/Next requests and retry the same destination; reset page/cursors when effective filters change.
- [x] 1.3 Add scoped Cards pagination layout and focus styling while reusing the transactions page button treatment.

## 2. Verification

- [x] 2.1 Update focused card-management tests for next/previous requests, page indicator, disabled states, filters resetting to page 1, and retry after navigation failure.
- [x] 2.2 Run focused Jest and cards-route Playwright tests, web typecheck/lint, OpenSpec validation, Prettier, and `git diff --check`.
