# Design: Supervisor customer selection preview

## Design read

This is a Supervisor staff workflow whose job is to identify the correct customer before viewing/editing a profile or assigning a card. The immediate question is “Is this the customer I intended?” A concise read-only preview should answer that before exposing the existing task controls. Use the established ShopCity neutral surface, red accent, existing button and dialog primitives, and restrained dividers; do not add decorative data or a new component library.

## Visual reference

Use `figmaExport/Landing-17.png` as the popup frame reference: a dim charcoal scrim, compact centered white panel with rounded corners, ShopCity-red heading and subtitle, and a top-right close control. Adapt only the modal treatment and information hierarchy; do not copy the screenshot's transaction fields or sample identity.

## Existing behavior and seams

- `ManageCustomers` in `apps/web/components/workflows/supervisor-customer-workflows.tsx` selects a result through a stable `id` query parameter, reloads it through `customersControllerGetCustomerV1`, verifies the returned ID, then shows customer status, active-card context, and profile/status editing controls.
- `SupervisorCardAssignment` in `apps/web/components/workflows/supervisor-card-assignment.tsx` selects a result, reloads and verifies details, then shows identity, customer/card status, eligibility, and the existing serial/assignment workflow. Direct-ID deep links use the same authoritative reload but are not a search-result selection.
- `Dialog` from `apps/web/components/ui/dialog.tsx` supplies accessible dialog role, focus trapping/restoration, Escape dismissal, and backdrop dismissal. Add styling only under `.sc-page` so the common primitive's other consumers remain unchanged.

## Interaction

For explicit search-result selection, set a local pending-preview identity before triggering the existing ID handoff. When the fresh detail response matches that identity, open the preview. Clear the pending marker on identity mismatch/error, and never open a preview from an untrusted URL alone. A deep link continues to load the existing profile/assignment panel without a popup.

The preview is read-only. Include only the detail fields already available to these authorized Supervisor responses: name, phone/email when present, customer status, and linked-card status/serial when present. Phone/email are `tel:`/`mailto:` anchors, not inert styled text. On Manage customers, an internal card-task link uses `next/link` and the selected stable customer ID. In card assignment, change the existing internal Manage cards anchor to `next/link`. Close/continue returns to the already-loaded existing workspace; assignment/profile actions and eligibility remain unchanged.

## Accessibility and layout

Use the existing dialog primitive with a clear accessible title, explicit top-right close and continue controls, and link focus styles. Match the Landing-17 popup with a centered white rounded panel, a dim backdrop, and ShopCity-red title/subtitle; keep the preview within the modal's reading/focus order. Ensure the panel is scrollable and viewport-bounded on mobile, while showing identity and status without horizontal overflow. Missing contact/card values are labeled as unavailable/not provided rather than fabricated.

## Verification

Test both explicit-selection flows, authoritative mismatch/error behavior, direct-ID deep links without forced modal, contact/internal link destinations, close/continue behavior, and existing edit/assignment gates. Run focused Supervisor Jest tests, web lint/typecheck, formatting, `git diff --check`, and OpenSpec validation. Preserve all inherited working-tree changes; do not stage or commit.
