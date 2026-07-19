## 1. API contract correctness

- [x] 1.1 Remove the OpenAPI double-prefix by aligning the server URL and exported path set.
- [x] 1.2 Publish response-envelope and error-envelope schemas in Swagger for the primary API surfaces.
- [x] 1.3 Ensure generated OpenAPI output reflects the runtime envelope and path structure.

## 2. Runtime correctness

- [x] 2.1 Add request/correlation ID generation and propagation to success and error responses.
- [x] 2.2 Standardize domain exception mapping so known failures emit stable codes.
- [x] 2.3 Make health readiness return 503 on dependency failure.
- [x] 2.4 Replace Redis TCP probing with a real Redis `PING` check.

## 3. Docs and release gating

- [x] 3.1 Gate Swagger so it is disabled in production unless explicitly enabled.
- [x] 3.2 Add OpenAPI drift checks to the quality gate.
- [x] 3.3 Keep formatting and lint checks in the default verification path.

## 4. Architecture enforcement

- [x] 4.1 Add dependency-cruiser rules for module/shared-layer import boundaries.
- [x] 4.2 Wire the boundary check into `npm run lint` or an equivalent CI gate.
- [x] 4.3 Document the allowed import graph for module authors.

## 5. Verification

- [x] 5.1 Add tests for success-envelope docs, request ID propagation, and domain error codes.
- [x] 5.2 Add health tests for readiness failure and Redis ping behavior.
- [x] 5.3 Run the updated lint, OpenAPI, and boundary checks end to end.
