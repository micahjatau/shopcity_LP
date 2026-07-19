## Why

The backend foundation is functional, but several correctness and contract gaps can still confuse clients or let regressions slip through. PR1 hardens the API boundary, health behavior, error semantics, and module architecture so the baseline is trustworthy before more domain work lands.

## What Changes

- Fix the OpenAPI server/path composition so generated docs do not double-prefix versioned routes.
- Publish the response envelope and error envelope in Swagger so the documented contract matches runtime behavior.
- Make health checks return proper 503 responses on dependency failure and use a real Redis `PING`.
- Gate Swagger in production unless explicitly enabled.
- Add request/correlation ID propagation into API responses and error payloads.
- Standardize domain exception codes so stable API errors are returned instead of generic HTTP buckets.
- Add generated OpenAPI drift checks plus formatting/lint checks to the quality gate.
- **BREAKING** Enforce module boundaries in configuration so forbidden cross-module imports fail CI.

## Capabilities

### New Capabilities
- `foundation-correctness`: API contract hygiene, health correctness, request tracing, error semantics, CI drift checks, and module-boundary enforcement.

### Modified Capabilities

- None.

## Impact

- `src/bootstrap.ts`, shared response/error handling, and health indicators.
- Swagger/OpenAPI generation and published docs.
- Lint/CI configuration and module boundary policy.
- Developer workflow for formatting, drift checks, and architecture validation.
