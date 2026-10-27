# Verification evidence

- Sidebar token source: `apps/web/styles/shell-components.css` uses `var(--sc-color-brand-700)` for the Supervisor sidebar; tokens resolve to `#8E0101`. Hover uses `--sc-color-brand-800` (`#6F0101`).
- White-text contrast: 9.75:1 on the sidebar color and 12.49:1 on hover.
- GitNexus pre-draft `AppShellContent` impact: LOW, exact, 3 symbols (1 direct; 2 depth-2), no processes/modules. Index stale at `f99f79e` versus HEAD `dbb8e0c`; see `docs/development/gitnexus-impact-tracker.md`.
- `apps/web/tests/app-shell.spec.tsx`: 1 suite, 17 tests passed, including Supervisor scoping and Admin exclusion.
- `apps/web/tests/supervisor-operational-reports.browser.spec.ts`: focused browser test passed; verifies the actual selected report tab, neutral inactive tab, primary action color, white text, and hover color.
- Web typecheck, focused ESLint, design-system ownership check, Prettier check for application files and new OpenSpec artifacts, `git diff --check`, and strict OpenSpec validation passed. The pre-existing dirty GitNexus tracker is not Prettier-clean as a whole; it was not reformatted wholesale.
- Styles are scoped under `.shell-root--supervisor`; shared `Button` and other-role shell styles are unchanged.
