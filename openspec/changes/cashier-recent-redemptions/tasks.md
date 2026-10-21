## 1. Implement read-only activity

- [x] 1.1 Add a focused recent-redemptions component using the existing cashier-today report; filter to redemption rows, validate amounts, and cover loading, empty, unavailable, and outcome states with unit tests.
- [x] 1.2 Mount the component only beneath the lookup step on Redeem Credit; verify it disappears after successful card verification and does not change Earn or lookup behavior.

## 2. Match the reference and verify

- [ ] 2.1 Add Redeem-scoped responsive styles for the accessible table, customer/receipt, amount, and status hierarchy; verify narrow layouts remain readable and do not expose unsupported contact fields. Responsive styles are implemented and the component exposes only supported fields; narrow-layout visual verification is blocked by missing Playwright Chromium.
- [ ] 2.2 Run focused Jest, web lint/typecheck/build, and strict OpenSpec validation; run the affected Playwright workflow and GitNexus change detection when available, recording any environment blockers without claiming them as passes.

## Verification status

- Passed: focused cashier lookup/redemption Jest suite (26 tests), web lint (no errors; one existing warning in `supervisor-flagged-activity.tsx`), web typecheck, Prettier, and strict OpenSpec validation.
- Blocked: both Next production-build attempts ended with the build worker receiving `SIGKILL`, including an isolated output directory; no source diagnostic was produced. Playwright visual verification remains unavailable because Chromium is not installed. Retry these checks when host resources and browser provisioning permit.
