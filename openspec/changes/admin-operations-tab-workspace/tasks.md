## 1. Specification

- [x] 1.1 Record Operations-page scope and acceptance criteria before implementation.
- [x] 1.2 Run and record GitNexus impact for the planned route/component changes.

## 2. Implementation

- [x] 2.1 Remove the specified static badges, link, alert, and generic workspace notes.
- [x] 2.2 Add accessible Overview, Reports, and Controls tabs with Overview selected by default.
- [x] 2.3 Reuse pilot health and the existing ReportsWorkspace; link Controls to the five existing admin routes.
- [x] 2.4 Add focused tests for removed copy, tab selection/keyboard behavior, and Controls destinations.
- [x] 2.5 Add an opt-in PilotHealthPanel style variant matching the main Admin Overview panel/metric cards and use it only on the Operations Overview tab.
- [x] 2.6 Add tests for the matching card surfaces and unchanged default styles at other callers.
- [x] 2.7 Omit pilot-health header and per-signal status pills from the Operations Overview variant only.
- [x] 2.8 Refine panel subtitle and signal-detail typography only in the Operations Overview variant.
- [x] 2.9 Add an attention summary, server timestamp, and release/Sentry metadata from existing pilot-summary fields, preserving unknown values as unavailable.
- [x] 2.10 Confirm the endpoint is snapshot-only and keep historical trend charts out of scope until a backend history contract is approved.
- [x] 2.11 Add an opt-in badge-free ReportsWorkspace presentation and enable it only in the Operations Reports tab.
- [x] 2.12 Test that Operations omits report badges while default Admin and Supervisor report callers retain them.
- [x] 2.13 Scope the existing Reports-page typography to the Operations Reports tab's current-report context, summary items, and selected-item details.
- [x] 2.14 Test that Operations retains the report controls and badge-free behavior while using the scoped type hierarchy.
- [x] 2.15 Add an opt-in tenant-branch dropdown to Operations Reports, derive timezone from the selected branch, and remove only its manual Branch ID/Timezone inputs.
- [x] 2.16 Test tenant branch list states, selected-branch ID/timezone parameters, All branches behavior, retained date filters, and unchanged default callers.
- [x] 2.17 Add an Operations-only combined current-report/summary-items surface with a semantic table; open selected row details in a dialog with an explicit close button.
- [x] 2.18 Match Operations non-primary actions and filters to Supervisor Reports controls while retaining the sidebar-matched gradient on Load report.
- [x] 2.19 Add Operations-only All dates/Last 7 days/Last 30 days/Custom dates controls matching Supervisor Reports, with branch-timezone date calculations, custom-range validation, responsive selection, and no change to other callers.
- [x] 2.20 Render populated report fields as up to six labeled, formatted table columns with pagination, aligned numeric values, and narrow-width horizontal scrolling; preserve selected-row dialog behavior.

## 3. Verification

- [x] 3.1 Focused tests (4 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and OpenSpec validation passed. The repository-configured ESLint remains blocked by the existing ESLint 9/Next compatibility issue; the full web suite was not rerun (it previously had one unrelated Supervisor a11y failure).
- [ ] 3.2 Verify the tabbed page in a browser at desktop and narrow widths; the local preview responds but redirects unauthenticated requests to login. No credentials were used, so route-level visual verification remains pending.
- [x] 3.3 Focused PilotHealthPanel/Operations tests (6 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and OpenSpec validation passed. Repository-configured ESLint remains blocked by the existing ESLint 9/Next compatibility issue.
- [x] 3.4 Focused PilotHealthPanel/Operations tests (6 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and OpenSpec validation passed for the Operations-only pill removal.
- [x] 3.5 Focused PilotHealthPanel/Operations tests (6 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and OpenSpec validation passed for the subtext typography refinement.
- [x] 3.6 Focused PilotHealthPanel/Operations tests (8 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and OpenSpec validation passed for the attention summary and metadata.
- [x] 3.7 Focused Admin Operations, ReportsWorkspace, and Supervisor reports tests (26 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and strict OpenSpec validation passed for Operations-only badge removal. No browser check was run for this change.
- [x] 3.8 Focused Operations/Reports/Supervisor tests (26 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and strict OpenSpec validation passed. Chromium verified the scoped heading and supporting text sizes using the production stylesheet; authenticated route screenshots remain pending because the local route redirects to login.
- [x] 3.9 Focused Admin Operations, ReportsWorkspace, and Supervisor reports tests (28 passed), web typecheck, isolated ESLint, Prettier, `git diff --check`, and strict OpenSpec validation passed for the branch selector. Authenticated route-level browser verification remains pending; the local route redirects to login and no credentials were used.
- [x] 3.10 Focused Operations/Reports/Supervisor tests (29 passed), web typecheck, isolated ESLint, Prettier, CSS parsing, strict OpenSpec validation, and `git diff --check` passed. Chromium CSS smoke verified the prior button/control styling and dialog layout. Authenticated route-level browser verification remains pending; the local route redirects to login and no credentials were used.
- [x] 3.11 Focused Operations/Reports/Supervisor tests (30 passed), web typecheck, isolated ESLint, Prettier, strict OpenSpec validation, and `git diff --check` passed. Chromium confirmed Operations buttons match the Supervisor Reports treatment, dropdowns retain standard app geometry, and the card heading/subtext use 16px/13px typography. Authenticated route-level browser verification remains pending because the local route redirects to login.
- [x] 3.12 Focused Operations/Reports/Supervisor tests (31 passed), web typecheck, isolated ESLint, Prettier, CSS parsing, strict OpenSpec validation, and `git diff --check` passed. Tests cover branch-timezone 7/30-day ranges, no-range defaults, custom validation/application, dynamic columns, formatting, pagination, and unchanged shared callers. Chromium confirmed the sidebar-matched primary gradient, Supervisor pill controls, 16px/13px card type, responsive period select, numeric alignment, and no 320px horizontal overflow beyond the table's scroll container. Authenticated route-level browser verification remains pending because the local route redirects to login.
