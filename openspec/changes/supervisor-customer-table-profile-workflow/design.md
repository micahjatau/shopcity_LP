# Design: Supervisor customer directory and profile

## Design status and decision record

This is a proposed first-pass design for review and iteration; it does not claim to reproduce every pixel of the reference exports. The four supplied files are the visual source material: `supervisor-customers-overview.svg`, `supervisor-customers-list-table.svg`, `supervisor-customer-table.svg`, and `supervisor-customer-profilepage-header.svg`. They are large SVG exports with ShopCity branding. Preserve them exactly as supplied; use them to guide implementation, not as full-page image backgrounds.

The brief resolves the initial interaction choices as follows, so implementation has a coherent target to review:

- Register customer opens an accessible modal dialog containing the existing registration form. The directory stays mounted behind it.
- Search is explicit-submit, not per-keystroke. It sits on the left; a status filter and Register customer action sit on the right, in that order. Its accessible label names customer name, phone number, and card number.
- The table uses the approval overview's typography, surface, row density, and previous/next pagination pattern. The Action column provides the stable-ID profile link; there are no nested interactive controls.
- On small screens rows become stacked, readable customer entries instead of forcing page-level horizontal overflow.
- Directory columns: Name (with phone as secondary text), Card number, Available, Last purchase, Lifetime earned, Status, and Action. Card number, virtual card number, card serial, and barcode are aliases for the assigned card's `Card.barcodeValue`; expose one canonical `cardNumber` projection while retaining the existing `activeCardSerialNumber` response alias for compatibility. Last purchase is the full basket total (`Receipt.purchaseAmountKobo`) from the latest captured-and-approved receipt; lifetime earned comes from confirmed EARN credit ledger entries for that same tenant/customer. These remain read-only projections; do not write ledger/card records or change the database schema. Missing card/purchase values are explicitly not provided; no placeholder/demo amounts or invented card numbers. The route remains scoped by authenticated tenant context; never accept tenant/branch authority from the browser.

## Design read and system

A staff-facing retail operations workspace: clear, restrained, familiar, and optimized for quick scanning. Preserve the current ShopCity Supervisor shell and existing shared UI primitives/tokens. The registration success popup is the sole proposed exception for a motion dependency: use `framer-motion` if it is not already installed; do not create a parallel design system.

The reference artwork suggests a pale neutral page canvas (`#F6F4F5`), white content surface, subtle gray borders/dividers, dark charcoal text, ShopCity red (`#BE1313`) for primary emphasis, and green only for positive/active status where the existing status system uses it. Reuse semantic tokens where possible rather than hardcoding these sample colors. Do not copy the reference's potentially decorative red gradients or tiny export-scale typography into functional controls. Keep text contrast WCAG AA, clear visible focus, restrained corner radius consistent with the application, and no decorative motion beyond standard focus/hover/press feedback.

## Directory page hierarchy

1. Existing application shell and page header, titled **Customers** with short practical supporting copy.
2. Accessible registration dialog, closed by default and opened from the primary toolbar action.
3. A single toolbar line at desktop: explicit-submit search on the left; status filter and **Register customer** primary action on the right, with the filter immediately before registration. Search placeholder is a hint only, never a label. At mobile widths stack the search above the right-side controls, preserving filter-before-register order.
4. Customer table is the dominant page surface and immediately follows the toolbar. It fills the available content width without an arbitrary narrow max-width and matches the Supervisor overview approvals table's typography, borders, row density, and pagination controls.
5. The Action column contains a clear stable-ID profile link to `/supervisor/customers/[customerId]`. A visible focus outline communicates navigation. Screen-reader link text identifies the customer and destination.

### Table content and status

- Name: full name as primary text and phone as secondary text; use truthful fallbacks if either is absent.
- Card number: render the canonical value from that customer's latest issued card. The card number, virtual card number, serial, and barcode are the same identifier; if no card exists, say **Not provided**. Never derive it from the customer ID.
- Available, Last purchase, and Lifetime earned: render integer-kobo values only. Last purchase is the full basket total (`purchaseAmountKobo`) from the latest captured-and-approved receipt, or **Not provided** when absent. Lifetime earned sums confirmed EARN credits for that customer; no earned credits displays zero.
- Status: render authoritative customer status with the existing badge component. Missing status says **Status not provided**.
- Action: provide the profile link. Do not add fabricated joined date, internal identifiers in visible copy, raw API payload, or card lifecycle controls.
- Column headings are semantic, scoped, and visible at desktop. Mobile stacked entries preserve all row fields with accessible labels.

