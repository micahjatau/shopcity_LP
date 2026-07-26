## Context

Sprint 2's financial-integrity core is complete, but repo review 20 identifies cleanup work that must land before formal Sprint 2 closure and Sprint 3 redemption design. The current production scripts assume `dist/main` and `dist/worker`, while repository evidence indicates Nest emits `dist/src/main.js` and `dist/src/worker.js`. Receipt capture now routes through canonical loyalty and approval services, but `ReceiptsService` still contains stale duplicate transaction, idempotency, duplicate-receipt, and approval logic. The earn endpoint is not explicitly throttled even though request throttling infrastructure already exists. Cashier-accessible customer and card reads expose more PII than the sales workflow needs. Several OpenAPI examples and Sprint 2 checklist entries overstate runtime behavior, and list endpoints remain unbounded.

The change is a maintenance and contract-hardening pass, not a new financial model. It must preserve append-only financial history, avoid frontend-trusted balances or approvals, keep REST/OpenAPI as the public contract, and use Redis-backed infrastructure already present in the backend.

## Goals / Non-Goals

**Goals:**

- Make production API and worker entrypoints match verified build artifacts and fail CI if either executable artifact is missing.
- Remove stale receipt financial orchestration so future work cannot build on duplicate receipt logic.
- Add explicit earn endpoint throttling and `429 RATE_LIMITED` OpenAPI coverage without weakening idempotent retries.
- Return cashier-specific customer/card DTOs that expose only workflow-required fields and audit privileged PII reads.
- Keep error-code documentation and endpoint examples truthful to runtime behavior.
- Add cursor pagination to currently unbounded list endpoints using stable ordering.
- Record visible CI and migration-tracker evidence before Sprint 2 is called closed.

**Non-Goals:**

- Do not introduce redemption, reversal, expiry execution, adjustment, or debit ledger behavior.
- Do not change confirmed ledger entries, credit lots, receipt evidence, or approval history.
- Do not introduce GraphQL, microservices, or a new rate-limit dependency.
- Do not redesign the frontend or add broad reporting/fraud modules.

## Decisions

1. Align scripts to the existing build output instead of changing the build layout.

   The smallest safe fix is to make production scripts point to the artifacts Nest already emits, then smoke-test those paths after `npm run build`. Changing `nest-cli.json` output layout would have broader downstream effects and is unnecessary for this cleanup.

2. Remove `ReceiptsService` from `ReceiptsModule` unless a compatibility adapter is required by live imports.

   The public receipt controller already delegates earning to `LoyaltyService` and decisions to `ApprovalsService`. If no active consumer requires `ReceiptsService`, delete it and remove provider/export registration. If an active import remains, keep only an adapter that forwards to canonical services and contains no transaction, idempotency, duplicate-receipt, or approval-policy logic.

3. Use the existing throttle guard and Redis-backed throttle service for earn.

   The earn route should add `@Throttle` metadata with a key factory that includes tenant, authenticated staff user, and session device. This reuses established infrastructure and keeps legitimate client retries protected by idempotency. Shared OpenAPI response helpers can add `429` support additively because they already centralize error envelopes.

4. Introduce role-specific DTO mapping at controller/service boundaries.

   Cashier customer/card responses should be mapped to explicit DTOs containing `customerId`, `fullName`, `maskedPhone`, card status, and available balance. Supervisor/admin paths can retain fuller operational details where needed, but full phone/email reads must be deliberate and audited. This avoids relying on Prisma object spreading and reduces accidental field exposure.

5. Preserve anti-enumeration for earn unless product explicitly chooses distinct operational errors.

   The safer default is to keep inactive card, blocked customer, and staff-ineligible states masked as `CARD_NOT_FOUND` in the earn flow, then correct docs and issue evidence to state that decision. If implementation chooses distinct staff-only errors, it must update OpenAPI, tests, and privacy rationale together.

6. Move approval-policy examples to the approval decision endpoint.

   `PURCHASE_REQUIRES_APPROVAL` and `APPROVAL_POLICY_CHANGED` do not represent earn endpoint `422` behavior. The earn endpoint should document runtime earn errors only, while `POST /api/v1/approvals/{id}/decision` owns approval execution and policy-change errors.

7. Use cursor pagination with timestamp-plus-ID ordering.

   Customer search, customer ledger, and approval queue responses should accept `limit` and `cursor`, return `nextCursor` and `hasMore`, and order by a stable timestamp plus ID. This avoids offset drift and provides a predictable frontend contract before usage grows.

## Risks / Trade-offs

- HIGH GitNexus blast radius for `toPublicCard` -> Keep DTO changes explicit, avoid broad object spreading, and add regression tests for card create, replace, update, and lookup flows.
- Shared OpenAPI helper changes can affect many controllers -> Add `429` support as an opt-in/additive response and verify existing error examples remain stable.
- Throttling could block legitimate POS retries -> Key by user and session device, start with TRD financial endpoint limits, and rely on idempotency for safe retry responses.
- Removing `ReceiptsService` could break hidden imports -> Search for all imports before deletion; if a live consumer remains, replace with a forwarding adapter instead of duplicate logic.
- Pagination changes alter API shapes -> Add contract tests and update OpenAPI before frontend adoption; keep stable ordering and deterministic cursor encoding.
- CI evidence depends on external workflow availability -> Record commit SHA, run URL, job names, and build/OpenAPI results; if GitHub CI is unavailable, document manual dispatch evidence and keep closure blocked.
