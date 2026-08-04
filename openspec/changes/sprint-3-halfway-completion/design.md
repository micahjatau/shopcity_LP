## Context

Repo review 36 identifies a set of halfway-release blockers that span API contracts, device security, CI validation, protected restore evidence, SMS delivery, quarantine integrity, and the formal boundary around deferred receiptless capabilities. The repository already has related specs for financial workflow, SMS truthfulness, migration safety, and list pagination, but this change needs a coordinated release gate so the halfway state remains truthful and auditable.

The implementation must stay within the repo-local, backend-first architecture and avoid exposing deferred execution paths as if they were complete. Several items also require irreversible operational steps, especially device-secret migration and the protected restore workflow.

## Goals / Non-Goals

**Goals:**
- Freeze the halfway scope into explicit contracts and release gates.
- Remove misleading reversal availability and keep deferred execution paths unavailable.
- Complete the device attestation secret cutover without coupling it to session secrets.
- Make validation and CI gates real, non-tautological, and release-critical.
- Prove restore and SMS evidence at an exact immutable release SHA.
- Strengthen quarantine relational integrity and explicit operator identity.
- Keep receiptless read and execution capabilities out of the halfway release surface.

**Non-Goals:**
- Implementing actual transaction reversals or manual balance adjustments.
- Introducing new architectural layers beyond the current modular monolith.
- Reworking unrelated financial workflows that do not participate in the blocker set.
- Removing stored fingerprint data entirely if it is still needed for identification or deduplication.

## Decisions

- Split the release work into multiple capabilities instead of one umbrella spec. This keeps contract boundaries testable and prevents CI, security, and operational changes from being conflated.
- Treat reversal as unavailable for the halfway release rather than simulating asynchronous acceptance. This matches the current runtime truth and avoids durable side effects that imply execution.
- Use a dedicated `DEVICE_ATTESTATION_KEK` instead of deriving device-secret encryption from `SESSION_SECRET`. This decouples session rotation from device-secret decryption and supports safer rotation.
- Enforce branch-scoped device management through a shared authorization resolver. That keeps list/create/update decisions consistent and makes the admin-versus-supervisor boundary explicit.
- Replace the current validation-scope gate with an independently defined release-critical universe plus explicit validator mapping. The old implementation was self-referential, so the new version must inspect real scripts and CI jobs.
- Move protected restore proof into a manual, approval-gated workflow that checks out an exact release SHA and refuses to skip when backups are missing. This keeps production evidence separate from ordinary PR CI.
- Keep SMS closeout work focused on truthfulness and evidence rather than broader delivery redesign. The main changes are serialization correctness, directional wording, and a real-provider smoke path.
- Model quarantine integrity with relational constraints and explicit operator identity rather than relying on execution context alone. This reduces ambiguity in destructive batch operations.

## Risks / Trade-offs

- [Device-secret migration can lock out active devices if backfill is incomplete] -> Require a deterministic backfill command, session revocation only after successful persistence, and evidence counts before cutover.
- [Protected restore workflow adds operational friction] -> Keep it manual and approval-gated because it is release evidence, not routine CI.
- [Validation-scope checks may produce false negatives during the first rollout] -> Start with explicit coverage reports and fail only on verified missing scripts, CI commands, or uncovered critical paths.
- [Branch-scoped access can accidentally reveal device existence] -> Use 404 or a stable forbidden error for cross-branch access and test both list and mutation paths.
- [SMS smoke tests can leak sensitive provider data] -> Require redacted evidence output and a designated test destination only.
- [Quarantine constraints may require data backfill or expand-and-contract schema work] -> Add constraints only after the batch-scoped rows are fully populated and verified.

## Migration Plan

1. Land the proposal-aligned spec files and the design so all release boundaries are explicit.
2. Implement the reversal boundary and deferred capability documentation first so user-facing claims are truthful.
3. Add the device KEK, backfill path, and branch-scoped authorization helper before removing fingerprint fallback.
4. Replace validation-scope logic and wire the new checks into CI before relying on them as a release gate.
5. Add the protected release-evidence workflow and connect it to exact-head verification and artifact upload.
6. Apply SMS payload fixes, smoke tooling, and runbook updates.
7. Add quarantine relational constraints and explicit operator identity handling.
8. Run the full validation set on one immutable SHA, then capture evidence and only then mark the halfway gate complete.

Rollback is mostly by halting cutover before irreversible migration steps. For the device-secret work, keep the old fields and code paths until backfill is proven and active sessions have been revoked. For CI and workflow changes, rollback is by reverting the gating change while preserving the data model changes already applied.

## Open Questions

- Should receiptless boundary behavior live as a standalone spec in the change, or be folded into the reversal boundary and existing financial contract specs during implementation?
- Which protected storage source will supply the shared schema and data dumps for the release-evidence workflow: private object storage or a prior protected workflow artifact?
- Should the device backfill command emit a separate machine-readable summary file or only log JSON to stdout for release evidence?
