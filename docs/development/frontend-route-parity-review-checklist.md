# Frontend route parity review checklist

A route is not complete because its screenshot matches. Review each route against the following before marking its parity row complete:

- [ ] Route and deep links resolve through the role-safe shell.
- [ ] Backend/OpenAPI operation and generated client method are identified.
- [ ] Tenant, branch, device, role, card, balance, eligibility, approval, and policy authority is server-owned.
- [ ] Loading, empty, validation, unauthorized, offline, stale-context, conflict, pending, success, and unexpected-error states are explicit.
- [ ] Keyboard, scanner, focus, mobile layout, reduced motion, and screen-reader behavior are covered.
- [ ] Sensitive fields and mutation controls are hidden or disabled for unauthorized roles.
- [ ] Recent/bounded activity is not presented as complete history.
- [ ] Unit/contract/integration and Playwright evidence exists for the route's critical actions.
- [ ] Accessibility and visual evidence were reviewed separately; visual snapshots are not sufficient alone.
- [ ] Rollback or recovery behavior is documented for consequential actions.

The reviewer records the route, viewport matrix, evidence links, intentional deviations, and residual risks in the parity matrix or change review.
