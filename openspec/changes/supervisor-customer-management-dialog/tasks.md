## 1. Customer search and selection

- [x] 1.1 Replace the split Manage customers layout with full-width selectable result rows; verify status fallbacks and keyboard focus in focused component tests.
- [x] 1.2 Keep stable-ID detail loading and identity verification, and open a loading/error-capable dialog for row selections and ID deep links; verify matching, mismatched, failed, retry, and close states.

## 2. Customer details dialog

- [x] 2.1 Add `CustomerDetailsDialog` with verified identity, profile fields, truthful linked-card summary, and existing Cards navigation; verify accessible labels and omitted-serial behavior.
- [x] 2.2 Add dirty-state close handling for X, Cancel, Escape, and backdrop; verify Keep editing preserves values and Discard performs no write.
- [x] 2.3 Move progressive account-status controls into the dialog, require BLOCK/ACTIVATE confirmation, and preserve dirty profile values; verify writes and authoritative status refresh.

## 3. Save and refresh

- [x] 3.1 Save profiles through the existing protected API, verify an authoritative same-ID/value refresh, update the matching result, close, and announce a temporary toast; verify failures retain dialog values and never show success.

## 4. Integration verification

- [x] 4.1 Update focused Jest and Playwright coverage for rows, dialog, close confirmation, edit/status saves, refresh errors, and responsive layout; run the affected suites.
- [x] 4.2 Run web lint, TypeScript, design/token checks, Semgrep where applicable, an isolated production build and route smoke, OpenSpec validation, and `git diff --check`; confirm all pre-existing paths remain and nothing is staged.
