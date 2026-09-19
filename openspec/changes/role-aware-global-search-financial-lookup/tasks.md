## 1. Baseline and contract mapping

- [ ] 1.1 Confirm HEAD `09a97b1f`, preserve unrelated dirty files, inspect current topbar/sidebar and supplied reference states.
- [ ] 1.2 Run GitNexus impact for `AppTopbar`, `AppShellContent`, `useCashierLookupController`, `EarnTransactionForm`, `RedeemTransactionForm`, and customer/user contract consumers.
- [ ] 1.3 Validate proposal/spec/design and document existing customer/card/user authorization behavior before changing contracts.

## 2. Authorized directory contracts

- [ ] 2.1 Add a minimal Supervisor/Admin cashier directory endpoint with tenant scope and Supervisor branch scope; do not broaden `/users`.
- [ ] 2.2 Regenerate OpenAPI/client artifacts and add backend authorization/unit coverage for Cashier, Supervisor, Admin, cross-branch, and cross-tenant cases.
- [ ] 2.3 Add frontend-safe result normalizers for customer, card, and cashier results; preserve Cashier masking and selected-record route data.

## 3. Global search and topbar

- [ ] 3.1 Implement reusable role-aware `GlobalShellSearch` with Customers/Cards for Cashier and Customers/Cards/Cashiers for Supervisor/Admin.
- [ ] 3.2 Implement controlled input, directory debounce, explicit card search, stale-response protection, loading/error/empty states, keyboard arrows, Enter, Escape, and focus restoration.
- [ ] 3.3 Replace inactive topbar search/notification/false online copy with the search, avatar, mobile navigation control, accessible session information, and existing offline indicator.
- [ ] 3.4 Add role-category, masking, authorization, destination, accessibility, and no-keystroke-card-lookup tests.

## 4. Shared financial lookup

- [ ] 4.1 Extract `VerifiedCardLookupStep` from duplicated Earn/Redeem initial lookup presentation using explicit shared classes/tokens.
- [ ] 4.2 Integrate the shared component into Capture Purchase and Redeem while preserving controller props, financial safeguards, route-specific outer widths, and guided transitions.
- [ ] 4.3 Remove Redeem generic initial WorkflowSection fallback and ensure no empty lookup sections remain after transition.
- [ ] 4.4 Add paired unit/visual states for idle, loading, failure, verified customer, and confirmation; compare component geometry.

## 5. Verification and delivery

- [ ] 5.1 Run affected Jest, accessibility, and Playwright suites at desktop/mobile widths with role fixtures and selected-record links.
- [ ] 5.2 Capture and inspect paired Capture/Redeem screenshots; do not blindly update baselines.
- [ ] 5.3 Run frontend lint, typecheck, build, integration, Semgrep/security, OpenSpec validation, and generated-artifact diff checks.
- [ ] 5.4 Run GitNexus detect_changes at the final commit SHA, inspect dirty-file contamination and residual risks, and document evidence.
