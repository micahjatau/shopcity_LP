# Smoke bootstrap secret rotation

The staging `SMOKE_SESSION_BOOTSTRAP_SECRET` was rotated on 2026-09-09 in both write-only stores:

- GitHub Actions `staging` environment
- Vercel `shopcity-api` Preview environment for the `staging` branch

The secret value is intentionally not recorded. A fresh staging deployment is required before smoke authentication can use the new value.

The rotated credential is activated through a fresh Git-integrated staging deployment; direct Vercel redeploys are not used for this step because they may omit branch-scoped environment overrides.
