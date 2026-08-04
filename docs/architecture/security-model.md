# Security Model

The backend must treat the client as untrusted for money, roles, and approvals.

## Controls

- Supabase-backed staff identity verification.
- Backend-owned application sessions, CSRF defense, and role-aware access control.
- Role-aware API access.
- Server-side validation of all request payloads.
- Structured logging with request correlation.
- Audit events for sensitive actions, including auth events.

## Invariants

- Frontend-submitted balances are never trusted.
- Confirmed ledger entries are never edited or deleted.
- Stale balances must not authorize redemptions.
- Sensitive actions require server-side authorization checks.
