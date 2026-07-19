## 1. Foundation and schema

- [x] 1.1 Add Prisma models for tenants, branches, devices, users, sessions, customers, cards, and audit_logs.
- [x] 1.2 Add database constraints for active phone uniqueness, card barcode uniqueness, and card replacement history.
- [x] 1.3 Generate the Prisma client and verify the schema compiles.

## 2. Auth and session boundary

- [x] 2.1 Add backend session service that wraps Supabase identity verification.
- [x] 2.2 Implement login, logout, refresh, and auth/me endpoints with backend-owned session state.
- [x] 2.3 Add role and suspension guards for cashier, supervisor, admin, and system access.
- [x] 2.4 Add CSRF/session plumbing for browser state-changing requests.

## 3. Master data APIs

- [x] 3.1 Implement branch and device read/write flows needed for phase-1 attribution and policy lookup.
- [x] 3.2 Implement customer registration, search, detail, update, and status endpoints.
- [x] 3.3 Implement card assignment, lookup, replacement, and status endpoints.
- [x] 3.4 Implement user creation, listing, role change, and status endpoints.

## 4. Audit and contract surface

- [x] 4.1 Add audit logging for auth, user, customer, and card mutations.
- [x] 4.2 Publish the phase-1 OpenAPI endpoints and examples.
- [x] 4.3 Update the generated API docs and frontend-safe public config contract.

## 5. Verification

- [x] 5.1 Add unit tests for session lifecycle, RBAC, and normalization rules.
- [x] 5.2 Add integration tests for customer registration, duplicate phone rejection, and card replacement history.
- [x] 5.3 Run lint, typecheck, and OpenAPI generation checks for the change.
