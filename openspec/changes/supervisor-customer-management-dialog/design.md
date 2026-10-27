## Context

`ManageCustomers` currently owns search, selected-ID loading, profile fields, account status, card context, and writes in a two-column workspace. Its source remains the authoritative place for search and API orchestration; the generated customer APIs and backend contracts do not need to change. See proposal.md for motivation and the delta spec for observable behavior.

The privileged customer summary includes an active-card status but does not guarantee a card serial. Keep the existing truthful fallback rather than deriving or inventing a serial. The existing stable-ID Cards entry point is the Assign card tab (`/supervisor/cards?tab=assign&id=<customerId>`); it loads customer eligibility and provides the existing card-management route when applicable.

## Goals / Non-Goals

**Goals:**

- Give Manage customers a single full-width search-and-results workspace.
- Open an accessible, editable dialog only after authoritative detail loading begins, and do not expose writable fields until the returned ID is verified.
- Centralize profile editing, progressive account-status controls, and linked-card context in a focused `CustomerDetailsDialog`.
- Guard dirty close requests and close profile edits only after an authoritative post-save refresh.

**Non-Goals:**

- Change customer or card APIs, OpenAPI generation, database schema, consent behavior, card eligibility, or card lifecycle operations.
- Add a new customer-ID-to-card-serial API or claim the Cards manage tab supports customer-ID lookup.
- Reuse the registration review dialog for existing-customer editing.

## Decisions

1. **Separate search orchestration from the dialog.** Keep query state, the selected stable ID, search results, customer fetch, update/status API calls, result-row projection, and toast lifecycle in `ManageCustomers`. Add `CustomerDetailsDialog` for local editable state, dirty tracking, discard confirmation, status-editor presentation, and dialog actions. This avoids adding a global dialog abstraction or coupling the registration form to customer management.

2. **Keep the selected ID in the URL and verify before editing.** A result row updates the existing `id` query parameter. The dialog can render a loading/error state while `GET customer` runs, but receives no editable customer until the response has the exact requested ID. A request sequence guard continues to reject stale responses. Retry repeats the authoritative read; Close removes the query parameter.

3. **Persist profile changes before closing.** The dialog submits a value snapshot to the existing update endpoint. On success, `ManageCustomers` reloads the same ID and checks the refreshed ID and trimmed submitted values. Only that verified record updates the matching result, closes the dialog, and triggers the timed live-region toast. If update or refresh cannot be confirmed, the dialog stays open and retains local input; it does not announce success.

4. **Keep status mutation separate from dirty profile state.** The current progressive status editor stays inside the dialog. It is disabled while profile fields are dirty, avoiding a status refresh overwriting unsaved form values. Blocking requires `BLOCK`; activating requires `ACTIVATE`. After a successful status write, reload and verify status, refresh the row, and keep the dialog open.

5. **Guard close requests in the same modal.** X, Cancel, Escape, and backdrop all use one close-request handler. Clean forms close directly. Dirty forms replace the dialog body with an accessible discard prompt; Keep editing restores the form and focus, while Discard removes the stable ID without issuing an update. This avoids nesting modal primitives and preserves the existing shared Dialog lifecycle.

6. **Do not fabricate linked-card data or card routes.** Show the card status available in the customer response, show only a supplied card serial (prefer its last four characters in the summary), and otherwise state that the serial is not included. The link uses the existing stable-ID Assign card route; card lifecycle controls remain on Cards. A new `customerId` route to the Manage cards tab is deferred until its API can resolve the actual card safely.

## Risks / Trade-offs

- [The customer summary may omit the linked-card serial] → Display an explicit omission message and preserve status uncertainty rather than inventing an identifier.
- [A save may succeed while its refresh fails] → Keep the dialog and entered values, report that the update cannot yet be verified, and do not show the success toast.
- [A dirty dialog can trap users in a close confirmation] → Provide clearly named Keep editing and Discard actions, focus Keep editing when the prompt opens, and ensure all close routes share the same handler.
- [Timed toast may disappear before assistive technology reads it] → Use a polite live region and keep the result row update as persistent evidence.

## Migration Plan

No data or API migration is required. Replace the current panel in place, preserve URL query semantics, and keep the existing registration and card-assignment workflows unchanged. Rollback is a frontend revert; no persisted data shape changes.
