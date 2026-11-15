## 1. Supervisor mobile table treatment

- [x] 1.1 Restore contained horizontal table scrolling and desktop table semantics for Supervisor customers, cards, transactions, and flagged activity below 768px; verify selectors are scoped to Supervisor and keep table headers visible.
- [ ] 1.2 Add or extend browser coverage for all four Supervisor list tables at mobile and desktop widths; verify visible headers, local wrapper overflow, usable filters/actions, and no document-level horizontal overflow.

## 2. Verification

- [ ] 2.1 Run focused web tests, typecheck, lint on edited source, formatting, `git diff --check`, and strict OpenSpec validation; record results here.
  - Partial checks pass: report unit test, web typecheck, edited-source ESLint, Prettier, `git diff --check`, and strict OpenSpec validation. A standalone Chromium CSS fixture confirmed table/header/cell semantics, local scrolling, and no page overflow. The full route Playwright test remains blocked: the inherited `:3100` server leaves Supervisor bootstrap at “Preparing your workspace…”, and an isolated dev server run hit memory pressure and Chromium crashed. Existing ports were left untouched.
