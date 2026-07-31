## Why

Review 27 shows the repo is in better shape on client parity and CI, but the release path is still blocked by migration safety gaps, ledger invariants, approval expiry behavior, and transaction read access control. This change closes the next hardening layer so the later reversal and adjustment work starts from a verifiable, auditable baseline.

## What Changes

- Reconcile shared Prisma migration history against committed migrations and require restore-based verification before release.
- Make redemption idempotency replay authoritative before mutable eligibility checks, add bounded retry handling for serialization conflicts, and keep rejection codes stable.
- Tighten credit-lot and reversal invariants so adjustment sources and restoration links are validated against the original debit.
- Move approval expiry out of request-time reads into a bounded scheduled worker with atomic related-record updates.
- Enforce branch-scoped transaction reads for cashiers while preserving tenant-wide access for privileged roles.
- Update release-evidence and tracker documentation so recorded evidence points only at reproducible commands and committed files.

## Capabilities

### New Capabilities
- `approval-expiry-worker`: scheduled bounded expiry processing with atomic state transitions.
- `transaction-read-authorization`: role-aware transaction access control with branch scope for cashiers and tenant scope for privileged roles.

### Modified Capabilities
- `migration-safety`: require backup/restore proof and migration ledger reconciliation.
- `financial-workflow-contracts`: require authoritative replay ordering, bounded retries, and unsupported financial combination rejection.
- `credit-lot-lifecycle-integrity`: require adjustment-compatible credit sources and original-debit restoration linkage.

## Impact

- Prisma migrations, backup/restore verification, and release evidence docs.
- Redemption, approval, and ledger validation code paths.
- Transaction read API authorization and DTO shaping.
- CI and tracker entries tied to release reproducibility.
