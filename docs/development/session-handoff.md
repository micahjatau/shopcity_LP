# ShopCity LP Session Handoff

Updated: 2026-10-10

## Repository state

- Repository: `/root/github-repos/micahjatau/shopcity_LP`
- Branch: `workflow-states-implementation`
- Current `HEAD`: `9d5c18c` — `feat(supervisor): add customer directory and profile`
- The worktree contains numerous pre-existing and current uncommitted changes, plus unrelated untracked assets. Do not reset, clean, stage, or commit them without explicit direction. Supplied customer SVGs and screenshots were preserved.
- A web production build was run with `SHOPCITY_WEB_DIST_DIR=.next-profile-card-tab-build`. It generated that build directory and ran the token generator; do not remove generated output or alter the existing `apps/web/tsconfig.json` includes without checking the current diff first.
- No production/remote service configuration was changed during the latest work.

## Latest request: move the card preview

The card graphic preview now appears only in the customer profile's **Virtual Card** tab:

- Reusable preview: `apps/web/components/workflows/supervisor-virtual-card-preview.tsx`.
- Profile placement and tab content: `apps/web/components/workflows/customer-details-dialog.tsx`.
- The Supervisor **Manage cards** workflow no longer renders the graphic. Its verified card details and protected block/replace actions remain intact in `apps/web/components/workflows/supervisor-card-management.tsx`.
- The profile preview uses verified customer/card projection data; it does not use the supplied sample SVG as customer data and performs no card lifecycle writes.
- The preview uses `apps/web/public/brand/supervisor/cutomer-profile/card-branding.png` as its ShopCity logo via `next/image`, displayed at 3.5rem high with its aspect ratio preserved. The supplied, untracked PNG remains unchanged. OpenSpec tasks 4.7 and 4.8 are checked complete.

The card-move work and prior profile/typography/ledger changes remain uncommitted.

## Completed implementation context

- The Supervisor customer directory and stable-ID customer profile are implemented, including registration feedback, cursor pagination, read-only details with the existing edit dialog, dirty-state protection, profile projections, and protected cashier handoffs.
- Transactions and Wallet Ledger use responsive tables and tenant/customer-scoped data. Missing values remain “Not provided”; internal receipt/ledger IDs are not exposed.
- Supervisor typography was unified with rem-based tokens while retaining established layouts and colors.
- Wallet Ledger's earlier generic local error was traced to a missing Next.js `_document.js` build artifact. The frontend was restarted on port 6767; unauthenticated ledger requests reach the API and correctly return `401 AUTH_REQUIRED`.
- `/supervisor/cards?tab=manage` is a serial lookup and verification workflow, not a card gallery. Live records cannot be inspected without an authenticated Supervisor session.

## Verification completed

- Focused profile/card-management Jest tests after the logo sizing adjustment: 2 suites, 34 tests passed.
- Full web unit tests: 28 suites, 221 tests passed; accessibility tests: 27 suites, 216 tests passed (both completed before the branding-only update).
- Web lint and TypeScript typecheck passed after the branding update.
- Web production build passed after adding the branding image using the isolated `.next-card-branding-build` directory; the subsequent size adjustment changed only the image height utility class.
- Focused Playwright stable-ID profile workflow passed against the existing frontend on port 6767 using system Chromium. It verifies that the graphic is absent from the overview, present in Virtual Card, that the supplied branding image loads at the enlarged size, then continues through Transactions, Wallet Ledger, and edit-dialog checks. Screenshot: `/tmp/shopcity-profile-virtual-card.png`.
- Strict OpenSpec validation, Prettier check, and `git diff --check` passed after the branding update.

A representative Playwright invocation (the config is session-local under `/tmp`):

```bash
cd apps/web
PLAYWRIGHT_BASE_URL=http://127.0.0.1:6767 \
  ./node_modules/.bin/playwright test \
  --config /tmp/shopcity-system-chromium.playwright.config.mjs \
  /root/github-repos/micahjatau/shopcity_LP/apps/web/tests/workflow-routes.spec.ts \
  -g 'preserves directory search context through a stable-ID profile and guards dirty cancellation'
```

## Next steps

1. Continue the remaining acceptance work in `openspec/changes/supervisor-customer-table-profile-workflow/tasks.md`, especially visual/responsive/accessibility checks and broader Playwright coverage (tasks 3.1, 4.1–4.3, 5.2–5.4 remain open).
2. Review the complete current `git status` and diffs before editing or staging; retain all unrelated dirty/untracked files and reference assets.
3. If Wallet Ledger is tested again, use an authenticated session. If it fails there, inspect the browser Network response status and error code.
4. Login troubleshooting is unresolved because the selected role and exact on-screen error have not been supplied. Ask only for those details; never request a password.
5. Do not claim visibility into live virtual cards without an authenticated Supervisor session.

## Local runtime

- Frontend dev server: `127.0.0.1:6767` (reused for the latest Playwright check).
- API server: port 3000.
- The standalone Playwright server on port 3100 may conflict with the existing frontend because both can use `apps/web/.next`; prefer reusing port 6767 for this workflow.
