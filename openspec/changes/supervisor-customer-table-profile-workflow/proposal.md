# Change: Make Supervisor customers table-first

## Status

Implementation in progress; the directory restyle and pagination are undergoing focused verification.

## Why

The Supervisor customer workflow currently leads with separate registration and management tabs, then shows search results as selectable rows that open a customer-details dialog. The supplied customer assets point toward a customer directory as the primary workspace. Supervisors should be able to scan customers in a table, find one from the same toolbar, and enter a dedicated customer profile page.

## What Changes

- Make the customer directory the default `/supervisor/customers` view, led by a full-width table.
- Place an explicit-submit search by customer name, phone number, or card number on the left of the toolbar; place the status filter and prominent **Register customer** action on the right, in that order. Registration opens the existing form in a dialog without losing directory context.
- Use the customer table as the directory's primary workspace and match the Supervisor overview approvals table's typography, row density, and pagination treatment.
- Render Name, Card number, Available, Last purchase, Lifetime earned, Status, and Action columns. Treat card number, virtual card number, card serial, and barcode as one value from the assigned card. Last purchase is the full basket total from the latest captured-and-approved receipt; lifetime earned is the sum of confirmed EARN credits. Extend the existing list response with tenant-scoped, read-only projections; do not change the database schema, ledger history, or card lifecycle, and never fabricate per-customer data.
- Fetch all supported backend cursor pages for a submitted search, deduplicate by stable customer ID, filter status across the complete result set, and present five rows per previous/next page.
- The Action link navigates by stable customer ID to the dedicated profile page; it must not open a dialog. The Overview customer-details card is read-only and follows the supplied details reference; an explicit Edit action opens the existing verified form in an accessible dialog. Birthday month and transaction/redemption totals must be shown as **Not provided** unless authoritative APIs provide them; do not use sample SVG data or infer counts from bounded activity results.
- Redesign the verified profile around the supplied header, summary-card, and tab references. Include the read-only customer details, recent API-backed earnings/redemptions/approvals/blocks/card issuance, the assigned virtual card, and a credit-expiry schedule calculated from actual remaining credit lots. Label the fourth summary card **Annual Purchases**; show an authoritative annual total only if the profile API provides it, otherwise show **Not provided** rather than inferring or inventing a value. Add Capture purchase and Redeem Credit actions that enter the existing protected workflows; do not write directly from the profile.
- Preserve loading, empty, error, and narrow-screen behavior. On small viewports, use a deliberate stacked row/card presentation and avoid page-level overflow.

## Acceptance criteria

1. The customer directory and table are the first/default Supervisor Customers experience.
2. Register customer is positioned first in the directory toolbar and opens a dialog containing the existing registration form. After authoritatively verified success, the dialog shows an expanding, spring-animated `SuccessPopUp` with a drawn checkmark and confirmation; reduced-motion users get a static equivalent.
3. Search is explicit-submit and labeled for name, phone number, or card number; it uses the existing customer-list API. The status filter appears immediately before Register customer on the right.
4. The table has the requested seven columns, resolves all card-number/serial/barcode terms to the same customer-specific value, displays the latest full basket total as last purchase and lifetime earned from tenant-scoped backend data, sorts the numeric columns over all filtered cursor-fetched results, uses no fabricated values, and provides five-row previous/next pagination.
5. The Action link navigates to a dedicated, reloadable profile URL containing only the stable customer ID; it is not a dialog.
6. Profile details are fetched authoritatively and verified against that ID before customer data or edit/status controls are exposed. Overview customer details remain read-only until Edit opens the existing form in an accessible dialog. A verified profile save closes the editor but keeps the Supervisor on the same profile; existing CSRF, idempotency, dirty-state, status confirmation, and save verification protections remain intact.
7. Returning from a profile preserves the directory search when practical; browser back/forward and direct profile links work.
8. The table has accessible labels, keyboard-operable Action links, truthful field fallbacks, and usable loading, empty, and error states.
9. Supplied supervisor customer assets inform the visual direction; the existing reference asset files are preserved unchanged.

## Scope and constraints

This is a Supervisor directory and read-projection change. Extend the existing customer-list response with the canonical card number (the assigned card's serial/barcode), latest approved full basket total, and confirmed earned-credit total; do not add schema/migrations or alter writes, RBAC, ledger history, or card-lifecycle policy. Preserve existing customer registration and profile safeguards. The customer-management-dialog OpenSpec describes the previous selection interaction and is superseded by the stable-ID profile page; its write, status, and dirty-state safeguards remain applicable.
