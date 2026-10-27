# Design: Supervisor card artwork for management identification

## Existing behavior

`SupervisorCardManagement` in `apps/web/components/workflows/supervisor-card-management.tsx` searches with the approved read-only management lookup, requires explicit candidate selection, reloads the candidate authoritatively, then displays card serial/status, customer name/status, dates, and allowed lifecycle controls. The management API already returns the exact fields needed for a visual preview. After successful lifecycle requests, the component reloads authoritative card details.

The supplied visual reference is `figmaExport/Landing-6.png`, a landing-flow screenshot containing a card mockup plus sample customer, serial, status, and barcode. That file is inherited/untracked and must remain untouched. It is used only to guide the visual treatment; its screenshot and static sample values must not be embedded in the application.

## Implementation approach

Add a small route-specific card-preview component within the Supervisor card-management UI. Compose the preview from live `card.serialNumber`, `card.customer.fullName`, and `card.status` only after authoritative selection. Use a clean card face with ShopCity red/neutral styling, responsive sizing, and optional non-functional barcode-like decoration. Keep the existing textual detail list and action confirmation as the source of clear accessible identification; give the visual an accessible name that includes the current serial and status, and do not expose fabricated barcode data.

The preview is presentation only. It must not introduce a new API call, infer lifecycle state, enable actions, or alter existing status/authorization rules. Because the selected card object is replaced by authoritative refreshes, rendering directly from that state keeps the preview current after block/reactivation/replacement.

## Verification

Add focused component tests for an active, blocked, and replaced card. Verify the visual exposes the exact live serial/customer/status, avoids the static Figma sample identifier, and refreshes with authoritative status changes. Run the focused Jest spec, web lint/typecheck, `git diff --check`, and OpenSpec validation. Keep all pre-existing dirty/untracked paths out of the implementation diff.
