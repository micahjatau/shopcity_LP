## 1. Cursor pagination behavior

- [x] 1.1 Preserve the customer-list API's `nextCursor` and `hasMore` metadata in the shared cashier lookup controller, while keeping existing exact-card verification behavior unchanged.
- [x] 1.2 Add independent cursor history, page indicators, Previous/Next controls, loading/disabled states, and retryable page errors for recent customers and search results.
- [x] 1.3 Reuse the Cashier Transactions `ChevronLeft`/`ChevronRight` icons, sizing, accessible labels, and pagination CSS treatment.

## 2. Regression coverage

- [x] 2.1 Add Jest tests for recent and searched result pagination, cursor reuse, page reset on query changes, no fabricated total, and retry preserving the current rows.
- [x] 2.2 Verify Cashier Lookup visual/accessibility behavior at desktop and narrow widths, including matching pager icons and unchanged Earn/Redeem verification gates.

## 3. Verification

- [x] 3.1 Run focused Cashier lookup Jest tests, affected Playwright workflows, web typecheck/lint/build, Prettier, strict OpenSpec validation, and `git diff --check`.
