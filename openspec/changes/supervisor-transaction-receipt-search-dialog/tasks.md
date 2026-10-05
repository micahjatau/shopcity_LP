## API and contract

- [x] Add the bounded, branch-scoped Supervisor receipt-search endpoint and focused service/OpenAPI contract tests.
- [x] Export the OpenAPI change and regenerate the web API client.

## Supervisor UI

- [x] Replace the Supervisor transaction-ID loader/pills with receipt-number search and a Cashier-style results table.
- [x] Open authoritative transaction detail in a dialog and move guarded reversal controls inside it.
- [x] Preserve Cashier and Admin transaction routes and their existing behavior.

## Verification

- [x] Add unit and browser coverage for scope, search, selection, dialog lifecycle, and reversal behavior.
- [x] Run focused backend/frontend tests, changed-file and web lint, typechecks, OpenAPI validation, and OpenSpec validation.
- [ ] Clear repository-wide lint; it is currently blocked by the unrelated existing unsafe assignment at `src/modules/customers/customers.service.spec.ts:92`.
