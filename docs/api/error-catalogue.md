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
