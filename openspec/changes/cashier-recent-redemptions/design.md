## Context

See `proposal.md` for motivation and the capability contract in `specs/cashier-recent-redemptions/spec.md`. The Earn Find Customer step already presents API-backed recent captures using the cashier-today projection. That response is tenant-, branch-, authenticated-cashier-, and business-day-scoped, returns one row per receipt, and includes the redemption status and amount fields needed by this view. It has no phone number. Its default page is bounded to the latest ten cashier activity rows.

## Goals / Non-Goals

**Goals:**

- Add the requested Redeem-only history surface without changing the shared card lookup, redemption controller, or transaction contract.
- Keep combined settlements at receipt granularity and make pending/rejected values unmistakably non-final.
- Match the reference's compact, neutral activity panel while retaining semantic table structure and responsive behavior.

**Non-Goals:**

- No endpoint, generated API client, backend service, database, or migration changes.
- No customer phone/email lookup, approval action, all-history claim, or financial write from the table.
- No changes to Earn's existing Recent captures component or the other Cashier workflow routes.

## Decisions

### 1. Add a Redeem-only leaf component at Find Customer

Create `RecentCashierRedemptions` as a focused data/presentation component and mount it as the sibling of `VerifiedCardLookupStep` only in the `kind === 'redeem'` branch while `lookupRecord` is absent. Keep it out of the shared lookup step and the form so lookup, Earn, and verified redemption stages remain unchanged.

Alternative considered: add a generic recent-activity prop to the shared lookup component. Rejected because the feature belongs only to Redeem and would widen the surface and behavior of shared Earn/Lookup consumers.

### 2. Reuse the existing cashier-today projection

Call the existing generated report client with its default first page, filter to `operation === 'REDEEM'`, retain response order, and display at most six rows. The projection is bounded to the current cashier's latest activity page (up to ten rows); the table and empty state must not claim exhaustive same-day or all-time history. Do not add a new query, endpoint, or parallel customer lookup.

Alternative considered: add a redemption-specific endpoint/filter. Rejected because the existing scoped response already supplies the required values and a new contract is unnecessary for this compact activity panel.

### 3. Keep amount labels tied to authoritative state

For confirmed redemptions, render only a safe, non-negative `redeemedAmountKobo` as “Redeemed”; if it is missing or invalid, render “Amount unavailable”. For pending, rejected, failed, or expired rows, use a safe `loyaltyAmountKobo` only as a “Requested” amount. For reversed rows, show the outcome as Reversed and do not label the original amount as currently redeemed. Map known statuses to concise human-readable labels and semantic tones; handle an unknown status without claiming success.

The receipt row is one physical receipt even when the report includes both settlement effects. The component uses only its redemption amount and does not display the related Earn value.

### 4. Preserve the reference density with accessible table semantics

Use the Figma `408:513` hierarchy: a compact “Recently redeemed” heading, thin divider, white bordered rounded surface, customer/receipt at left, amount and status aligned at right, and no decorative controls. Use a real table with an accessible caption and column headers that can remain visually hidden, allowing the rows to retain the reference's clean list-like appearance. Show the receipt number as secondary text because the cashier-today response does not contain a phone number. Keep the section at the existing 712px Find Customer panel width; horizontally contain the table on narrow screens without clipping customer names.

### 5. Match the surrounding data-state pattern

Show explicit loading, unavailable, and no-recent-redemptions messages. Do not expose API error bodies or add financial actions. The table unmounts on verified lookup through the existing `lookupRecord` branch.

## Risks / Trade-offs

- [The response is limited to the latest ten cashier activity rows, so filtering can produce fewer than six redemptions even if older same-day redemptions exist] → Describe this as recent activity, retain response order, and do not say “no redemptions today” or “all history”.
- [Unrecognized or changed status values could be misrepresented] → Map recognized states explicitly and use a neutral, non-success fallback; show only validated amounts.
- [The reference includes phone numbers that the approved cashier activity projection does not return] → Use the receipt number as secondary context; do not fetch or expose extra contact data.

## Migration Plan

No migration or deployment ordering is required. Roll back by unmounting the Redeem-only component and removing its scoped styles/tests; the existing cashier-today API and redemption workflow remain intact.

## Open Questions

None. The reference and existing cashier-safe report resolve the placement, fields, and scope.
