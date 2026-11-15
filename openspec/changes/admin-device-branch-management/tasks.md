# Tasks: Admin Device and Branch Management Workflows

## 1. Device directory and registration

- [ ] 1.1 Replace the combined Admin Devices page with a Customer/Staff-style responsive directory, search/status/binding filters, five-row pagination, refresh, and loading/empty/error states.
- [ ] 1.2 Add `/admin/devices/new` with required tenant branch selection and device name; submit through existing CSRF/idempotent creation API.
- [ ] 1.3 Add confirmed create-to-profile navigation and clear unpaired/non-operational messaging.

## 2. Device profile management

- [ ] 2.1 Add `/admin/devices/[deviceId]` with safe in-scope lookup and device, branch, binding, status, credential, and timestamp details.
- [ ] 2.2 Add device rename using the current update API; retain status and existing token/WebAuthn pairing, reset, credential-revoke, and legacy-secret actions and confirmations.
- [ ] 2.3 Preserve authorized target-browser requirements, secret handling, audit/session invalidation behavior, and Supervisor branch-scoped device workflows.

## 3. Branch directory and creation

- [ ] 3.1 Replace the combined Admin Branches page with a Customer/Staff-style directory, search/status filters, five-row pagination, refresh, and loading/empty/error states.
- [ ] 3.2 Add `/admin/branches/new` with name, timezone, and validated 0–6 receipt-week start day; use the existing tenant-scoped branch create API.
- [ ] 3.3 Navigate to a branch profile only after confirmed creation with a stable branch ID.

## 4. Branch profile and navigation

- [ ] 4.1 Add `/admin/branches/[branchId]` with safe tenant-list lookup, branch configuration, read-only status, and associated devices linked to device profiles.
- [ ] 4.2 Add confirmed edits for name, timezone, and receipt-week start day through the existing CSRF-protected API; prevent concurrent submissions and refresh before retry after an ambiguous failure because branch updates are not idempotent. Do not expose branch status or device reassignment mutations.
- [ ] 4.3 Preserve Operations → Controls entry points, Admin-only nested route authorization, and no-duplicate-sidebar behavior.

## 5. Verification

- [ ] 5.1 Add focused frontend tests for directory search/filter/pagination, responsive/empty/error states, form validation, create confirmation/navigation, profile updates, and missing/out-of-scope IDs.
- [ ] 5.2 Add/extend browser tests for device and branch create → profile → management flows and direct nested-route reloads.
- [ ] 5.3 Verify device security controls and existing Supervisor branch-scoped behavior remain unchanged; audit UI/data for secret and fingerprint exposure.
- [ ] 5.4 Run focused tests, web typecheck/lint/format, route/build checks, OpenSpec validation, and GitNexus detection; record unavailable tools/index limitations and preserve unrelated worktree changes.
