## 1. Inspect

- [x] 1.1 Inventory all Admin shell route pages and self-link occurrences; preserve pre-existing worktree changes.
- [x] 1.2 Run and record GitNexus impact for changed route/component surfaces.

## 2. Implement

- [x] 2.1 Remove the redundant Admin overview self-links from common pages and dedicated control routes.
- [x] 2.2 Preserve persistent Admin navigation, Operations → Controls links, other task links, and non-Admin component behavior.
- [x] 2.3 Update unit and browser tests to assert self-links are absent across Admin routes.

## 3. Verify

- [x] 3.1 Run focused Jest and Playwright coverage for common and control routes. Jest: 31 focused tests passed. Playwright: Admin common-route coverage passed with checks for Transactions, Approvals, Fraud, Cards, Reports, Operations, Users, Devices, Branches, Audit, Adjustments, Policies, and customer registration; Admin Reports role/scope check also passed at desktop/mobile.
- [x] 3.2 Run web typecheck, relevant lint, build, Prettier, strict OpenSpec validation, and `git diff --check`. Typecheck, build, Prettier, OpenSpec validation, and diff check passed. ESLint reports four pre-existing `no-unnecessary-type-assertion` errors in unchanged Audit/Users handlers, reproduced against HEAD; changed workflow/page files otherwise lint clean.
- [x] 3.3 Review changed paths and preserve unrelated worktree changes. A source scan confirms no Admin `Back to admin` self-link remains; existing unrelated dirty/generated paths were left unstaged and unchanged.
