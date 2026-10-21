# Design

- The Supervisor sidebar background is `var(--sc-color-brand-700)` (`#8E0101`). Use that token for active primary actions and selected tabs rather than copying a literal or reusing the Cashier artwork gradient.
- Use `var(--sc-color-brand-800)` (`#6F0101`) for hover on enabled primary actions and links.
- Scope styling to a Supervisor shell modifier so the shared Button and shared Admin/Supervisor reports component retain their other-role appearance.
- Apply to shared primary Button variants, Supervisor-specific primary links, the Approve action, and selected report, approval-category, and customer-profile tabs.
- Leave inactive tabs, secondary, ghost, danger, disabled, and focus-visible states unchanged. Preserve labels, geometry, and behavior.