## Directory states and interactions

- **Initial/loading:** render a table-shaped skeleton with stable row heights and no generic page-wide spinner. Announce loading status without moving focus.
- **Loaded:** exhaust supported backend cursor pages for the submitted search, deduplicate by stable customer ID, and show the complete result set through five-row previous/next UI pagination. Apply status filtering and numeric sorting to that complete set, not only the first API page. Missing numeric values sort last in either direction. Never silently discard backend results.
- **Empty initial:** explain how to find a customer and provide Register customer as the next action.
- **Empty search:** state that no customers matched and allow query refinement or registration.
- **Error:** show an inline, accessible error and retry action; do not clear a successful prior result list without explanation.
- **Search:** submit trims the term, uses existing list API with supported fields, has pending/disabled behavior, retains the term in the URL using the existing query pattern where practical, and announces count/no-match/error via a polite live region. Enter submits; do not trigger a request on every keystroke.
- **Register customer:** the toolbar action opens a modal dialog containing the current registration form. Reuse its fields, labels, validation, consent controls, initial-card serial field, review step, duplicate-phone recovery, protected submission, and success/error behavior; do not build a parallel or reduced form. The initial form remains blank as it is today.
- **Dialog accessibility:** use the shared accessible Dialog primitive/pattern. Give it an accessible name and description, move focus into it on open, contain Tab/Shift+Tab, support Escape and explicit Cancel/close, and restore focus to the toolbar trigger on dismiss. Closing/canceling must not submit. If values were entered, use the current form's explicit discard behavior rather than silently losing them. Preserve pending-submit and uncertain-outcome protections.
- **Dialog responsive layout:** at desktop, size the dialog to fit the existing form with its primary action visible; at mobile, use the application's responsive full-height/near-full-height dialog treatment with internal scrolling and visible close/cancel controls. Keep the directory mounted behind the dialog and preserve search/results state when it closes.
- **Confirmed registration:** only after the create result is authoritatively verified, transition the dialog to a `SuccessPopUp` state. Use Framer Motion for an expanding scale-in from 0.5 to 1 with opacity 0 to 1 and a spring transition (`stiffness: 300`, `damping: 20`), plus an SVG checkmark path drawing from `pathLength: 0` to `1` over about 0.5s with a short delay. Match the supplied treatment's soft success surface, rounded corners, centered 64px checkmark, and concise **Success!** heading; prefer existing semantic success tokens, with the sample teal palette (`#e6fffa`, `#319795`, `#234e52`) as reference rather than overriding app theme tokens. Pair the animation with explicit text such as **Customer registered successfully** and a polite live announcement; never communicate success through motion/color alone. Provide a clear Done/Close action. Refresh/reconcile directory results after verified success, and never show the popup for a pending, failed, mismatched, or uncertain response. Respect `prefers-reduced-motion` by rendering the static success popup/checkmark with no scale, bounce, or path-draw animation; do not delay access to Done or directory refresh for animation.

## Profile page

- Route: `/supervisor/customers/[customerId]`, stable ID only. Directory search can be carried as a non-authoritative return query parameter; status, role, balance, eligibility, and card data from a URL are never trusted.
- Page heading presents customer identity and a **Back to customers** link, preserving a safe search term when present.
- On direct navigation/reload, show a profile-shaped loading state, then fetch customer details from the existing authoritative endpoint. Verify exact ID equality before revealing editable fields or actions. Mismatch/failure remains an inline retryable error and must not expose another record.
- Use the existing customer details hierarchy and components: verified identity/status; editable full name, phone, and email; explicit status action with exact confirmation phrase; concise linked-card summary; link to the existing Cards route carrying the stable customer ID. Never fabricate missing card status/serial. Do not duplicate card block/replacement actions here.
- Save uses current protected API/idempotency behavior, reloads detail, verifies same ID and submitted values, and only then announces success. Failure or uncertain refresh keeps user values and actions available only after a safe reload/verification.
- Dirty profile navigation (back link, route change, browser back/forward) must offer a clear keep-editing/discard decision where feasible. No implicit write on navigation.
- Maintain accessible page heading, field labels, validation/error associations, status announcements, focus management after save/retry, and visible keyboard focus.

