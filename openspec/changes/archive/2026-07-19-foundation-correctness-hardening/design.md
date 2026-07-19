## Context

The repo now has a working API foundation and phase-1 business modules, but the contract layer still has correctness risks: path composition is easy to drift, health failures do not yet clearly surface as 503s, Swagger does not fully reflect envelopes, and boundary rules are documented rather than enforced. This change hardens the baseline without adding domain scope.

## Goals / Non-Goals

**Goals:**
- Make generated API contracts match runtime behavior.
- Make health/readiness behavior accurate and failure-visible.
- Make request tracing and error codes stable for frontend mapping.
- Enforce module boundaries and CI hygiene so regressions are caught early.

**Non-Goals:**
- Add new business workflows.
- Change phase-1 resource semantics.
- Introduce new infrastructure beyond what is needed for verification and boundary enforcement.

## Decisions

- Use `dependency-cruiser` for module-boundary enforcement.
  - Alternatives considered: `eslint-plugin-boundaries`. Rejected for this PR because the repo needs explicit architecture reports and folder-graph rules are easier to express and review centrally.

- Keep Swagger disabled in production by default.
  - Alternatives considered: always serve docs with auth. Rejected because the repo treats production as a narrower attack surface and docs are already available in generated artifacts.

- Treat request ID as a first-class response concern, not a logging-only concern.
  - Alternatives considered: log correlation only. Rejected because frontend error handling and support workflows need the same identifier in the API payload.

- Align runtime envelopes and OpenAPI schemas from the same source of truth.
  - Alternatives considered: manual Swagger examples. Rejected because manual examples drift too easily from the interceptor/filter output.

- Keep health endpoints public, but make readiness fail closed.
  - Alternatives considered: authenticate health. Rejected because orchestration and uptime checks must remain unauthenticated.

### Boundary sketch

```text
src/modules/*  -> approved shared layers only
src/common/*   -> utilities/policy primitives
src/config/*   -> configuration only
src/database/* -> persistence only
src/supabase/* -> identity integration only
src/jobs/*     -> background workers only
```

### Contract flow

```text
request -> requestId assignment -> handler -> envelope/filter -> response
                                \-> error code mapping -> structured error
```

## Risks / Trade-offs

- Boundary tooling can be noisy at first -> mitigate with a narrow allowlist and explicit ownership rules.
- Swagger gating might hide docs in environments where teams expect them -> mitigate with an explicit docs flag.
- More stable error codes means more contract surface -> mitigate by limiting codes to known domain and platform cases.

## Migration Plan

- Add boundary and drift-check tooling and wire it into scripts/CI.
- Update the request/error envelope plumbing and Swagger metadata together.
- Verify health/readiness behavior with integration tests.
- Keep changes additive and reversible; no data migration is required.

## Open Questions

- Should request IDs be stored in a response header in addition to JSON metadata?
- Which environment variable should control Swagger exposure outside production?
- Should boundary enforcement be shared between ESLint and CI, or live only in the dedicated architecture check?
