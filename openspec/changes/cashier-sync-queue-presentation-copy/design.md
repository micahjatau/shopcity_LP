# Design: Cashier Sync Queue presentation and copy

Reading this as: a cashier operational queue for frontline staff, with conservative trust-first language, leaning on the existing ShopCity design system. `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 5`.

## Decisions

- Treat Sync Queue as a responsive operational workspace using existing design tokens. Queue records uses the full available width unless Sync activity is present and both panels can fit side by side.
- Use a container query on the page workspace, rather than viewport breakpoints, for the header and queue/activity columns so the shared sidebar’s width is accounted for.
- Keep the shell’s compact mobile top bar and navigation drawer; do not render the permanent sidebar on phones.
- Distinguish queue read state (`loading`, `available`, `unavailable`) from session sync identity. Only a successful local read may show zero counts or a definitive empty state.
- Offer a local-queue retry only after a read failure. When local access succeeds but session device identity is absent, offer the supported logout-and-sign-in recovery route; keep sync disabled.
- In a successful empty state, show a record count and next-step Capture Purchase link without a redundant “Showing 0 of 0” footer.
- Describe batch inclusion as waiting, saved on this device, and retry-required records. The source selects these three local states for submission. Keep confirmed records distinct and do not imply a server confirmation until the existing result/state indicates it.
- Present local state enums as readable text (`Waiting`, `Saved on this device`, `Syncing`, `Needs another attempt`, `Awaiting approval`, `Confirmed`, `Rejected`) only at visible presentation sites. Leave enum values, filtering, tone selection, state transitions, and payloads untouched.
- Replace em-dash display placeholders with `Not available` only where absent values are already represented as missing, and use no action indicator rather than a punctuation placeholder.
- Keep technical response and per-record details available through the current disclosure controls. Keep the table internally horizontally scrollable on narrow screens and preserve the existing 375px no-page-overflow contract.
- Keep Sync activity hidden until there are batch results or a technical response; only then enable a two-column layout at a sufficiently wide page-container size.

## Risks and safeguards

- “Synced” can overstate the confirmed state; preserve the current summary as an aggregate only if its count remains limited to confirmed records, and make the confirmation boundary explicit in nearby copy.
- No prototype is authoritative for this derived page; no parity claim or screenshot baseline update is included.
- Presentation helpers must not feed back into status filters, persistence, queue selection, API requests, or transitions. Test the exact status-filter values and visible labels separately.