## Profile page visual and API composition

Treat the supplied profile SVGs as layout and styling references only. The header presents the verified customer name/status and Member since date from the customer record, with Capture purchase and Redeem Credit actions on the right. The summary row follows the reference's four compact cards: Available balance, Pending approvals, Lifetime earned, and Next expiry. Use only authenticated API values; do not display SVG sample names, dates, numbers, balances, or barcodes.

Provide a horizontal tab bar with Overview, Transactions, Wallet Ledger, Redemptions, Virtual Card, and Consent. Overview keeps customer details and recent activity easy to scan alongside a dynamic virtual-card rendering and an expiry schedule. At desktop widths, use an asymmetric primary-content/secondary-card layout that collapses to one column on mobile. The card identifier, status, and issue date come from the assigned card API record. Build the card presentation from HTML/CSS and real data rather than showing the reference SVG's example barcode or card number.

Recent activity may include earnings, redemptions, approval outcomes, customer/card blocks, and card issuance only when an authenticated API or persisted source returns those events for the verified stable customer ID. Display an event's returned date, type, status, and integer-kobo amount; sort by actual event time. Never infer historical activity from current status or show raw audit metadata. Show category-specific loading, retryable error, and honest empty states.

Credit expiry is calculated from returned credit lots with a positive remaining amount and a future `expiresAt`. Display actual dates and integer-kobo remaining amounts, ordered earliest first. The Next expiry card must agree with the first schedule entry. Do not assume a 45-day or other artificial window; display no upcoming expiry when no qualifying lot exists.

Capture purchase and Redeem Credit must hand the verified customer ID to the established authenticated workflow where that route supports customer context. The profile must not create receipts, ledger entries, approvals, or card writes itself; existing authorization, CSRF, idempotency, verification, and lifecycle policy remain authoritative.

## Responsive, accessibility, and visual quality

- Preserve application shell behavior. At >=768px the toolbar is one aligned row; at wide desktop widths the table columns are visible together, while intermediate tablet widths may use contained horizontal scrolling as in the overview table.
- Below 768px: stack the toolbar with search first and filter before registration; present each table result as a row/card with all columns and accessible field labels. Visually hide redundant column headings without removing table semantics. No page-level horizontal scroll.
- Support 200% zoom and long names/phone values with wrapping/truncation that does not remove accessible names. Tap targets meet the app's existing minimum sizing. Respect reduced-motion; only short state feedback transitions are used. The registration-success animation must have a static reduced-motion equivalent and must not be the sole success signal.
- Include empty/loading/error/disabled/focus/hover/pressed states in visual review. Test light and dark modes if the shell supports both; use semantic theme tokens so contrast remains valid.
- Avoid invented metrics, decorative dashboard cards, redundant section labels, and duplicate primary actions.

## Data, security, and boundaries

- Extend the existing customer list response with read-only values derived from the tenant-scoped Card, Receipt, and LoyaltyLedgerEntry records; update its OpenAPI/client contract. No database schema, RLS, RBAC, migration, ledger-write, card-policy, or authorization changes.
- Keep authorization and branch/tenant scope backend-owned. Stable IDs select a requested record but do not grant access.
- Keep CSRF, idempotency, identity verification, status confirmation, dirty-state protection, and card-management handoff safeguards.
- Do not put sensitive customer data in URL, logs, analytics, or error copy. Only stable ID and optional non-sensitive search query may be route context.

## Verification evidence expected

Focused component tests for toolbar order, registration dialog open/close/focus containment and restoration, current-form behavior, `SuccessPopUp` spring scale/checkmark-draw animation and reduced-motion static equivalent (with no popup on failure/uncertain outcomes), submit-only search, URL preservation, table content/status fallbacks, row navigation, profile direct/deep links, mismatched detail rejection, dirty-navigation guard, registration preservation, save/status behavior, and all loading/empty/error states. Web lint/typecheck/test/build plus affected customer workflow Playwright and mobile/keyboard checks are required before implementation is complete.
