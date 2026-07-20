## 1. Redis Throttling

- [x] 1.1 Replace the in-memory throttle counter with Redis-backed atomic counters.
- [x] 1.2 Update throttle keying so login and card lookup use stable client/account context instead of the requested serial number.
- [x] 1.3 Add tests for Redis-backed rate limiting and normalized login buckets.

## 2. Tenant Ownership Completeness

- [x] 2.1 Add tenant-aware ownership constraints for customer registeredBy, card issuedBy, card replacement, and audit actor links.
- [x] 2.2 Add a migration validation step that fails on any cross-tenant actor or audit references.
- [x] 2.3 Add tests that prove cross-tenant actor/audit writes are rejected.

## 3. Bootstrap Hardening

- [x] 3.1 Reject placeholder and weak bootstrap passwords in non-test environments.
- [x] 3.2 Update the bootstrap path and local setup docs to explain how to obtain and use Supabase credentials.
- [x] 3.3 Add tests for bootstrap password validation and explicit Supabase credential handling.

## 4. Pre-Ledger Model Alignment

- [x] 4.1 Add the customer email field and lookup/search coverage required before ledger work.
- [x] 4.2 Rename or finalize the card serial contract and document the chosen receipt vs sale-record shape.
- [x] 4.3 Add tests or contract checks that lock in the final pre-ledger naming decisions.
