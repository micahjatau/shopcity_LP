# Design: Cashier Sync Queue presentation and copy

Reading this as: a cashier operational queue for frontline staff, with conservative trust-first language, leaning on the existing ShopCity design system. `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 5`.

## Decisions

- Retain the current hierarchy, table, controls, existing status summary, and design tokens. Make no new layout system or motion treatment.
- At constrained shell widths up to 1100 CSS pixels, stack the Sync Queue introduction above its action toolbar so the explanatory copy does not collapse beside the device status and buttons. Preserve the two-column heading at wide desktop widths.
- On phone widths, stack the queue title and filters, and let the search and status controls fill the card’s available content width.
- Describe batch inclusion as waiting, saved on this device, and retry-required records. The source selects these three local states for submission. Keep confirmed records distinct and do not imply a server confirmation until the existing result/state indicates it.
- Present local state enums as readable text (`Waiting`, `Saved on this device`, `Syncing`, `Needs another attempt`, `Awaiting approval`, `Confirmed`, `Rejected`) only at visible presentation sites. Leave enum values, filtering, tone selection, state transitions, and payloads untouched.
- Replace em-dash display placeholders with `Not available` only where absent values are already represented as missing, and use no action indicator rather than a punctuation placeholder.
- Keep technical response and per-record details available through the current disclosure controls. Keep the table internally horizontally scrollable on narrow screens and preserve the existing 375px no-page-overflow contract.

## Risks and safeguards

- “Synced” can overstate the confirmed state; preserve the current summary as an aggregate only if its count remains limited to confirmed records, and make the confirmation boundary explicit in nearby copy.
- No prototype is authoritative for this derived page; no parity claim or screenshot baseline update is included.
- Presentation helpers must not feed back into status filters, persistence, queue selection, API requests, or transitions. Test the exact status-filter values and visible labels separately.
