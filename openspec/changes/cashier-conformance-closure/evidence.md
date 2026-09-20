# Cashier conformance closure evidence

## Baseline

- Candidate revision: `d2bb996f1800a0d6e6bdd20d413c42ef37699caa`
- Branch: `workflow-states-implementation`
- Working tree: dirty before this change; unrelated Admin/Supervisor/configuration, screenshots, generated artifacts, Review 70–75 documents, and `development-preview-framing` were preserved.
- GitNexus: refreshed and up to date at the candidate revision.

## Review 75 gap disposition

| Gap                                  | Disposition                                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Single global CSS entry point        | Confirmed addressed; `app/layout.tsx` imports `globals.css`.                                                                            |
| Generated token source               | Confirmed addressed; `tokens.css` is generated from `docs/frontend/design-system/tokens.json`.                                          |
| Cashier route-local CSS imports      | Confirmed absent in the audited six routes.                                                                                             |
| AppShell embedded styles             | Confirmed absent from `app-shell.tsx`.                                                                                                  |
| Positional route selector            | Confirmed replaced by explicit workflow classes.                                                                                        |
| Duplicate Cashier action definitions | Focused guard confirms singular action ownership.                                                                                       |
| Generic selector ownership           | Still incomplete; current guard covers only the two Cashier action families.                                                            |
| Scoped input/heading appearance      | Still present in `cashier-routes.css` and requires classification or normalization.                                                     |
| Topbar/customer-discovery authority  | No missing prototype branch was available locally; current behavior is retained and the boundary is recorded as a follow-on decision.   |
| Six-route conformance                | Focused conformance suite passes after restarting a stale Next.js server; full matrix evidence remains broader than this focused suite. |

## GitNexus impact evidence

Before any implementation edits, upstream impact was run for planned shared presentation symbols:

- `CashierWorkflowRoute`: **HIGH**, 4 impacted direct dependants, 3 processes.
- `VerifiedCardLookupStep`: **HIGH**, 5 impacted symbols, 3 processes.
- `Button`: ambiguous lookup with maximum **HIGH** risk and 53 possible impacted symbols; the function candidate is the authoritative target.

These warnings require staged changes and complete regression gates.

## Browser diagnosis and verification

The initial conformance failures were caused by a stale Next.js dev server serving 404 responses for:

- `/_next/static/chunks/app/(shell)/layout.js`
- `/_next/static/chunks/app/(shell)/cashier/page.js`

After restarting the repository's stale dev server, the same focused suite passed:

````text
8 passed (52.7s)

The complete `workflow-routes.spec.ts` suite also passed:

```text
19 passed, 0 failed, 0 skipped
````

Browser accessibility checks passed 2/2 scenarios, including mobile drawer focus and Escape behavior.

The executable route/viewport matrix now covers six Cashier routes plus Supervisor and Admin shell routes at desktop (1440), tablet (1024), and mobile (390) viewports. The matrix suite and full workflow suite passed:

```text
Matrix: 1 passed
Workflow routes: 20 passed, 0 failed, 0 skipped
```

The tablet transaction overflow found by the matrix was fixed by constraining the transaction card and switching the toolbar to a two-column layout below 1100px.

The paired Earn/Redeem conformance test now compares shared lookup input and search-button computed styles for typography, borders, colors, radius, dimensions, padding, and documented variant expectations. The paired test passed.

The route matrix now emulates reduced motion at every desktop/tablet/mobile viewport, verifies shell transitions resolve to `0s`, checks body overflow, and rejects visible controls with zero-sized bounding boxes. The responsive/motion matrix passed.

Browser accessibility evidence now includes an axe scan of the Cashier shell plus mobile drawer focus/escape coverage. The new Cashier scan initially found insufficient avatar contrast (`#fff` on `#c39b81`); the shell avatar now uses the brand-700 background token. Browser accessibility and focused conformance suites pass after the fix.

```

Additional checks:

- Cashier ownership check: passed for 16 source files.
- Ownership test: passed.
- Web typecheck: passed.
- Selector registry and ownership tests: 4 passed, including duplicate-owner rejection, family coverage, and documented-exception acceptance.
- The customer-search compact input now uses the explicit `.sc-input--compact` primitive variant; the route-owned nested input rule was removed.
- Registry coverage now fails when a declared owner lacks its canonical selector definition; five ownership/coverage tests pass.
- `.cashier-card` base appearance now belongs to `cashier-design-system.css`; route CSS retains layout/composition rules only for that family.
- The Transactions refresh action now uses the explicit `sc-button--compact` variant; the ancestor-owned button height/radius override was removed. Remaining nested button rules are responsive width/layout rules.
- Web lint: passed with two pre-existing React hook warnings in global search.
- Web typecheck: passed.
- Web Jest/design-system tests: passed.
- Web build: passed.
- Semgrep OWASP scan: passed; 0 findings across 108 tracked files.

The stale-server incident is an environment/evidence issue, not an application-code fix. Future browser evidence must verify that the served Next.js chunks are current before classifying route failures.
```
