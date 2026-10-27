# Public ShopCity business landing page

## Why

The current root page exposes internal role shells and design-system scaffolding rather than explaining the business to customers or compliance reviewers.

## What changes

- Replace the root page with a concise public-facing loyalty-platform landing page.
- Display the supplied business name, physical address, phone, and email, with request-demo/contact actions.
- Make public-page metadata indexable while keeping operational application routes unchanged.

## Acceptance criteria

- Homepage clearly says what ShopCity is and who it serves.
- A simple contact/demo CTA is visible without authentication.
- Business identity, contact details, and physical address appear together once in the navy contact section; the section includes the rights-reserved notice without repeating the address in a lower footer.
- Existing login and role-shell routes remain available.
- Frontend API proxy configuration and actual local backend availability are checked and documented; this change does not claim API connectivity unless verified.
