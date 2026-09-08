# Proposal: Diagnose and repair staging smoke runtime failures

## Why

The exact master-lineage staging candidate `891c1d9e68daf602325df7a0f0c481a0e108c865` now reaches the correct Vercel projects, passes deployment protection bypass, and reports the expected release SHA. Smoke run `34203126869` still failed with 33 passing tests and 11 failures caused by backend `500 SYSTEM_ERROR` responses.

The failures affect smoke-session bootstrap retries and customer-ledger/financial workflows. Vercel request logs currently expose only generic `failed with status code 500` messages, preventing a bounded diagnosis of the underlying Prisma, Redis, or application exception.

## What changes

- Add safe, request-correlated diagnostics for unexpected staging API failures without logging secrets, cookies, authorization headers, query values, or sensitive payloads.
- Reproduce and identify the concrete causes of:
  - `POST /api/v1/auth/smoke-session` intermittent 500 responses.
  - `GET /api/v1/customers/:id/ledger` 500 responses.
  - Downstream role and financial smoke failures caused by those errors.
- Repair only the confirmed runtime, schema, configuration, or fixture issue(s).
- Add regression tests for each confirmed failure mode.
- Preserve append-only financial history, backend-owned authorization, integer-kobo accounting, and smoke fixture isolation.
- Verify the exact master-lineage candidate with the repository smoke, build, and targeted test commands before rerunning certification.

## Non-goals

- No GraphQL, microservices, or deployment-platform replacement.
- No direct SQL fabrication or mutation of device attestation secrets.
- No deletion or editing of confirmed ledger, audit, receipt, or transaction history.
- No weakening of smoke authentication, RBAC, rate limiting, or deployment provenance checks.
- No certification claim until three consecutive exact-SHA runs pass all gates.

## Acceptance criteria

- Every previously observed unexpected 500 has a safe request ID and actionable server-side diagnostic in the approved logging surface.
- Smoke-session bootstrap succeeds repeatedly for all configured roles without unhandled 500 responses.
- Customer ledger retrieval succeeds for the deterministic smoke customer and preserves reconciliation invariants.
- The targeted regression tests pass, including duplicate receipt, role bootstrap, earn approval, redemption, and reversal paths as applicable.
- The deployed frontend and backend both report candidate SHA `891c1d9e68daf602325df7a0f0c481a0e108c865`.
- No secret or authentication material appears in logs, test artifacts, or release evidence.
- Three consecutive staging certifications pass against the same exact master-lineage SHA.

## Impact

Potential implementation surface:

- `src/common/errors/http-exception.filter.ts`
- `src/modules/auth/`
- `src/modules/loyalty/`
- Prisma schema/migrations only if the confirmed diagnosis requires a backward-compatible database change
- targeted unit/integration smoke tests
- staging runtime configuration and release evidence

No financial behavior should be changed unless the diagnosis demonstrates an existing correctness defect and the change is separately reviewed against the TRD financial invariants.
