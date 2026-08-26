## Context

Sprint 3 already has reversal, adjustment, read-model, audit, and OpenAPI plumbing in place, but the review shows a few behavior mismatches remain. The relevant code lives in `src/modules/reversals/`, `src/modules/adjustments/`, `src/modules/loyalty/`, `src/jobs/`, and the OpenAPI export/client generation scripts.

## Goals / Non-Goals

**Goals:**

- Make eligible earn reversals complete successfully and remain idempotent under replay/concurrency.
- Make manual adjustment expiry server-authoritative and enforce the configured amount ceiling.
- Make receiptless transaction read models truthful instead of fabricating receipt fields.
- Remove the false `redemption.expired` audit event from rejection flows.
- Regenerate OpenAPI and client artifacts so docs match runtime behavior.

**Non-Goals:**

- Redesign the financial domain model.
- Add new transaction types or change approval policy semantics beyond the closure fixes.
- Replace the existing Nest/Prisma/OpenAPI stack.

## Decisions

1. Keep reversal and adjustment behavior inside the existing service layer.

- Rationale: both flows already use serializable transactions, idempotency records, and audit/outbox persistence. Extending those services keeps the change localized and preserves current retry semantics.
- Alternatives considered: splitting closure logic into new orchestration services or background jobs. Rejected because the work is synchronous request handling and does not need a new execution layer.

2. Make adjustment expiry server-owned by removing caller control from the public DTO.

- Rationale: the review identifies caller-supplied expiry as a policy leak. The service should read `ADJUSTMENT_CREDIT_EXPIRY_MONTHS` and fall back to the documented default.
- Alternatives considered: accepting the field but ignoring it, or validating it against config. Rejected because the public shape would still suggest caller control.

3. Serialize receiptless transactions with explicit null receipt fields plus type-specific detail.

- Rationale: synthetic receipt/card identifiers are misleading. Returning nulls for receipt-only fields and separate detail blocks keeps the model truthful without breaking the general transaction response envelope.
- Alternatives considered: keeping synthetic placeholders or creating a separate endpoint. Rejected because placeholders violate truthfulness and a new endpoint is unnecessary for this closure pass.

4. Treat contract regeneration as part of implementation, not a spec concern.

- Rationale: OpenAPI/client artifacts are derived outputs and should be regenerated from the runtime app after code changes. The change should verify them, not model them as product behavior.
- Alternatives considered: making the proposal/spec about documentation generation. Rejected because the user-facing behavior is the transaction contract, not the build tooling.

## Risks / Trade-offs

- [API break] Removing `expiryMonths` from adjustment requests can break callers that were relying on it. Mitigation: regenerate OpenAPI/client output and keep the service authoritative.
- [Concurrency] Reversal replay and concurrent reversal attempts can still race if the idempotency record or original transaction guard is mishandled. Mitigation: keep the current serializable transaction flow and add success/replay/conflict tests.
- [Read-model churn] Changing receiptless transaction serialization may affect downstream consumers. Mitigation: make the type-specific fields explicit and cover the returned shape with tests.
- [Audit/reporting drift] Removing the false expiry event may change historical counts in dashboards. Mitigation: only correct future writes; do not rewrite past audit data.

## Migration Plan

1. Update reversal and adjustment service logic first.
2. Update DTOs and read-model serialization to match the new contract.
3. Remove the false rejection expiry audit write.
4. Regenerate `docs/api/openapi.json` and `client/shopcity-client.ts` from the updated app.
5. Run the targeted reversal, adjustment, read-model, and contract tests.
6. If a rollback is needed, revert the service/DTO changes together with the regenerated artifacts so code and contract stay in sync.

## Open Questions

- Should the reversal API return a stable conflict or the original replay response for every duplicate attempt, or only for exact idempotent replays? The implementation already distinguishes those cases, so the spec should match the current runtime behavior.
- Do any downstream consumers need a deprecation notice for the removed `expiryMonths` request field?
