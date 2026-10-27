# Design: Supervisor approval centre

## Layout and styling

- Scope the updated design to an explicit Supervisor variant; keep the default shared panel for Admin intact.
- Match the supplied 1440×923 SVG reference with page header, rounded category tabs, and two equally weighted cards. Stack the cards and wrap tabs/controls on narrow screens.
- Define page-local CSS custom properties for canvas, surface, border, brand, gradient, text, pending, and success colors so the redesign does not alter shared application tokens. Darken the gradient's orange terminal stop slightly from the SVG sample to keep white button/tab labels above WCAG AA contrast.
- Use the existing geometric display sans token (`--sc-prototype-fontDisplaySans`, Avenir Next/Century Gothic fallbacks). The SVG export outlines lettering as paths and has no inspectable font metadata, so the exact Figma family cannot be determined from the export.
- Use existing shared components/styles for inputs, buttons, and the dialog-free inline decision fields where practical. Keep visible keyboard focus and accessible row/tab controls.

## Data and interaction

- Extend the existing approval list endpoint with a typed category filter applied before cursor pagination, typed per-item categories, and exact counts for each Supervisor category. Counts follow the caller's tenant/branch scope and current status/search filters, and do not depend on the current cursor or selected category. Keep existing authorization, CSRF, idempotency, refresh, cursor history, and decision behavior.
- Auto-select the first pending queue item after a page load. Selecting a row shows a two-column evidence grid: API request UUID, customer full name, amount in kobo, wallet balance, lifetime earned, requested timestamp, and requester username. Only fields returned by the approval response are rendered as values; missing wallet balance and lifetime earned display “Not provided.” The API UUID is used as Request because no AP-style human-readable request reference is returned.
- Show a separate “Reason submitted” callout. The API has `reasonCode` but no submitted free-text reason, so render “Not provided” rather than presenting a policy code as the submitter's explanation.
- Pending rows expose a required free-text decision-reason textarea and direct Approve/Reject actions. Each action submits through the existing audited decision endpoint; no “Done” action is added. Decided rows remain read-only.
- On successful decision, remove the decided item from the visible queue and select the next pending item. Offer a View Customer link only for an API-returned customer ID.
- Supervisor category tabs are limited to High-value transaction and Late receipt claim. Render and filter by the API-provided category; do not infer category in the browser. The server derives High-value transaction from existing purchase/redemption threshold reason codes and Late receipt claim from exact `LATE_RECEIPT_CLAIM`. Late receipt is the primary category if a claim also exceeds the purchase threshold. Unknown categories are not silently assigned to a tab. Category badge counts come from exact server counts, not the loaded page. Do not render Manual adjustment or OTP override tabs. Manual adjustments remain Admin-only; OTP overrides are outside the MVP approval scope.
- `POST /transactions/earn` converts a receipt claim into a pending approval when server receipt time is more than seven elapsed days after `occurredAt`; response includes `LATE_RECEIPT_CLAIM`. Existing amount, branch, device, duplicate-receipt, idempotency, authorization, expiry, and decision safeguards remain in force. The claim creates no ledger credit or SMS until approved. Timestamp override checks remain unchanged for all other timestamps.

## Risks

- Late receipt claim handling touches the financial earn path; preserve no-credit-until-approved, duplicate-receipt prevention, idempotency, requester/decider separation, and policy revalidation.
- Wallet balance, lifetime earned, and submitter-provided explanation are not included in the approval API payload and will appear as “Not provided” until the backend exposes them.
- Customer subtitle copy is retained exactly as requested, but reads like leftover directory copy in an approvals queue.
