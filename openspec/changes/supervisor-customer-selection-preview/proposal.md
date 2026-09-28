# Proposal: Supervisor customer selection preview

## Summary

When staff explicitly select a customer search result in Supervisor customer management or card assignment, show an accessible read-only preview of the authoritatively loaded customer before continuing the existing workflow. Display phone and email as actionable links and use semantic links for internal navigation.

## Context

Both Supervisor workflows currently replace the initial selection state with an inline customer detail/eligibility panel after fetching the selected customer. Search results are selection controls, and the backend detail response remains authoritative. The shared `Dialog` primitive already provides modal semantics, Escape handling, focus trapping, and focus restoration.

## Scope

- Open the preview only after an explicit search-result selection has loaded and identity-verified customer details; direct customer-ID deep links continue to load the existing workspace without forcing a modal.
- Show the customer name, phone/email when available, customer status, and available linked-card status/serial. Keep customer and card status distinct.
- Render phone and email as `tel:` and `mailto:` links, and internal card-task navigation as a real Next.js link using the stable customer ID.
- Closing/continuing the preview returns to the existing profile editor or card-assignment eligibility flow without changing its backend requests or write gates.
- Keep all styles scoped to Supervisor routes and use the existing dialog primitive.

## Non-goals

- No changes to API/OpenAPI/generated-client contracts, database, RBAC, tenant scope, customer eligibility, card lifecycle, or audit behavior.
- No changes to Admin, Cashier, shared customer workspace, shell logic, or global dialog behavior.
- No implicit selection from search results and no trust in URL-provided customer fields.
