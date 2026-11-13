# Design: Admin Device and Branch Management Workflows

## User experience

Use the Admin Customer/Staff directory visual language: centered page frame and `CashierPageHeader`, restrained card surfaces, compact semantic tables, status badges, primary create action, row-level **View profile** links, responsive mobile records, accessible loading/empty/error states, and five-row pagination. Keep workflow details on dedicated routes rather than embedding create and edit forms in the directory.

Routes:

- `/admin/devices`: device directory, search/status/binding filters, and **Register device** action.
- `/admin/devices/new`: device registration form.
- `/admin/devices/[deviceId]`: device details and authorized operational/security management.
- `/admin/branches`: branch directory, search/status filter, and **Create branch** action.
- `/admin/branches/new`: branch creation form.
- `/admin/branches/[branchId]`: branch profile, editable configuration, and assigned-device list.

The existing Operations → Controls cards remain the entry point; no duplicate sidebar destinations are added. The nested route families stay covered by the Admin shell's Operations route authorization and active navigation handling. Direct navigation and refresh on a profile route must work.

Directory lists use the current tenant-scoped array endpoints. Search, filters, and five-row page slicing apply only to the returned authorized list; this is client-side pagination, not a server total or a claim that the API is cursor-bounded. Reset to page one when search/filter inputs change. Distinguish no records from request failure, provide retry, and do not render fabricated records.

### Devices

The directory shows device name, branch, active/inactive status, binding/pairing state, last-seen time, and **View profile**. Search matches name and branch; filters cover status and binding/pairing state. Creation collects device name and required branch using the Admin tenant's branch list, submits through existing `POST /devices` with CSRF and an idempotency key, and navigates only after a confirmed response containing the device ID. A newly created device is clearly identified as unpaired/non-operational until pairing succeeds.

The device profile resolves the ID from the existing Admin tenant-wide device list and displays branch, status, binding mode, paired state, credential state, and available last-seen/account timestamps. It adds editable device name using existing `PATCH /devices/:id`; preserves status changes, pairing, WebAuthn enrollment, token reset, credential revocation, and legacy HMAC rotation/one-time secret behavior already supported by the API/UI. Destructive or session-invalidating actions retain explicit confirmation and clear impact copy. Pairing is completed only on the authorized target POS browser with the existing origin, qualification, WebAuthn, and credential protections. Never place raw credentials/secrets in the URL, persistent storage, logs, audit metadata, or ordinary profile response; the existing one-time HMAC secret disclosure remains transient and explicitly identified as a legacy-only exception. Never display a fingerprint hash as a management identifier.

The Admin route remains tenant-wide via existing Admin authorization. The Supervisor route continues to use its existing branch-scoped API behavior and presentation; do not change that caller while extracting/reusing device presentation. If a route ID is missing or outside the authorized result list, show a safe unavailable state and a link back to Devices.

### Branches

The directory shows branch name, status, timezone, receipt-week start day, assigned-device count, and **View profile**. Search matches branch name/timezone; status filtering is over the returned branch status. Creation collects a required name, timezone, and receipt-week start day (0–6, with the current Lagos/Monday defaults), then uses existing `POST /branches`. On a confirmed response with a stable branch ID, navigate to its profile. Since the current branch-create endpoint does not consume idempotency keys, prevent concurrent submissions and, after an ambiguous network failure, refresh the branch list before offering retry rather than claiming server idempotency.

The branch profile shows authoritative branch fields and the devices associated by `branchId`, with links to each device profile. Edit name, timezone, and receipt-week start day through existing `PATCH /branches/:id` with CSRF protection and an explicit confirmation consistent with the existing branch workflow. The current branch create/update endpoints do not consume idempotency keys, so prevent concurrent/double submissions in the UI and, after an ambiguous network failure, refresh authoritative branch state before offering a retry rather than promising server idempotency. Keep the persisted status visible but read-only: current `UpdateBranchDto` does not support status changes. Device association is also read-only because the device update contract does not support reassignment. Do not expose fingerprint hashes, tenant identifiers as editable fields, or raw backend response JSON.

### Data, authorization, and API boundaries

The existing branch endpoints are Admin-only and derive tenant scope from the authenticated session. Admin device operations remain tenant-scoped and use existing Admin-only scope; existing device APIs also serve branch-scoped Supervisors. All profile lookups must be performed against the authorized API response and must not trust a client-provided tenant/branch scope. Keep CSRF and existing device idempotency, audit, credential revocation, and session invalidation behavior unchanged. Do not claim server idempotency for branch create/update: those current endpoints do not consume idempotency keys. Do not widen list projections or add fields that expose secrets. The existing endpoints return arrays; adding backend cursor pagination is outside this proposal unless scale evidence and a separate contract change require it.

## Risks and mitigations

- Device management combines high-impact authentication and credential operations. Keep current security gates and confirmations intact, add tests for all existing Admin/Supervisor route behaviors, and avoid changing the shared backend service.
- Creating a device does not make it usable for cashier sign-in. Make its unpaired state explicit and retain the authorized-browser pairing flow.
- Branch status exists in persisted data but is not editable through the current API. Render it read-only; do not imply that a UI action deactivates a branch.
- List endpoints currently return arrays without cursors. Make client-side pagination explicit and revisit only with observed scale or a separately designed bounded-list API.
- Browser/API failure and stale list data can make profile lookups unavailable. Provide retry and never substitute a different record or trust route input for authorization.

## Verification

Cover directory search/filter/pagination and responsive/empty/error states; create → confirmed profile navigation; device rename/status/pairing/credential workflows; branch edit/device associations; nested Admin route authorization; and unchanged Supervisor branch scope. Run focused web and backend tests, typecheck/lint/format, route/browser checks, OpenSpec validation, and GitNexus change detection before implementation completion. Verify no secrets or fingerprints are rendered or persisted.
