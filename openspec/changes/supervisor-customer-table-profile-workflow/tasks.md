## 1. Reconcile scope and route structure

- [x] 1.1 Review current Supervisor customer routes, registration/detail components, API contracts, and focused tests; record the exact reusable components and supported list fields in the implementation diff before refactoring.
- [x] 1.2 Reconcile `supervisor-customer-management-dialog` with the new profile-page requirement by updating/superseding its dialog-specific requirements and tests; verify OpenSpec has no active contradictory customer-selection behavior.
- [x] 1.3 Add the stable-ID Supervisor customer profile route and return-to-directory query handling; verify direct navigation, reload, and back navigation resolve to the same customer ID without trusting URL-supplied status or eligibility.

## 2. Build the table-first customer directory

- [x] 2.1 Replace the separate register/manage primary tabs with the Customers directory as the default route; verify `/supervisor/customers` opens on the table and existing supported deep links migrate safely.
- [x] 2.2 Add the desktop toolbar with explicit-submit name/phone/card-number search on the left and status filter then Register customer on the right; verify ordering, keyboard Enter submission, no per-keystroke calls, and mobile stacked order.
- [x] 2.3 Open an accessible modal dialog from Register customer and render the existing registration form inside it without duplicating/reducing fields or behavior; add `framer-motion` if not already installed and implement the `SuccessPopUp` spring scale-in plus SVG checkmark draw after authoritative confirmation only; verify dialog focus/dismissal, preserved registration safeguards, live success text, reduced-motion static state, and no popup on uncertain/failure.
- [x] 2.4 Extend the existing tenant-scoped customer-list projection with each customer's latest issued card serial, latest captured-and-approved purchase amount, and sum of confirmed EARN credits; replace Pending with Last purchase and verify no database schema, ledger writes, or card-lifecycle behavior changes.
- [x] 2.5 Implement table-shaped loading, initial-empty, no-results, retryable error, and result feedback states; verify live announcements and that failed searches do not misleadingly erase prior successful results.
- [x] 2.6 Preserve safe search context across reload/profile return and use supported server pagination when provided; verify query parameters contain no sensitive profile data and returned list results are not silently truncated.
- [x] 2.7 Add a status filter and five-row previous/next pagination styled like the Supervisor overview approvals table; verify filtering spans all cursor-fetched results and changing search/filter resets to page one.
- [x] 2.8 Add accessible ascending/descending sorting for Available, Last purchase, and Lifetime earned across the complete status-filtered result set before pagination; keep missing values last.
- [x] 2.9 Unify card number, virtual card number, serial, and barcode as one canonical customer card value while retaining the existing response alias; describe Last purchase as the latest full basket total and verify both projections.

## 3. Implement the verified customer profile page

- [ ] 3.1 Reuse/refactor profile UI into a full page with verified identity, read-only customer details, customer status, linked-card summary, Cards handoff, return navigation, and profile-shaped pending/error states; open the existing editable details/status presentation from an Edit dialog; verify loading, retry, and omitted-card-data behavior.
- [x] 3.2 Gate all writes on authoritative same-ID detail verification and preserve profile CSRF/idempotency, value verification, status confirmation, and response/error handling; verify mismatched or failed detail never exposes enabled writes.
- [x] 3.3 Preserve dirty edits on uncertain saves and require explicit keep/discard before leaving a dirty profile; verify close/back/route transitions retain edits or discard without writes as selected.
- [x] 3.4 Add the profile header, four summary cards, tabs, customer details, and responsive Overview composition from the supplied references; verify supported API-backed values are authoritative and SVG assets remain unchanged.
- [x] 3.5 Connect recent earnings, redemptions, approval outcomes, customer/card blocks, card issuance, and the expiry schedule to existing API sources or a narrowly scoped read-only customer endpoint; add loading, error, and empty states without schema or ledger/card lifecycle writes.
- [x] 3.6 Add Capture purchase and Redeem Credit actions that enter the existing protected workflows with stable customer context where supported; verify no profile-level write bypasses existing authorization, CSRF, idempotency, verification, or approval safeguards.
- [x] 3.7 Render the reference customer-details fields read-only from verified data, label unsupported birthday/count values as Not provided, and open the existing editor in an accessible modal; verify explicit dirty-edit keep/discard handling and that only a verified save closes the editor while remaining on the profile.
- [x] 3.8 Replace the Next expiry summary card with Annual Purchases and show Not provided until an authoritative annual-purchases value is available; keep the expiry schedule separate.
- [x] 3.9 Extend the authenticated Supervisor profile projection with each receipt's operation/status and confirmed earned/redeemed ledger movements; preserve combined settlement effects and keep pending requests distinct from confirmed movements.

