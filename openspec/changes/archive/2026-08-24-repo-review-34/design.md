## Context

Review 34 concludes that the halfway production gate is blocked even though core earn and redemption workflows are mature. The unresolved work is cross-cutting: auth sessions, device attestations, approval transactions, operational receipt quarantine, receiptless financial read models, SMS payload integrity, migration verification, OpenAPI/generated contracts, CI coverage, and release governance all need production-grade evidence before deployment can be approved.

The architecture remains a backend-first Nest modular monolith backed by Supabase/Postgres, Prisma, backend-owned sessions/RBAC, Redis/BullMQ, OpenAPI, and background SMS processing. Financial values remain integer kobo and confirmed financial history must stay append-only and auditable.

## Goals / Non-Goals

**Goals:**

- Make active device sessions continuously dependent on linked device eligibility.
- Prevent replayed device attestations from issuing additional sessions.
- Ensure approval decisions and expiry use post-lock state and atomic aggregate transitions.
- Make receipt quarantine batch-scoped, auditable, revalidated, and safe against partial deletion.
- Establish a defensible halfway scope for receiptless Adjustment/Reversal records.
- Validate every active SMS payload before provider calls and terminally classify malformed payloads.
- Restore independent migration-history and shared-backup verification as release evidence.
- Align Adjustment schema/types/tests with committed-only ledger linkage.
- Ensure OpenAPI, generated clients, CI, tracker, issue state, and release evidence all describe the same exact release candidate.

**Non-Goals:**

- Introducing GraphQL, microservices, or frontend-owned financial authority.
- Editing or deleting confirmed ledger history.
- Treating synthetic migration tests as proof that the real shared database is restorable.
- Shipping Reversal/manual Adjustment execution in the halfway release unless the full branch, approval, allocation, OpenAPI, and E2E scope is completed.

## Decisions

1. Device eligibility is enforced on every guarded request and refresh.

Session lookup must include the linked device and device branch. Guards and refresh/session rotation must reject sessions when the device is missing, blocked, moved to an incompatible branch, assigned to another tenant, or attached to an inactive branch. Blocking a device must revoke all active sessions for that device and write an audit entry. This avoids relying on login-time checks only.

Alternative considered: keep device checks only at login and add shorter session lifetimes. That still allows blocked devices to continue operating until expiry and does not satisfy the gate.

2. Attestation nonce consumption is persistent and transactional.

Accepted attestations must insert a nonce hash record under a unique device/nonce key in the same transaction that creates the session. Unique conflicts become stable replay errors. Expiry metadata and cleanup keep the table bounded. If `fingerprintHash` is not a high-entropy device/server secret, introduce a dedicated per-device secret with rotation and revocation.

Alternative considered: in-memory nonce caching. It fails across process restarts and multiple workers.

3. Approval execution uses post-lock aggregates only.

Approval decision handlers should resolve only the scoped approval ID before acquiring locks, lock all rows required for the target aggregate, re-read the complete aggregate after locks, re-run every eligibility check, and execute using only post-lock values. Conditional updates remain defence in depth. Expiry must require expected Receipt/Redemption update counts and roll back on missing or stale related rows. Deadline-driven expiry is attributed to SYSTEM or null actor with detector identity stored in metadata.

Alternative considered: keep pre-lock aggregate reads and rely on conditional updates. That leaves stale policy, receipt, card, customer, device, or approval state available to decision logic.

4. Receipt quarantine is converted from loose staging to durable batch workflow.

Every report, approval, stage, execution, and cleanup operation must be scoped to one batch ID. Batches preserve reviewed duplicate evidence, approval reason, actor/timestamp fields, execution fields, status, and notes. Execution locks staged receipts, revalidates duplicate state, verifies dependency/reconciliation plans, writes or updates quarantine snapshots, compares write/delete counts, and rolls back on any mismatch.

Alternative considered: clearing the existing stage table after execution. That reduces accidental reuse but still does not provide durable review evidence, actor attribution, or batch isolation.

5. Receiptless financial entries use immutable branch provenance unless deferred.

The long-term path is immutable tenant-safe branch ownership on ledger entries or equivalent evidence available to all reads. Receipt-linked rows can be backfilled from Receipt branch. Historical receiptless rows must have explicit provenance or be rejected from branch-scoped reads. If this cannot be completed for halfway, Reversal and manual Adjustment execution must be formally disabled and omitted from production capability claims.

