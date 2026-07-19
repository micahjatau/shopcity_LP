# Domain Model

The core domain is a loyalty ledger with controlled customer identity, card assignment, receipt-based earning, redemption, approvals, and audit history.

## Core Boundaries
- `auth`: sessions, roles, and access control.
- `users`: staff accounts and ownership.
- `branches`: branch rules and operational context.
- `customers`: customer identity and status.
- `cards`: card lifecycle and replacement.
- `loyalty`: earn, redeem, reversal, and balance logic.
- `receipts`: receipt uniqueness and checkout references.
- `approvals`: supervisor actions.
- `notifications`: SMS intent and delivery tracking.
- `audit`: immutable history of important actions.
- `fraud`: suspicious activity detection.
- `reports`: operational and owner views.

## Domain Rules
- The server owns balances and approvals.
- Ledger history is append-only.
- Offline redemption is prohibited.
- Credit expires by policy, not client logic.
