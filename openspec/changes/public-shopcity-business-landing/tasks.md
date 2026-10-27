## 1. Public landing page

- [x] 1.1 Replace the internal root-page scaffold with public-facing ShopCity copy and contact details.
- [x] 1.2 Set public homepage metadata; existing login and role-shell routes are untouched.
- [x] 1.3 Confirm `apps/web/.env.local` targets `http://127.0.0.1:3000` and `SHOPCITY_DEPLOYMENT_ENV=local`; backend responds as `shopcity-api` on that port. The frontend dev server was not reliably reachable during the check, so end-to-end proxy connectivity remains unverified.
- [ ] 1.4 Complete frontend verification. ESLint, TypeScript, and accessibility tests pass; desktop/mobile browser screenshots are visually checked. Production build did not finish before the 10-minute timeout during Webpack compilation.
- [x] 1.5 Incorporate landing-page feedback: shared virtual-card preview, red header, navy contact/footer notice, and a single address listing.
- [x] 1.6 Remove the hero's local-supermarket kicker and display the ShopCity logo above the contact-section heading.
