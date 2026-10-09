## API and contract

- [x] Add the bounded, branch-scoped Supervisor receipt-search endpoint and focused service/OpenAPI contract tests.
- [x] Export the OpenAPI change and regenerate the web API client.

## Supervisor UI

- [x] Replace the Supervisor transaction-ID loader/pills with receipt-number search and a Cashier-style results table.
- [x] Open authoritative transaction detail in a dialog and move guarded reversal controls inside it.
- [x] Preserve Cashier and Admin transaction routes and their existing behavior.

## Reference alignment

- [x] Match the base transaction table to the supplied SVG's compact search, white surface, separators, and outcome hierarchy without using its sample data.
- [x] Restyle each selected-transaction dialog to the supplied popup's two-column detail/audit layout while preserving authoritative data and reversal safeguards.
- [x] Verify selected-row details, status tones, keyboard dialog lifecycle, and responsive table/dialog behavior.
- [x] Align Supervisor transaction typography to shared type tokens and verify control, table, and dialog font sizes in the browser.

## Filters and table columns follow-up

- [x] Extend the branch-scoped search contract with status, cashier, and minimum receipt amount filters; apply them before cursor pagination.
- [x] Add reference-aligned columns using authorized source data; omit unsupported eligibility and color-code Confirmed/Reversed status badges.
- [x] Regenerate OpenAPI/client artifacts and test backend validation, branch scope, filter submission, cursor reset, and table rendering.

## Cursor pagination and refresh follow-up

- [x] Match the Supervisor overview's compact pager styling while keeping cursor-based navigation and avoiding unsupported total-page counts.
- [x] Add a refresh control that reloads the current applied query and cursor within the existing branch scope.
- [x] Verify refresh loading/disabled states, filter preservation, cursor position, and responsive pager layout.

## Control alignment refinement

- [x] Align the refresh action and cursor pager to the right; keep the refresh icon and black label on one line.
- [x] Verify desktop and mobile alignment in the browser.

## Status and pagination contrast refinement

- [x] Remove the duplicate initial status instruction and show live status only after a user action.
- [x] Set pagination labels and arrow icons to black while keeping disabled controls distinguishable.
- [x] Verify the initial copy and pagination contrast in the browser.

## Default date/time ordering

- [x] Document newest-first effective-time ordering and the ledger-ID tie-breaker.
- [x] Test the backend sort contract and verify the UI preserves API result order.

## Branch-wide default list

- [x] Make the receipt-number query parameter optional and return the bounded branch list when it is absent.
- [x] Load the first branch page on route entry; make receipt search an optional server-side filter.
- [x] Regenerate OpenAPI and the web client; test default loading, filter scope, cursor pagination, and refresh.
- [x] Remove the static authenticated-branch footer sentence and assert it remains absent.

## Verification

- [x] Add unit and browser coverage for scope, search, selection, dialog lifecycle, and reversal behavior.
- [x] Run focused backend/frontend tests, changed-file and web lint, typechecks, OpenAPI validation, and OpenSpec validation.
- [x] Clear repository-wide lint; `npm run lint` passes.
