# Design: Supervisor customer registration review

## Behavior

The Register customer tab remains a single form for identity, contact, initial-card serial, and the existing consent choices. Submitting the form validates required values locally and changes the UI to review; it does not call the backend. The review dialog reads back only the requested pre-creation data, grouped under Customer and Initial loyalty card. Customer fields use a two-column layout on desktop and stack on narrow screens. The required consent choice remains mandatory and is sent truthfully with the existing versioned server-owned consent behavior, but the review dialog does not add post-creation statuses or linked-card actions.

The dialog's **Edit details** action returns focus to the first form field. Escape/backdrop dismissal returns to the form. Its **Register customer** action is the only entry point for the create request. Keep the existing idempotency key across uncertain outcomes and retries; clear it only after confirmed success or when form values change. For failures, close the review to expose the existing editable form and truthful error/recovery message. A 409 exact-phone recovery must still verify the candidate via authoritative detail before offering its stable-ID link; it is not a registration success.

On confirmed 201 plus a usable customer ID, unmount the review dialog and show a compact success card. Focus the success heading. The success message describes only the confirmed customer, first card, and consent save. **View customer** links to `/supervisor/customers?tab=manage&id=<encoded-id>`; **Register another customer** resets the form and consent choices.

## Existing-customer selection

Manage customers and Assign card retain deliberate result selection, stable-ID navigation, authoritative detail reload, and mismatch/error fail-closed behavior. Remove the old generic selection preview; Manage customers shows the verified profile directly, while Assign card presents verified eligibility in a purpose-built Assignment eligibility dialog. A stable-ID deep link opens that same dialog in a loading/verification state, and verified details appear only after the returned ID matches. The dedicated dialog is not a customer-preview dialog. Assign card retains its separate new-serial review and only submits after **Assign card** confirmation.

## Component and styling

Create `CustomerRegistrationReviewDialog` as a focused wrapper around the existing `Dialog` primitive. Its data contract is limited to `fullName`, `phone`, optional `email`, and `cardSerialNumber`; its actions are `onEdit`, `onConfirm`, and `busy`. No customer ID, status, linked-card record, or card-management URL is accepted. Use a 540–600 px panel, existing ShopCity red/neutral tokens, 30–32 px desktop padding, a 16–18 px radius, muted uppercase section labels, dark readable values, and a divider before Initial loyalty card. Keep styling scoped to Supervisor routes. Keep the shared Dialog primitive and its focus, Escape, and backdrop behavior unchanged.

Retire `SupervisorCustomerPreviewDialog` only after removing both direct callers. Do not modify the shared customer workspace, generated API client, backend, or card-eligibility policy.

## Verification

Cover that Review details makes no API request; the review contains only pre-create fields and truthful email fallback; edit/dismiss returns to the form; only confirmation sends the exact existing payload with consent and idempotency; failures retain values/key and never claim success; confirmed success closes review and exposes both next actions. Cover direct Manage profile loading, the verified Assign eligibility dialog, mismatch/deep-link behavior, customer profile/status actions, and assignment serial review/write gates; verify that the removed generic customer-preview dialog is not restored. Run focused Jest, web lint/typecheck, web build, affected Playwright workflows where the configured local setup permits, `git diff --check`, and OpenSpec validation. Preserve all pre-existing dirty/untracked paths and stage nothing.
