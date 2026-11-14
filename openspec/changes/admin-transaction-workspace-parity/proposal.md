# Admin transaction workspace parity

## Why

`/admin/transactions` currently provides an ID-only transaction lookup. Supervisors have a much more usable receipt-backed workspace with filters, cursor pagination, a results table, detail dialog, and a controlled reversal flow. Admins need that workspace while retaining their tenant-wide visibility and existing authority.

The Supervisor list endpoint is intentionally restricted to Supervisors and requires a branch. Reusing it or weakening its guard would either reject Admins or blur the existing branch boundary. Add a distinct Admin-authorized, tenant-scoped search contract instead.

## What changes

- Add a read-only Admin transaction search endpoint and isolated provider, scoped by default to the authenticated tenant across its branches, with an optional server-enforced branch filter within that same tenant.
- Keep the Supervisor search endpoint and branch scope unchanged.
- Render the Supervisor transaction workspace structure in the Admin route, using the Admin endpoint, preserving Admin links to Approvals, Fraud, and Reports, and retaining Admin detail/reversal permissions.
- Regenerate the OpenAPI document and generated client from the Nest contract.

## Out of scope

- No schema or migration changes.
- No changes to the Supervisor endpoint or its role/branch enforcement.
- No edits or reversals to transaction source records; reversal remains an existing append-only compensating action.
- No tenant-selection controls. The authenticated Admin sees tenant-wide results by default and may narrow them to one branch belonging to that tenant.