Alternative considered: deriving receiptless visibility from nullable Receipt joins. That is the current blocker and excludes or misrepresents valid receiptless entries.

6. SMS payload validation moves to typed builders and terminal worker classification.

Each active template gets a discriminated schema with version/template consistency and validated IDs, phone numbers, integer amount strings, balances, expiry dates, and relationships where available. Outbox creation must use payload builders instead of raw payload construction. The worker must dead-letter malformed payloads on first processing attempt without calling the provider.

Alternative considered: template-specific rendering fallbacks. That produces misleading customer messages and retry noise.

7. Migration verification separates synthetic upgrade tests from real shared restore evidence.

Keep the synthetic upgrade-path test but name it accurately. Add a protected shared-backup restore verification that requires actual schema/data dump paths, restores into isolated Postgres, preserves `_prisma_migrations`, runs `prisma migrate status` before changes, deploys only pending migrations, compares original migration rows to repo migration files, verifies object inventory and behavioural probes, and emits a machine-readable reconciliation report.

Alternative considered: rebuilding `_prisma_migrations` with `migrate resolve` before assertion. That is circular and cannot prove shared migration authenticity.

8. Release evidence is immutable-SHA based.

The production gate must cite one release candidate SHA with green mandatory CI, migration restore evidence, production SMS configuration/smoke evidence, updated tracker rows, and reconciled release issue state. Implementation completion and production approval remain separate states.

Alternative considered: combining local results and CI from different commits. That does not prove the candidate being deployed.

## Risks / Trade-offs

- Device checks add database reads to guarded requests and refreshes -> keep lookup scoped, indexed, and included in existing session resolution paths.
- Nonce persistence adds a new write on login -> use a narrow table, unique index, expiry index, and deterministic cleanup.
- Approval locking may increase contention -> lock only rows needed for the scoped aggregate and keep transactions short.
- Receipt quarantine changes are operationally sensitive -> require dry-run/report review, batch states, count checks, rollback, and restoration procedure before execution.
- Receiptless branch backfill may uncover records without defensible provenance -> either reject them from branch-scoped release reads or defer receiptless capabilities until reconciled.
- Shared restore tests require protected real dumps -> keep them opt-in/protected, fail fast when paths are missing, and never silently substitute fixtures.
- OpenAPI/client regeneration can create broad diffs -> gate generated artifacts with clean-diff checks and review runtime envelope examples.

## Migration Plan

1. Add expand-only schema for device attestation nonce storage, quarantine batches, branch provenance if selected, and Adjustment nullability alignment after historical preflight.
2. Deploy code paths that write new records and validate new invariants while preserving append-only financial history.
3. Backfill receipt-linked branch ownership and reconcile any historical receiptless entries before enabling receiptless public reads.
4. Regenerate Prisma Client, OpenAPI, and API client after schema/API changes.
5. Update migration tracker with commit SHA, backup timestamp, restore target, migration counts, checksum report, SQL object report, behavioural probe result, and CI run.
6. Run exact-head CI and attach release evidence before changing the halfway production gate from no-go.

Rollback should disable new release capabilities rather than delete financial evidence. If a schema rollout needs rollback, keep additive tables/columns in place until a follow-up contract-and-data plan safely removes them.

## Resolved Baseline Decisions

- Halfway receiptless scope: defer receiptless Reversal/manual Adjustment execution for the halfway release. Existing reversal requests already return `REVERSAL_REVIEW_REQUIRED`; implementation must keep unsupported execution paths unavailable and keep API/release claims truthful until full branch provenance, approvals, allocations, SMS, audit, read models, OpenAPI, and E2E scope are complete.
- Approval expiry attribution: automatic deadline expiry uses a system/null decision actor, with the detecting user or worker recorded separately in audit metadata during implementation. This preserves the distinction between a human decision-maker and a process that detected an overdue approval.
- Device attestation secret: `Device.fingerprintHash` is not acceptable as the long-term HMAC key because the schema and name prove only a stored fingerprint hash, not a high-entropy device/server secret. Implementation must introduce dedicated per-device attestation secret material with rotation and revocation support.

## Open Questions

- Which issue will be the authoritative production gate: reopened Issue #1 or a dedicated halfway production readiness issue?
