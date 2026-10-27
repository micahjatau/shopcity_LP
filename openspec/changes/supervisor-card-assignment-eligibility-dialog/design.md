## Design read

This is a Supervisor task for finding an existing customer and issuing a physical card. The primary workspace should make customer search easy; once selected, the dialog should answer whether assignment is allowed and guide the operator through the already-required serial review.

## Current flow and constraints

`SupervisorCardAssignment` renders a two-column grid: customer search on the left and the persistent Assignment eligibility panel on the right. Selecting a search result writes its stable ID to the route, then `reloadCustomer` fetches authoritative details and checks that the response ID matches. The current eligibility rule is an active customer plus a known card state that is not ACTIVE. Eligible customers receive a blank serial input and an in-place serial-review stage; the existing `POST /cards` request remains final authority.

## Layout and interaction

- Replace the two-column grid with one full-width search workspace. The query field spans the available width; place the Search customers action immediately below it (aligned to the start on desktop and full-width on narrow screens). Results remain full-width selectable rows with customer name and phone.
- An explicit result selection opens the assignment dialog in a loading/verification state, then shows details only after an authoritative exact-ID match. A stable-ID deep link uses the same dialog after fetching; URL identity is a request hint, never status or eligibility authority.
- Closing with the close control, Escape, or backdrop clears the selected customer ID and returns to the unchanged search/results workspace. Preserve the search query/results. Prevent closing while an assignment mutation is pending. A failed detail load offers retry within the dialog; mismatch/unavailable details show no customer fields or write controls.
- Use the existing accessible `Dialog` primitive and Supervisor route-scoped styling. Give the dialog a clear title, visible close control, identity heading, grouped labeled customer/card status, concise eligibility state/reason, and predictable footer actions. Keep the visual language neutral/white with visible borders, restrained ShopCity-red emphasis, and the project's existing tokens.

## Dialog content and states

- Show customer name and phone when returned, plus separately labeled customer status and current card status. Show a linked-card serial only if authoritative details actually include it; never infer or fabricate one.
- For an eligible customer, show the new-card-serial input blank by default. `Review assignment` advances the same dialog to a review state displaying customer identity and the entered serial; it makes no API request. `Back to details` returns to the eligibility/form state and retains the typed serial. Only explicit `Assign card` submits.
- For a customer with an active card, explain that a second assignment is unavailable and provide the existing ID-based Manage cards link. For inactive customers or unknown card state, explain why eligibility cannot be established and withhold serial/write controls.
- Preserve duplicate-serial and eligibility errors, safe input retention, busy-state duplicate-submit prevention, the current stable idempotency key semantics, CSRF protection, and authoritative detail reload. On success, show the confirmed outcome and refreshed state in the dialog; do not imply success from a pending/uncertain response.

## Accessibility and responsive behavior

Keep persistent labels for search and serial controls, visible keyboard focus, accessible loading/error/success announcements, semantic dialog labeling, focus trapping/restoration, and keyboard dismiss behavior. At desktop, query/results occupy the full assignment workspace; at tablet/mobile widths, controls and result rows stack without horizontal overflow. The dialog is viewport-bounded and scrollable on narrow screens, with actions kept in logical DOM order.

## Verification

Test full-width layout, explicit selection, verified dialog loading/identity, active/ineligible/unknown/active-card states, direct-ID reload, close/keyboard behavior, blank serial, review-without-write, assignment success/conflict/uncertain refresh, search preservation, and mobile overflow. Re-run focused Supervisor tests, web typecheck/lint, Playwright, formatting, `git diff --check`, and OpenSpec validation. Do not change backend contracts or unrelated dirty files.
