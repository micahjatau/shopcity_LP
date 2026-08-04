## 1. Database Ownership Integrity

- [x] 1.1 Add composite ownership keys and foreign keys for branch-linked tenant data.
- [x] 1.2 Add a migration/backfill check that validates existing rows before enforcing the new constraints.

## 2. Card State Safety

- [x] 2.1 Make card status writes conditional inside the transaction so stale reads cannot overwrite a newer replacement.
- [x] 2.2 Require active customer ownership before reactivating a blocked card.
- [x] 2.3 Add race and transition tests for replacement, blocking, and reactivation.

## 3. Bootstrap and Local Supabase Safety

- [x] 3.1 Require an explicit administrator bootstrap password in non-test environments and reject weak defaults.
- [x] 3.2 Ensure bootstrap updates or verifies the Supabase administrator credential explicitly.
- [x] 3.3 Update local setup docs and seed flow guidance to include Supabase startup before seeding.

## 4. Request Throttling and Public Config Safety

- [x] 4.1 Add throttling for login, public config, and card lookup endpoints.
- [x] 4.2 Reject public configuration when the tenant is suspended or the branch is inactive.
- [x] 4.3 Add tests for throttled requests and inactive public configuration states.
