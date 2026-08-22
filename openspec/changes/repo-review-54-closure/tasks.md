## 1. Navigation source of truth

- [ ] 1.1 Add the missing Admin routes for Transactions, Customers, Approvals, and Fraud.
- [ ] 1.2 Keep Admin homepage quick actions aligned with the canonical registry.
- [ ] 1.3 Add a test that iterates every sidebar href and proves it resolves.

## 2. Shared workspaces

- [ ] 2.1 Extract shared Customer, Card, Transaction, Approval, and Fraud workspaces.
- [ ] 2.2 Remove page-level role reuse and pathname-based capability inference.
- [ ] 2.3 Rewrap Supervisor/Admin pages around shared workspaces instead of importing Cashier pages.

## 3. Shell behavior and accessibility

- [ ] 3.1 Implement a real collapsed icon rail with reduced width and accessible labels.
- [ ] 3.2 Make tablet use the rail pattern instead of a pseudo-expanded sidebar.
- [ ] 3.3 Add mobile drawer focus trap, inert background, and skip link behavior.
- [x] 3.4 Reduce the topbar to compact operational context.
- [ ] 3.5 Make the admin/home quick actions and sidebar route registry share the same route source of truth.

## 4. Cashier workflow completion

- [x] 4.1 Split Cashier home into focused Lookup / Earn / Redeem compositions.
- [x] 4.2 Remove duplicated route grids from cashier and admin home surfaces.
- [x] 4.3 Surface the authenticated device identity in shell/session context.
- [x] 4.4 Finish device-attested cashier login for Offline Earn.

## 5. Quality and evidence

- [x] 5.1 Restore the regression test that proves Sign in routes correctly.
- [x] 5.2 Add a route-resolution test that iterates every sidebar href and proves it resolves.
- [x] 5.3 Add visual-regression baselines for expanded, collapsed, tablet, and mobile shell states.
- [ ] 5.4 Reconcile OpenSpec tracking and deployment evidence with the actual branch state.
