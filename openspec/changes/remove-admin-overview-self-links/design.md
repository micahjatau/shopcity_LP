## Design

The Admin shell persists across the Admin routes and already provides an Overview destination. Remove only the redundant header action targeting `/admin`.

- Admin Transactions: stop passing its optional `backHref`/`backLabel`; preserve related-task links and the shared workspace's generic optional return-link capability.
- Admin Approvals and Fraud: omit the Admin header action; preserve all workflow controls.
- Admin Cards and Reports: omit the Admin-only header action in the shared Supervisor/Admin component while preserving the shared Supervisor presentation, content, and behavior.
- Admin Users, Devices, Branches, Audit, Adjustments, and Policies: remove only their self-link; retain Operations → Controls navigation and other links.
- Preserve Admin customer profile **Back to customers**, registration handoffs, and all Supervisor/Cashier behavior.

Verification will scan all Admin route source for visible self-links, test the listed routes, and retain route/workflow regression coverage. No API, role, data, or route changes are needed.
