## 1. Shared Admin page presentation

- [x] 1.1 Add shared page-frame and heading styles using the 1120px content token; verify Operations and Policies use the same computed width and type scale at desktop and narrow widths.
- [x] 1.2 Apply shared page-frame classes to Operations and Policies without changing routes or existing behavior; verify both pages render with no horizontal document overflow.

## 2. Operations tabs and copy

- [x] 2.1 Hide the tab selector's visible horizontal scrollbar while preserving overflow, keyboard selection, and touch scrolling; verify with a narrow-width browser test.
- [x] 2.2 Simplify Operations, health-summary/trend, and Controls copy; verify exact page copy, unchanged default health-panel copy, and all five Control destinations in focused component tests.

## 3. Policies presentation and copy

- [x] 3.1 Move inline Policies layout styling into a page-local CSS module that uses the shared frame; verify panel, toolbar, and form controls remain responsive.
- [x] 3.2 Simplify policy heading, description, field labels, notice, statuses, and save action; verify units, loading/error/success/conflict states, and existing policy API payload behavior remain intact.

## 4. Verification

- [x] 4.1 Run focused Operations and Policies tests, web typecheck, targeted ESLint, Prettier, strict OpenSpec validation, and `git diff --check`; record any unrelated baseline failures.
- [x] 4.2 Review desktop and narrow screenshots/computed styles and inspect the final diff to ensure unrelated worktree changes are preserved.
