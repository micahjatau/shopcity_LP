# Error Catalogue

## Canonical Error Families

- `AUTH_*` for authentication and session failures.
- `RBAC_*` for role and permission failures.
- `VALIDATION_*` for malformed payloads.
- `LEDGER_*` for balance and transaction rule failures.
- `RECEIPT_*` for duplicate or invalid receipt handling.
- `APPROVAL_*` for supervisor workflow failures.
- `SYNC_*` for offline or replay-related issues.
- `SYSTEM_*` for infrastructure or unexpected failures.

## Guidance

- Errors must be stable enough for frontend mapping.
- Do not expose internal stack traces to API consumers.
- Use structured responses that preserve operational context.
- `AUTH_*` covers invalid credentials, expired or revoked sessions, CSRF failures, suspension blocks, and login throttling.
- `RECEIPT_ALREADY_USED` is the canonical duplicate physical receipt code.
- `EARN_TRANSACTION_CONFLICT` represents exhausted serialization retries and should be treated as temporary/retryable by clients.
- `SYNC_RECORD_CONFLICT`, `SYNC_WEEK_MISMATCH`, `SYNC_DEVICE_MISMATCH`, `SYNC_BRANCH_MISMATCH`, `SYNC_ACTOR_MISMATCH`, `SYNC_RECORD_EXPIRED`, and `SYNC_RECORD_PROCESSING` are the stable offline-sync codes for replay and trust-boundary failures.
- `FRAUD_FLAG_CONFLICT`, `FRAUD_FLAG_NOT_FOUND`, `FRAUD_SCOPE_DENIED`, and `FRAUD_DECISION_INVALID` are the stable fraud review/detection codes for Sprint 4.
- `RECEIPT_ALREADY_CAPTURED` is legacy wording and should not be used for new duplicate receipt mappings.
