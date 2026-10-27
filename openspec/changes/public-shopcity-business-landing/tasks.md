## 1. Public landing page

- [x] 1.1 Replace the internal root-page scaffold with public-facing ShopCity copy and contact details.
- [x] 1.2 Set public homepage metadata; existing login and role-shell routes are untouched.
- [x] 1.3 Confirm `apps/web/.env.local` targets `http://127.0.0.1:3000` and `SHOPCITY_DEPLOYMENT_ENV=local`; backend responds as `shopcity-api` on that port. The frontend dev server was not reliably reachable during the check, so end-to-end proxy connectivity remains unverified.
- [ ] 1.4 Complete frontend verification. ESLint passes; build was terminated by SIGKILL and typecheck is blocked by missing generated `.next-dev/types`.