## 4. Complete visual, responsive, and accessibility acceptance

- [ ] 4.1 Implement the ShopCity visual direction from the supplied supervisor customer references and the Supervisor overview approvals table using existing semantic tokens/primitives; verify toolbar alignment, table typography/density, pagination, button contrast, and no changes to the four reference assets.
- [ ] 4.2 Implement desktop table density and narrow-screen stacked customer entries without page-level horizontal overflow; verify at desktop, tablet, mobile, 200% zoom, long names/phones, and shell light/dark modes where supported.
- [ ] 4.3 Complete keyboard and assistive-technology states for toolbar, linked rows, registration, profile, statuses, errors, focus restoration, and reduced motion; verify accessible names, focus visibility, live-region behavior, and logical reading order.
- [x] 4.4 Apply the rem-based profile typography tokens to the summary cards, details, activity, tabs, and requested shell text without changing layout/button/sidebar colors; verify hierarchy and wrapping at 1280px, 1440px, and 1920px.
- [x] 4.5 Style the profile Transactions tab as a responsive table card matching the supplied reference and Overview tab; keep column headers visible in the empty state, render unavailable receipt number as Not provided, and map credit movement only from authoritative API data.
- [x] 4.6 Implement the Wallet Ledger reference as a responsive table card backed by the authenticated, cursor-paginated customer ledger endpoint; add receipt source and creator username to the read-only ledger contract, map supported values to columns, and show historical Balance After as Not provided unless the API supplies an authoritative snapshot.
- [x] 4.7 Move the verified ShopCity card preview from Manage cards to the customer profile Virtual Card tab; retain authoritative profile data, verified management details, and all protected management actions.
- [x] 4.8 Use the supplied `IMG-20260802-WA0001.jpg` as the Virtual Card preview background, preserve the asset unchanged, and verify it loads in the profile workflow.
- [x] 4.9 Open the protected card-management workflow from Virtual Card in an accessible in-profile dialog, prefill the assigned serial without skipping lookup/re-verification, and remain on the profile when closing.

## 5. Verify and close the change

- [x] 5.1 Extend focused Jest tests for directory, registration, profile route, API verification, status/save safeguards, query handling, customer-specific card/receipt/earned projections, numeric sorting, all list states, and responsive/accessibility contracts; verify the targeted test suite passes.
- [ ] 5.2 Add or update Playwright coverage for desktop and mobile directory/profile layouts, registration dialog, read-only customer-details card and edit dialog, verified-success animation/reduced-motion and failure states, search, row-to-profile navigation, direct profile reload, dirty-state handling, profile tabs, API-backed activity, expiry, virtual card, capture/redeem handoffs, and keyboard use; verify all affected workflows pass against the app.
- [ ] 5.3 Regenerate the OpenAPI/client contract, then run web lint, typecheck, tests, and production build; run applicable Semgrep and OpenSpec validation; verify every acceptance criterion has passing evidence and `git diff --check` is clean.
- [ ] 5.4 Review the final diff and worktree, preserve unrelated changes/reference assets, and report any unresolved visual or behavior decisions; verify only intended source, tests, and OpenSpec artifacts changed.
- [x] 5.6 Add regression coverage for earned, redeemed, combined-settlement, pending, and unavailable profile credit movements; regenerate OpenAPI/client artifacts and run focused backend/web checks plus strict OpenSpec validation.
- [x] 5.5 Verify Manage card opens a dialog with the verified serial prefilled, preserves the profile route/tab, and retains the existing lookup and action safeguards.
