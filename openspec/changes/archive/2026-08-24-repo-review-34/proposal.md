## Why

The halfway production gate remains a no-go because review 34 identified unresolved blockers in device-bound session security, financial concurrency, receipt remediation safety, SMS integrity, migration evidence, contract drift, CI coverage, and release governance. This change turns that review into an implementation-ready production unlock plan so development can continue without treating incomplete evidence as production approval.

## What Changes

- Add device-bound session revalidation so blocked, moved, deleted, or branch-ineligible devices cannot continue using or refreshing existing sessions.
- Add persistent device-attestation nonce consumption and replay rejection, including deterministic cleanup and stable error handling.
- Harden approval decisions and expiry so all eligibility checks execute against post-lock aggregate state and related Receipt/Redemption transitions are atomic.
- Add durable batch-scoped receipt quarantine semantics with actor attribution, reviewed evidence preservation, revalidation, count checks, and rollback on partial writes/deletes.
- Resolve receiptless ledger branch ownership for Adjustment/Reversal visibility, or explicitly disable those capabilities for the halfway release if branch ownership cannot be safely implemented.
- Strictly validate every active SMS payload before provider invocation and classify malformed payloads as terminal failures.
- Restore actual shared-database backup verification and independent migration checksum reconciliation without reconstructing migration history during assertions.
- Align Adjustment model nullability and regression coverage with the database invariant that committed Adjustment records require ledger linkage.
- Correct OpenAPI/generated-contract drift for errors, device revocation, attestation replay, and receiptless transaction responses or their explicit deferral.
- Expand lint/format/contract validation coverage so new tests, docs, OpenSpec artifacts, SQL runbooks, and generated contracts cannot silently bypass CI.
- Produce exact-head CI, production SMS, migration, tracker, issue, and release-evidence artifacts before the halfway gate is approved.
- **BREAKING**: Existing active device sessions become invalid immediately when their linked device or device branch becomes ineligible.
- **BREAKING**: Replayed device attestations that previously succeeded within the timestamp window are rejected with a stable replay error.

## Capabilities

### New Capabilities

- `device-session-security`: Device-bound sessions and attestations are continuously validated, replay-protected, revoked on device ineligibility, and audited.
- `approval-aggregate-safety`: Approval decisions and expiry operate on locked, freshly re-read aggregates and transition related financial records atomically.
- `receipt-quarantine-safety`: Receipt quarantine uses durable batches, actor-attributed approval/execution, audited snapshots, dependency reconciliation, and transactional count checks.
- `receiptless-ledger-branch-ownership`: Receiptless financial entries have a tenant-safe branch ownership model for branch-scoped reads, transaction detail, and approval lists, or are formally disabled for the halfway release.
- `sms-payload-validation`: Every active SMS template has a discriminated payload contract, validated builders, terminal malformed-payload handling, and provider-call prevention for invalid messages.
- `repository-validation-coverage`: Lint, formatting, SQL, contract, generated-artifact, and CI validation scopes cover all tracked release-critical sources and evidence.

### Modified Capabilities

- `migration-safety`: Shared backup restore verification and checksum reconciliation must use the original restored `_prisma_migrations` rows before any repair command, plus database-object and behavioural probes.
- `financial-workflow-contracts`: Adjustment model nullability, Adjustment regression coverage, approval state handling, and receiptless transaction responses must align with database invariants and release scope.
- `sms-delivery-truthfulness`: Production SMS readiness must prove real-provider configuration, no production fake-provider bypass, delivery smoke evidence, idempotency, retry classification, and outage handling.
- `api-error-contract-accuracy`: Public error examples and generated OpenAPI/client artifacts must match runtime envelopes, including device revocation and attestation replay errors.
- `sprint-2-release-evidence`: Release evidence, tracker state, issue state, and exact-head CI results must be attached to one immutable release-candidate commit before production approval.

## Impact

- Affected modules include auth/device session resolution and refresh, device attestation verification, approval decision/expiry services, receipt quarantine operational SQL/scripts, ledger/read-model APIs, SMS outbox payload builders and worker classification, Adjustment schema/services/tests, OpenAPI generation, CI workflows, lint/format configuration, migration verification scripts, and release documentation.
- Database changes may include device attestation nonce storage, quarantine batch metadata, immutable branch provenance for receiptless ledger entries, Adjustment nullability alignment, indexes, constraints, and migrations with tracker updates.
- Operational impact includes stricter production gate evidence, protected shared-backup restore verification, real SMS smoke testing, release issue reconciliation, and exact-SHA CI requirements.
