# Change: Admin Staff Directory and Profile Management

## Why

The Admin Users control currently mixes staff creation, the full directory, selected-user details, and role/status mutations in one unstyled page. Staff records are not presented like the existing Customer directory, and new accounts do not capture names or phone numbers. Admins need a familiar searchable list, a dedicated registration flow, and a navigable profile for review and account management.

## Goals

- Present `/admin/users` as a responsive, searchable, filterable staff directory consistent with the Admin Customer directory.
- Add a dedicated staff registration route with first name, last name, email, phone number, password, role, and required branch assignment.
- Add a direct staff profile route with contact/account details and Admin role/status review and update actions.
- Persist staff profile fields in ShopCity while retaining Supabase Auth as the password identity provider.
- Keep tenant scope, Admin authorization, server-owned roles, idempotent account changes, and session revocation behavior unchanged.

## Non-goals

- Do not add roles or allow assigning the internal `SYSTEM` role.
- Do not add staff self-service, invitations, password reset changes, or identity verification flows.
- Do not change customer workflows, financial behavior, account branch-update behavior, or the visible Operations sidebar.
- Do not change Supabase schema or configuration.

## Impact

- `admin-staff-directory`: Admin staff directory, registration, and profile workflows.
- User DTO/service and additive nullable Prisma profile fields for existing-user compatibility.
- Generated OpenAPI/client artifacts and migration tracker.
