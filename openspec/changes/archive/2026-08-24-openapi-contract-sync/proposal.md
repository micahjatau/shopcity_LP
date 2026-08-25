## Why

CI is failing because the committed `docs/api/openapi.json` is out of sync with the current generated OpenAPI document. We need a clean, repeatable way to keep the tracked contract artifact aligned with the code so release gates fail only on real drift.

## What Changes

- Regenerate and commit `docs/api/openapi.json` from the current controller and envelope definitions.
- Keep the OpenAPI cleanliness check in CI so future drift fails fast.
- Lock the current transaction, approval, and ledger response shapes into the committed generated artifact.

## Capabilities

### New Capabilities

- `openapi-contract-cleanliness`: keep the committed OpenAPI artifact synchronized with the generated API contract and fail CI on drift.

### Modified Capabilities

- None.

## Impact

`docs/api/openapi.json`, `scripts/export-openapi.ts`, `src/modules/loyalty/loyalty.controller.ts`, `src/modules/approvals/approvals.controller.ts`, `test/openapi.int-spec.ts`, and the CI workflow step that checks generated OpenAPI cleanliness.
