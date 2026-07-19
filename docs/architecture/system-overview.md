# System Overview

ShopCity is a backend-first modular monolith that provides a controlled store-credit ledger beside the existing POS. The API owns the source of truth for balances, approvals, fraud checks, and audit history.

## Structure
- `src/modules/` holds domain boundaries.
- `src/common/` holds shared framework helpers.
- `src/config/` holds validated configuration.
- `src/database/` holds Prisma access.
- `src/supabase/` is the DB and auth gateway.
- `src/jobs/` holds background work.

## Principles
- Keep business rules server-side.
- Keep money as integer kobo.
- Keep financial history append-only.
- Keep API contracts explicit and versioned.

## Scalability View
```text
HTTP/API -> feature module -> application logic -> Prisma/Supabase/queue
                         \
                          -> shared utilities only when truly generic
```
