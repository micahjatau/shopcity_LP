## Context

The repo review follow-ups are cross-cutting: auth/session safety, loyalty read visibility, migration evidence, public contract accuracy, and SMS payload truthfulness all have live gaps. The design needs to close those gaps without introducing a new product surface or rewriting the financial model.

## Goals / Non-Goals

**Goals:**
- Make session refresh and guarded auth sensitive to device revocation.
- Prevent replay of accepted device attestations.
- Expose receiptless adjustment/reversal rows through the intended scoped loyalty reads.
- Bring migration evidence and OpenAPI examples back into alignment with the codebase.
- Validate SMS payloads consistently before rendering.

**Non-Goals:**
- No new customer-facing financial workflow.
- No API versioning or route redesign.
- No migration rewrite or backfill beyond the minimal fixes needed for the hardening pass.

## Decisions

- Track accepted device attestations in Postgres with a uniqueness constraint over the device-scoped nonce window, rather than relying on in-memory or Redis state. The login path needs replay resistance across workers and restarts, and this data is security-relevant enough to persist.
- Re-check device and branch eligibility during session refresh and auth-context resolution. Login-time validation alone is not sufficient once a device can be blocked after a session has been issued.
- Change the loyalty read helpers so branch-scoped reads can include receiptless adjustment and reversal entries when the actor is otherwise authorized, instead of using receipt joins as the only visibility gate. This keeps the read model aligned with the ledger shape.
- Treat OpenAPI output and formatting scope as generated contract assets, not hand-maintained snapshots. Updating the generation/formatting coverage reduces repeated drift in nested docs and API artifacts.
- Validate SMS payloads through a shared template guard before rendering. That keeps worker behavior consistent and prevents malformed outbox payloads from degrading into misleading copy.

## Risks / Trade-offs

- [Added auth persistence] -> Mitigate with a narrow nonce table and deterministic cleanup tied to the attestation window.
- [Broader loyalty visibility] -> Mitigate by keeping authorization checks explicit and preserving the existing tenant/branch scope rules.
- [Wider formatting scope] -> Mitigate by keeping the script list explicit so CI remains predictable.
- [Docs and tracker churn] -> Mitigate by updating the tracker and OpenAPI output in the same change so evidence and contract stay synchronized.

## Migration Plan

1. Add the auth/device replay guard and loyalty read-model updates behind normal application code paths.
2. Update the migration tracker and OpenAPI artifacts to reflect the current verified state.
3. Expand repo formatting coverage for tracked nested docs/artifacts.
4. Run the targeted tests and contract checks, then confirm the change is ready for implementation.

## Open Questions

- None at this stage. The remaining work is implementation and verification.
