## Context

The backend is a NestJS/Fastify monolith with Prisma-backed persistence, receipt capture, and session/device binding already in place. The current receipt flow improved a lot, but it still computes branch context before the write transaction, carries approval fields without a workflow, and stores idempotency records without a real expiry boundary.

## Goals / Non-Goals

**Goals:**

- Make receipt persistence authoritative at commit time.
- Add a clear approve/reject path for receipts that need review.
- Prevent expired idempotency records from blocking or replaying requests.
- Keep the change aligned with the existing modular backend layout.

**Non-Goals:**

- Implementing the immutable earnings ledger itself.
- Device attestation, hardware enrollment, or certificate-based terminal identity.
- Broader fraud review tooling or purchase ceiling changes.

## Decisions

- Use the existing Prisma/Nest stack rather than adding new infrastructure. The change is mostly about transaction boundaries and invariants, so the current toolchain is enough.
- Re-read and derive receipt-critical context inside a single transaction, with retryable isolation behavior if the database detects contention. This is safer than trusting precomputed branch values and simpler than mixing multiple lock styles.
- Model approval as an explicit receipt state transition with dedicated approve/reject operations. This keeps the workflow visible instead of encoding it as loosely coupled nullable fields.
- Treat expired idempotency records as logically absent at read time, and clean them up opportunistically or on a small background cadence. That prevents stale keys from becoming permanent request blockers.

## Risks / Trade-offs

- [Stronger transaction isolation can increase retry rate] -> Keep the transaction small and retry only on serialization failures.
- [Approval state changes widen the schema surface] -> Add tests around valid and invalid transitions before wiring any ledger behavior to the new states.
- [Idempotency cleanup can race with live requests] -> Make expiry checks atomic at read time so cleanup is only a hygiene mechanism.
